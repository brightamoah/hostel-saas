import { admin, user } from "~~/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const seedPlatformAdminSchema = z.object({
  name: z.string().trim().min(2).max(255),
  email: z.string().trim().email(),
  password: z.string().min(8).max(255),
  phoneNumber: z.string().trim().min(8).max(20),
});

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig(event);

  const secret = getHeader(event, "x-seed-secret");
  if (!secret || secret !== runtimeConfig.platformSeedSecret) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const parsed = await readValidatedBody(event, b => seedPlatformAdminSchema.safeParse(b));
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues.map(i => i.message).join(", "),
    });
  }

  const { name, email, password, phoneNumber } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const { db } = useDB();

  return await db.transaction(async (tx) => {
    const existing = await tx.query.user.findFirst({
      where: (t, { eq }) => eq(t.email, normalizedEmail),
      columns: { id: true, email: true },
    });

    if (existing) {
      return { success: true, created: false, message: "Platform admin already exists for this email." };
    }

    const passwordHash = await hash(password);

    const [createdUser] = await tx.insert(user).values({
      name,
      email: normalizedEmail,
      password: passwordHash,
      role: "admin",
      emailVerified: true,
    }).returning({ id: user.id, email: user.email });

    if (!createdUser) {
      throw createError({ statusCode: 500, message: "Failed to create user" });
    }

    const [createdAdmin] = await tx.insert(admin).values({
      userId: createdUser.id,
      phoneNumber,
      department: "Platform",
      accessLevel: "super",
      hostelId: null,
      companyId: null,
      status: "active",
    }).returning({ id: admin.id, userId: admin.userId });

    if (!createdAdmin) {
      await tx.delete(user).where(eq(user.id, createdUser.id));
      throw createError({ statusCode: 500, message: "Failed to create admin profile" });
    }

    return {
      success: true,
      created: true,
      message: "Platform admin created successfully.",
      data: { user: createdUser, admin: createdAdmin },
    };
  });
});
