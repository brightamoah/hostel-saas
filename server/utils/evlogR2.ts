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

function getR2Context(eventOrCtx?: unknown) {
  const storage = useStorage("images");
  let cfBucket: R2Bucket | null = null;

  if (eventOrCtx) {
    const obj = eventOrCtx as {
      context?: { cloudflare?: { env?: { BUCKET?: R2Bucket } } };
      cloudflare?: { env?: { BUCKET?: R2Bucket } };
      env?: { BUCKET?: R2Bucket };
      BUCKET?: R2Bucket;
    };
    cfBucket
      = obj?.context?.cloudflare?.env?.BUCKET
        ?? obj?.cloudflare?.env?.BUCKET
        ?? obj?.env?.BUCKET
        ?? obj?.BUCKET
        ?? null;
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
        ?? (globalThis as unknown as { BUCKET?: R2Bucket }).BUCKET
        ?? globalContainer.process?.env?.BUCKET
        ?? null;
  }
  return { storage, cfBucket };
}

async function listAllLogKeys(eventOrCtx?: unknown): Promise<string[]> {
  const { storage, cfBucket } = getR2Context(eventOrCtx);
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
  catch (err) {
    console.error("[evlog/r2] Error listing keys from storage:", err);
  }

  return Array.from(keysSet);
}

async function readLogItem(key: string, eventOrCtx?: unknown): Promise<string | null> {
  const { storage, cfBucket } = getR2Context(eventOrCtx);
  const slashKey = normalizeKey(key);

  if (cfBucket) {
    try {
      const objectBody = await cfBucket.get(slashKey);
      if (objectBody) return (await objectBody.text()).trim();
    }
    catch (err) {
      console.error(`[evlog/r2] Error reading ${slashKey} from cfBucket:`, err);
    }
    return null;
  }

  try {
    const content = await storage.getItemRaw(key) ?? await storage.getItemRaw(slashKey);
    if (content) {
      return typeof content === "string"
        ? content.trim()
        : new TextDecoder().decode(content as Uint8Array).trim();
    }
  }
  catch {}
  return null;
}

async function writeLogItem(key: string, body: string, eventOrCtx?: unknown): Promise<void> {
  const { storage, cfBucket } = getR2Context(eventOrCtx);
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

export async function deleteLogItems(keys: string[], eventOrCtx?: unknown): Promise<void> {
  if (!keys.length) return;
  const { storage, cfBucket } = getR2Context(eventOrCtx);

  if (cfBucket) {
    const batchSize = 500;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      await cfBucket.delete(batch);
    }
    return;
  }

  await Promise.allSettled(keys.map(k => storage.removeItem(k)));
}

export async function deleteLogItem(key: string, eventOrCtx?: unknown): Promise<void> {
  await deleteLogItems([key], eventOrCtx);
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

export interface ConsolidateLogsOptions {
  includeToday?: boolean;
}

export async function consolidateDailyLogs(
  eventOrCtx?: unknown,
  options?: ConsolidateLogsOptions,
) {
  const allKeys = await listAllLogKeys(eventOrCtx);
  const rawChunksByDate: Record<string, string[]> = {};

  for (const key of allKeys) {
    const normalizedKey = normalizeKey(key);
    const rawMatch = normalizedKey.match(/^logs\/(\d{4}\/\d{2}\/\d{2})\/raw\/.+/);

    if (rawMatch?.[1]) {
      const dateKey = rawMatch[1];
      (rawChunksByDate[dateKey] ??= []).push(key);
    }
  }

  const todayKey = formatDateKey(new Date());
  const allowToday = options?.includeToday ?? import.meta.dev;

  let totalProcessedChunks = 0;
  let totalConsolidatedDates = 0;

  for (const [dateKey, rawKeys] of Object.entries(rawChunksByDate)) {
    if (rawKeys.length === 0) continue;

    // Do not consolidate the current in-progress day during cron runs
    if (!allowToday && dateKey >= todayKey) {
      continue;
    }

    const chunkContents: string[] = [];
    const batchSize = 20;

    for (let i = 0; i < rawKeys.length; i += batchSize) {
      const batch = rawKeys.slice(i, i + batchSize);
      const batchContents = await Promise.all(
        batch.map(async (rawKey) => {
          try {
            return await readLogItem(rawKey, eventOrCtx);
          }
          catch (error) {
            console.error(`[evlog/r2] Failed to read chunk key ${rawKey}:`, error);
            return null;
          }
        }),
      );

      for (const content of batchContents) {
        if (content && content.trim().length > 0) {
          chunkContents.push(content.trim());
        }
      }
    }

    if (chunkContents.length === 0) {
      await deleteLogItems(rawKeys, eventOrCtx);
      continue;
    }

    const consolidatedKey = `logs/${dateKey}.jsonl`;
    const existingContent = await readLogItem(consolidatedKey, eventOrCtx).catch(() => null);

    const mergedEntries = [existingContent, ...chunkContents]
      .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
      .map(c => c.trim());

    const mergedContent = `${mergedEntries.join("\n")}\n`;

    await writeLogItem(consolidatedKey, mergedContent, eventOrCtx);

    // Clean up processed raw chunk keys only
    await deleteLogItems(rawKeys, eventOrCtx);

    totalProcessedChunks += rawKeys.length;
    totalConsolidatedDates++;
  }

  // Enforce retention policy (e.g. 30 days)
  await cleanupExpiredLogs(RETENTION_DAYS, eventOrCtx);

  return {
    processedChunksCount: totalProcessedChunks,
    consolidatedDatesCount: totalConsolidatedDates,
  };
}

export async function cleanupExpiredLogs(retentionDays = RETENTION_DAYS, eventOrCtx?: unknown) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - retentionDays);

    const allKeys = await listAllLogKeys(eventOrCtx);

    const keysToDelete: string[] = allKeys.filter((rawKey) => {
      const logDate = parseDateKey(rawKey);
      return logDate && logDate < cutoffDate;
    });

    if (keysToDelete.length > 0) {
      await deleteLogItems(keysToDelete, eventOrCtx);
    }
  }
  catch (error) {
    console.error("[evlog/r2] Failed to cleanup old logs:", error);
  }
}
