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

function groupEventsByDate(events: WideEvent[]): Record<string, WideEvent[]> {
  const grouped: Record<string, WideEvent[]> = {};
  for (const event of events) {
    const timestamp = (event as Record<string, unknown>).timestamp;
    const date = timestamp ? new Date(timestamp as string | number) : new Date();
    const dateKey = formatDateKey(date);
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(event);
  }
  return grouped;
}

export function createR2Drain() {
  return defineDrain({
    name: "kayanest-r2-drain",
    send: async (events) => {
      if (!events || events.length === 0) return;

      const storage = useStorage("images");
      const grouped = groupEventsByDate(events);

      for (const [dateKey, dateEvents] of Object.entries(grouped)) {
        const timestamp = Date.now();
        const randId = randomUUID().slice(0, 8);
        const chunkKey = `logs/${dateKey}/raw/${timestamp}_${randId}.jsonl`;
        const body = dateEvents.map(e => JSON.stringify(e)).join("\n");

        await storage.setItemRaw(chunkKey, body, {
          httpMetadata: { contentType: "application/x-ndjson" },
        });
      }
    },
    resolve: () => ({}),
  });
}

export async function consolidateDailyLogs() {
  const storage = useStorage("images");
  const allKeys = await storage.getKeys("logs");

  // Normalize keys (unstorage might return keys with ':' or '/')
  const normalizedKeys = allKeys.map(key => ({
    rawKey: key,
    normalized: key.replace(/^logs[:/]/, "logs/").replace(/:/g, "/"),
  }));

  const rawChunksByDate: Record<string, string[]> = {};

  for (const { rawKey, normalized } of normalizedKeys) {
    const rawMatch = normalized.match(/^logs\/(\d{4}\/\d{2}\/\d{2})\/raw\/.+/);
    if (rawMatch && rawMatch[1]) {
      const dateKey = rawMatch[1];

      if (!rawChunksByDate[dateKey]) rawChunksByDate[dateKey] = [];

      rawChunksByDate[dateKey].push(rawKey);
    }
  }

  for (const [dateKey, rawKeys] of Object.entries(rawChunksByDate)) {
    if (rawKeys.length === 0) continue;

    const chunkContents: string[] = [];

    for (const rawKey of rawKeys) {
      try {
        const rawContent = await storage.getItemRaw(rawKey);

        if (rawContent) {
          const text = typeof rawContent === "string"
            ? rawContent
            : new TextDecoder().decode(rawContent as Uint8Array);
          chunkContents.push(text.trim());
        }
      }
      catch (error) {
        console.error(`[evlog/r2] Failed to read chunk key ${rawKey}:`, error);
      }
    }

    if (chunkContents.length === 0) continue;

    const consolidatedKey = `logs/${dateKey}.jsonl`;
    let existingText = "";

    try {
      const existingContent = await storage.getItemRaw(consolidatedKey);

      if (existingContent) {
        existingText = typeof existingContent === "string"
          ? existingContent
          : new TextDecoder().decode(existingContent as Uint8Array);
        existingText = existingText.trim();
      }
    }
    catch {
      // Existing file does not exist yet
    }

    const mergedContent = [existingText, ...chunkContents]
      .filter(Boolean)
      .join("\n");

    await storage.setItemRaw(consolidatedKey, mergedContent, {
      httpMetadata: { contentType: "application/x-ndjson" },
    });

    // Clean up processed raw chunk keys
    await Promise.all(rawKeys.map(k => storage.removeItem(k)));
  }

  // Enforce retention policy
  await cleanupExpiredLogs();
}

export async function cleanupExpiredLogs(retentionDays = RETENTION_DAYS) {
  try {
    const storage = useStorage("images");
    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - retentionDays);

    const allKeys = await storage.getKeys("logs");

    const keysToDelete: string[] = [];

    for (const rawKey of allKeys) {
      const normalized = rawKey.replace(/^logs[:/]/, "logs/").replace(/:/g, "/");

      const logDate = parseDateKey(normalized);

      if (logDate && logDate < cutoffDate) keysToDelete.push(rawKey);
    }

    if (keysToDelete.length > 0) {
      await Promise.all(keysToDelete.map(k => storage.removeItem(k)));
    }
  }
  catch (error) {
    console.error("[evlog/r2] Failed to cleanup old logs:", error);
  }
}
