import type { WideEvent } from "evlog";
import type { H3Event } from "h3";
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
  const normalized = normalizeKey(key);
  const match = normalized.match(/logs\/(\d{4})\/(\d{2})\/(\d{2})/);
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

function getR2Context(event?: H3Event) {
  const storage = useStorage("images");
  let cfBucket: R2Bucket | null = null;

  if (event) {
    try {
      cfBucket = event.context?.cloudflare?.env?.BUCKET ?? null;
    }
    catch {}
  }

  if (!cfBucket) {
    try {
      cfBucket = useEvent()?.context?.cloudflare?.env?.BUCKET ?? null;
    }
    catch {}
  }

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

async function listAllLogKeys(event?: H3Event): Promise<string[]> {
  const { storage, cfBucket } = getR2Context(event);
  const keysSet = new Set<string>();

  if (cfBucket) {
    try {
      let cursor: string | undefined;

      do {
        const listResult = await cfBucket.list({ prefix: "logs", cursor });

        listResult?.objects?.forEach((obj: { key?: string }) => obj?.key && keysSet.add(obj.key));

        cursor = listResult?.truncated
          ? listResult.cursor
          : undefined;
      } while (cursor);

      return Array.from(keysSet);
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

async function readLogItem(key: string, event?: H3Event): Promise<string | null> {
  const { storage, cfBucket } = getR2Context(event);
  const keysToTry = getKeyVariations(key);

  if (cfBucket) {
    for (const k of keysToTry) {
      try {
        const objectBody = await cfBucket.get(k);

        if (objectBody) {
          const arrayBuffer = await objectBody.arrayBuffer();
          return new TextDecoder().decode(arrayBuffer).trim();
        }
      }
      catch {}
    }
    return null;
  }

  for (const k of keysToTry) {
    try {
      const content = await storage.getItemRaw(k);

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

async function writeLogItem(key: string, body: string, event?: H3Event): Promise<void> {
  const { storage, cfBucket } = getR2Context(event);
  const slashKey = normalizeKey(key);

  if (cfBucket) {
    await cfBucket.put(
      slashKey,
      body,
      {
        httpMetadata: { contentType: "application/x-ndjson" },
      },
    );
    return;
  }

  await storage.setItemRaw(
    slashKey,
    body,
    {
      httpMetadata: { contentType: "application/x-ndjson" },
    },
  );
}

async function deleteLogItem(key: string, event?: H3Event): Promise<void> {
  const { storage, cfBucket } = getR2Context(event);
  const keysToDelete = getKeyVariations(key);

  if (cfBucket) {
    await Promise.allSettled(keysToDelete.map(k => cfBucket.delete(k)));
    return;
  }

  await Promise.allSettled(keysToDelete.map(k => storage.removeItem(k)));
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

export async function consolidateDailyLogs(event?: H3Event) {
  const allKeys = await listAllLogKeys(event);
  const rawChunksByDate: Record<string, string[]> = {};

  for (const key of allKeys) {
    const normalizedKey = normalizeKey(key);
    const rawMatch = normalizedKey.match(/^logs\/(\d{4}\/\d{2}\/\d{2})\/raw\/.+/);

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
            return await readLogItem(rawKey, event);
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
    const existingContent = await readLogItem(consolidatedKey, event).catch(() => null);

    const mergedContent = [existingContent, ...chunkContents]
      .filter(Boolean)
      .join("\n");

    await writeLogItem(consolidatedKey, mergedContent, event);

    // Clean up processed raw chunk keys
    await Promise.allSettled(rawKeys.map(k => deleteLogItem(k, event)));

    // Clean up legacy colon-formatted consolidated file if present
    const colonConsolidatedKey = `logs:${dateKey.replace(/\//g, ":")}.jsonl`;
    await deleteLogItem(colonConsolidatedKey, event);

    totalProcessedChunks += rawKeys.length;
    totalConsolidatedDates++;
  }

  // Clean up any remaining legacy colon-separated consolidated files across all dates
  for (const key of allKeys) {
    if (key.includes(":") && key.endsWith(".jsonl") && !key.includes("raw")) {
      const slashKey = normalizeKey(key);
      const existingSlashContent = await readLogItem(slashKey, event);

      if (existingSlashContent) {
        await deleteLogItem(key, event);
      }
      else {
        const colonContent = await readLogItem(key, event);
        if (colonContent) {
          await writeLogItem(slashKey, colonContent, event);
          await deleteLogItem(key, event);
        }
      }
    }
  }

  // Enforce retention policy
  await cleanupExpiredLogs(RETENTION_DAYS, event);

  return {
    processedChunksCount: totalProcessedChunks,
    consolidatedDatesCount: totalConsolidatedDates,
  };
}

export async function cleanupExpiredLogs(retentionDays = RETENTION_DAYS, event?: H3Event) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - retentionDays);

    const allKeys = await listAllLogKeys(event);

    const keysToDelete: string[] = allKeys.filter((rawKey) => {
      const logDate = parseDateKey(rawKey);
      return logDate && logDate < cutoffDate;
    });

    if (keysToDelete.length > 0) {
      await Promise.allSettled(keysToDelete.map(k => deleteLogItem(k, event)));
    }
  }
  catch (error) {
    console.error("[evlog/r2] Failed to cleanup old logs:", error);
  }
}
