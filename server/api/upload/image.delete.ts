/* eslint-disable no-console */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { key } = body;

    if (!key || typeof key !== "string") {
      throw createError({
        statusCode: 400,
        message: "Invalid image key",
      });
    }

    console.log("Deleting image with key:", key);

    const nitroStorage = useStorage("images");

    const r2FormattedKey = key.replace(/\//g, ":");

    const keysToTry = [key, r2FormattedKey];

    let deleted = false;
    let deletedKey = "";

    for (const key of keysToTry) {
      try {
        const file = await nitroStorage.getItem(key);

        if (file) {
          await nitroStorage.removeItem(key);
          deleted = true;
          deletedKey = key;
          console.log(`Deleted image with key: ${key}`);
          break;
        }
      }
      catch (error) {
        console.log(`Failed to delete with key: ${key}`, error);
      }
    }

    if (!deleted) {
      throw createError({
        statusCode: 404,
        message: "Image not found",
      });
    }

    return {
      success: true,
      message: `Image deleted successfully, key: ${key}`,
      deletedKey,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Delete Image", event);
  }
});
