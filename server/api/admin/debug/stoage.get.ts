export default defineEventHandler(async () => {
  // Only allow in development
  if (!import.meta.dev) {
    throw createError({
      statusCode: 403,
      message: "Not allowed in production",
    });
  }

  try {
    const storage = useStorage("images");

    // List all keys
    const keys = await storage.getKeys();

    // Get storage info
    const testKey = keys[0];
    let testItem = null;

    if (testKey) {
      const hasItem = await storage.hasItem(testKey);
      testItem = {
        key: testKey,
        exists: hasItem,
      };
    }

    return {
      success: true,
      storageType: "images",
      totalKeys: keys.length,
      keys: keys.slice(0, 20), // First 20 keys
      testItem,
    };
  }
  catch (error: any) {
    return {
      success: false,
      error: error.message,
      stack: error.stack,
    };
  }
});
