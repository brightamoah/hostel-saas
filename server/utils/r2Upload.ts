import type { H3Event } from "h3";
import type { Buffer } from "node:buffer";

const ALLOWED_MIME_TYPES: Record<string, MediaAttachment["type"]> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "video/mp4": "video",
  "video/quicktime": "video",
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 3;

const randomString = () => Math.random().toString(36).slice(2);

export function validateFiles(
  files: { type?: string; data: Buffer; filename?: string }[],
  options: FileValidationOptions = {},
) {
  const allowed = options.allowedMimeTypes ?? ALLOWED_MIME_TYPES;
  const maxSize = options.maxSizePerFile ?? MAX_FILE_SIZE;
  const maxTotal = options.maxTotalFiles ?? MAX_FILES;

  if (files.length > maxTotal) {
    throw createError({
      statusCode: 400,
      message: `Maximum ${maxTotal} files allowed.`,
    });
  }

  for (const file of files) {
    if (!file.type || !(file.type in allowed)) {
      throw createError({
        statusCode: 400,
        message: `Unsupported file type: ${file.type}. Allowed: ${Object.keys(allowed).join(", ")}`,
      });
    }
    if (file.data.length > maxSize) {
      throw createError({
        statusCode: 400,
        message: `File "${file.filename ?? "upload"}" exceeds the ${maxSize / (1024 * 1024)}MB size limit.`,
      });
    }
  }
}

export function generateMediaKey(
  folder: string,
  entityId: string | number,
  mimeType: string,
): string {
  const [, subtype = "bin"] = mimeType.split("/");
  const ext = subtype.replace("quicktime", "mov");
  return `${folder}/${entityId}/${Date.now()}-${randomString()}.${ext}`;
}

export async function uploadSingleFile(
  event: H3Event,
  file: { data: Buffer; type: string; filename?: string },
  options: {
    folder: string;
    entityId: string | number;
    allowedMimeTypes?: Record<string, MediaAttachment["type"]>;
  },
): Promise<MediaAttachment> {
  const config = useRuntimeConfig();
  const allowed = options.allowedMimeTypes ?? ALLOWED_MIME_TYPES;
  const mediaType = allowed[file.type];

  if (!mediaType) {
    throw createError({
      statusCode: 400,
      message: `Unsupported file type: ${file.type}. Allowed: ${Object.keys(allowed).join(", ")}`,
    });
  }

  const key = generateMediaKey(options.folder, options.entityId, file.type);

  if (import.meta.dev) {
    const storage = useStorage("images");

    await storage.setItemRaw(key, file.data, {
      httpMetadata: {
        contentType: file.type,
      },
    });
  }
  else {
    const r2Bucket = event.context.cloudflare?.env?.BUCKET;

    if (!r2Bucket) {
      throw createError({
        statusCode: 500,
        message: "R2 bucket not configured",
      });
    }

    await r2Bucket.put(key, file.data, {
      httpMetadata: {
        contentType: file.type,
      },
    });
  }

  const url = `${config.r2Url}/${key}`;

  return {
    url,
    type: mediaType,
    name: file.filename ?? key.split("/").pop() ?? "upload",
    size: file.data.length,
  };
}

export interface UploadMediaOptions extends FileValidationOptions {
  folder: string;
  entityId: string | number;
}

export async function uploadMedia(event: H3Event, files:
  | { data: Buffer; type: string; filename?: string }
  | { data: Buffer; type: string; filename?: string }[], options: UploadMediaOptions): Promise<MediaAttachment[]> {
  const fileArray = Array.isArray(files) ? files : [files];

  validateFiles(fileArray, {
    allowedMimeTypes: options.allowedMimeTypes,
    maxSizePerFile: options.maxSizePerFile,
    maxTotalFiles: options.maxTotalFiles,
  });

  const results = await Promise.all(
    fileArray.map(file =>
      uploadSingleFile(event, file, {
        folder: options.folder,
        entityId: options.entityId,
        allowedMimeTypes: options.allowedMimeTypes,
      }),
    ),
  );

  return results;
}

export async function deleteMediaByUrls(attachments: MediaAttachment | MediaAttachment[]) {
  const config = useRuntimeConfig();
  const attachmentArray = Array.isArray(attachments) ? attachments : [attachments];
  const storage = useStorage("images");

  await Promise.all(
    attachmentArray.map(async ({ url }) => {
      const key = url.replace(`${config.r2Url}/`, "");
      await storage.removeItem(key);
    }),
  );
}
