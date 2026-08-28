import type { WideEvent } from "evlog";
import { defineDrain } from "evlog/toolkit";
import { randomUUID } from "uncrypto";

const RETENTION_DAYS = 30;

function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function parseDateKey(key: string): Date | null {
  const match = key.match(/logs\/(\d{4})\/(\d{2})\/(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number.parseInt(year!), Number.parseInt(month!) - 1, Number.parseInt(day!)));
}

/** Normalizes colon-separated unstorage keys to standard slash-separated S3/R2 paths. */
function normalizeKey(key: string): string {
  return key.replace(/^logs[:/]/, "logs/").replace(/:/g, "/");
}

/** Generates key variations to handle cross-compatibility between unstorage and native R2 prefixes. */
function getKeyVariations(key: string): string[] {
  const slashKey = normalizeKey(key);
  const colonKey = slashKey.replace(/^logs\//, "logs:").replace(/\//g, ":");
  return Array.from(new Set([key, slashKey, colonKey]));
}

function groupEventsByDate(events: WideEvent[]): Record<string, WideEvent[]> {
  const grouped: Record<string, WideEvent[]> = {};

  for (const event of events) {
    const timestamp = (event as Record<string, unknown>).timestamp;
    const date = timestamp ? new Date(timestamp as string | number) : new Date();
    const dateKey = formatDateKey(date);

    (grouped[dateKey] ??= []).push(event);
  }
  return grouped;
}

function getR2Context() {
  const storage = useStorage("images");
  let cfBucket: R2Bucket | null = null;

  try {
    cfBucket = useEvent()?.context?.cloudflare?.env?.BUCKET;
  }
  catch {}

  if (!cfBucket) {
    const globalContainer = globalThis as unknown as GlobalEnvContainer;
    cfBucket
      = globalContainer.__env__?.BUCKET
        ?? globalContainer.env?.BUCKET
        ?? globalContainer.process?.env?.BUCKET
        ?? null;
  }
  return { storage, cfBucket };
}

async function listAllLogKeys(): Promise<string[]> {
  const { storage, cfBucket } = getR2Context();
  const keysSet = new Set<string>();

  if (cfBucket) {
    try {
      let cursor: string | undefined;

      do {
        const listResult = await cfBucket.list({ prefix: "logs", cursor });

        listResult?.objects?.forEach(obj => obj?.key && keysSet.add(obj.key));

        cursor = listResult?.truncated
          ? listResult.cursor
          : undefined;
      } while (cursor);
    }
    catch (err) {
      console.error("[evlog/r2] Error listing keys directly from Cloudflare R2 bucket:", err);
    }
  }

  try {
    const [logsKeys, logsSlashKeys, allKeys] = await Promise.all([
      storage.getKeys("logs").catch(() => []),
      storage.getKeys("logs/").catch(() => []),
      storage.getKeys().catch(() => []),
    ]);

    for (const key of [...logsKeys, ...logsSlashKeys, ...allKeys]) {
      if (key && key.includes("logs")) keysSet.add(key);
    }
  }
  catch {}

  return Array.from(keysSet);
}

async function readLogItem(key: string): Promise<string | null> {
  const { storage, cfBucket } = getR2Context();

  const keysToTry = getKeyVariations(key);

  if (cfBucket) {
    for (const key of keysToTry) {
      try {
        const objectBody = await cfBucket.get(key);

        if (objectBody) {
          const arrayBuffer = await objectBody.arrayBuffer();
          return new TextDecoder().decode(arrayBuffer).trim();
        }
      }
      catch {}
    }
  }

  for (const key of keysToTry) {
    try {
      const content = await storage.getItemRaw(key);

      if (content) {
        return typeof content === "string"
          ? content.trim()
          : new TextDecoder().decode(content as Uint8Array).trim();
      }
    }
    catch {}
  }
  return null;
}

async function writeLogItem(key: string, body: string): Promise<void> {
  const { storage, cfBucket } = getR2Context();

  const slashKey = normalizeKey(key);

  const writePromises: Promise<unknown>[] = [];

  if (cfBucket) {
    writePromises.push(
      cfBucket.put(
        slashKey,
        body,
        {
          httpMetadata: { contentType: "application/x-ndjson" },
        },
      ).catch(error => console.error(`[evlog/r2] Failed to put R2 key ${slashKey}:`, error)),
    );
  }

  writePromises.push(
    storage.setItemRaw(
      key,
      body,
      {
        httpMetadata: { contentType: "application/x-ndjson" },
      },
    ).catch(error => console.error(`[evlog/r2] Failed to put storage key ${key}:`, error)),
  );

  await Promise.allSettled(writePromises);
}

async function deleteLogItem(key: string): Promise<void> {
  const { storage, cfBucket } = getR2Context();

  const keysToDelete = getKeyVariations(key);

  const deletePromises: Promise<unknown>[] = [];

  for (const key of keysToDelete) {
    if (cfBucket) {
      deletePromises.push(cfBucket.delete(key).catch(() => {}));
    }
    deletePromises.push(storage.removeItem(key).catch(() => {}));
  }

  await Promise.allSettled(deletePromises);
}

export function createR2Drain() {
  return defineDrain({
    name: "kayanest-r2-drain",
    send: async (events) => {
      if (!events || events.length === 0) return;

      const grouped = groupEventsByDate(events);

      await Promise.allSettled(
        Object.entries(grouped).map(async ([dateKey, dateEvents]) => {
          const timestamp = Date.now();
          const randId = randomUUID().slice(0, 8);
          const chunkKey = `logs/${dateKey}/raw/${timestamp}_${randId}.jsonl`;
          const body = dateEvents.map(e => JSON.stringify(e)).join("\n");

          await writeLogItem(chunkKey, body);
        }),
      );
    },
    resolve: () => ({}),
  });
}

export async function consolidateDailyLogs() {
  const allKeys = await listAllLogKeys();
  const rawChunksByDate: Record<string, string[]> = {};

  for (const key of allKeys) {
    const rawMatch = normalizeKey(key).match(/^logs\/(\d{4}\/\d{2}\/\d{2})\/raw\/.+/);

    if (rawMatch?.[1]) {
      const dateKey = rawMatch[1];
      (rawChunksByDate[dateKey] ??= []).push(key);
    }
  }

  let totalProcessedChunks = 0;
  let totalConsolidatedDates = 0;

  for (const [dateKey, rawKeys] of Object.entries(rawChunksByDate)) {
    if (rawKeys.length === 0) continue;

    const chunkContents: string[] = (
      await Promise.all(
        rawKeys.map(async (rawKey) => {
          try {
            return await readLogItem(rawKey);
          }
          catch (error) {
            console.error(`[evlog/r2] Failed to read chunk key ${rawKey}:`, error);
            return null;
          }
        }),
      )
    ).filter((content): content is string => Boolean(content));

    if (chunkContents.length === 0) continue;

    const consolidatedKey = `logs/${dateKey}.jsonl`;
    const existingContent = await readLogItem(consolidatedKey).catch(() => null);

    const mergedContent = [existingContent, ...chunkContents]
      .filter(Boolean)
      .join("\n");

    await writeLogItem(consolidatedKey, mergedContent);

    // Clean up processed raw chunk keys
    await Promise.all(rawKeys.map(k => deleteLogItem(k)));

    totalProcessedChunks += rawKeys.length;
    totalConsolidatedDates++;
  }

  // Enforce retention policy
  await cleanupExpiredLogs();

  return {
    processedChunksCount: totalProcessedChunks,
    consolidatedDatesCount: totalConsolidatedDates,
  };
}

export async function cleanupExpiredLogs(retentionDays = RETENTION_DAYS) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - retentionDays);

    const allKeys = await listAllLogKeys();

    const keysToDelete: string[] = allKeys.filter((rawKey) => {
      const logDate = parseDateKey(normalizeKey(rawKey));
      return logDate && logDate < cutoffDate;
    });

    if (keysToDelete.length > 0) {
      await Promise.allSettled(keysToDelete.map(k => deleteLogItem(k)));
    }
  }
  catch (error) {
    console.error("[evlog/r2] Failed to cleanup old logs:", error);
  }
}
