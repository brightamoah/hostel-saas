import { admin, company, companyMember, hostel, user } from "../schema";

export async function companyQueries() {
  const { db } = useDB();

  const registerCompanyOwner = async (data: RegisterCompanySchema & {
    verificationToken: string;
    verificationTokenExpiresAt: Date;
  }) => {
    return await db.transaction(async (tx) => {
      const existingUser = await tx.query.user.findFirst({
        where: (user, { eq }) => eq(user.email, data.email),
        columns: {
          id: true,
        },
      });

      if (existingUser) {
        throw createError({
          statusCode: 400,
          message: "Email already exists. Please use a different email.",
        });
      }

      const existingCompany = await tx.query.company.findFirst({
        where: (company, { eq }) => eq(company.slug, data.companySlug),
        columns: {
          id: true,
        },
      });

      if (existingCompany) {
        throw createError({
          statusCode: 400,
          message: "Company slug is already taken.",
        });
      }

      const [createdUser] = await tx.insert(user).values({
        email: data.email,
        password: data.password,
        name: data.name,
        role: "admin",
        emailVerified: false,
        verificationToken: data.verificationToken,
        verificationTokenExpiresAt: data.verificationTokenExpiresAt,
      }).returning();

      if (!createdUser) {
        throw createError({
          statusCode: 500,
          message: "Failed to create user. Please try again.",
        });
      }

      const [createdCompany] = await tx.insert(company).values({
        name: data.companyName,
        slug: data.companySlug,
        status: "active",
      }).returning();

      if (!createdCompany) {
        throw createError({
          statusCode: 500,
          message: "Failed to create company. Please try again.",
        });
      }

      let createdHostel: typeof hostel.$inferSelect | null = null;

      if (data.createHostelNow) {
        const {
          hostelName,
          hostelSlug,
          supportEmail,
          supportPhone,
          hostelAddress,
        } = data;

        if (!hostelName || !hostelSlug) {
          throw createError({
            statusCode: 400,
            message: "Hostel name and slug are required to create a hostel.",
          });
        }

        if (!hostelAddress) {
          throw createError({
            statusCode: 400,
            message: "Hostel address is required to create a hostel.",
          });
        }

        if (!supportEmail || !supportPhone) {
          throw createError({
            statusCode: 400,
            message: "Support email and phone are required to create a hostel.",
          });
        }

        const existingHostel = await tx.query.hostel.findFirst({
          where: (hostel, { eq }) => eq(hostel.slug, hostelSlug),
          columns: { id: true },
        });

        if (existingHostel) {
          throw createError({
            statusCode: 400,
            message: "Hostel slug is already taken.",
          });
        }

        const [newHostel] = await tx.insert(hostel).values({
          companyId: createdCompany.id,
          address: hostelAddress,
          contactNumber: supportPhone,
          email: supportEmail,
          name: hostelName,
          slug: hostelSlug,
          status: "active",
          supportEmail,
          supportPhone,
        }).returning();

        createdHostel = newHostel ?? null;
      }

      if (!createdHostel && data.createHostelNow) {
        throw createError({
          statusCode: 500,
          message: "Failed to create hostel. Please try again.",
        });
      }

      const [createdAdmin] = await tx.insert(admin).values({
        userId: createdUser.id,
        companyId: createdCompany.id,
        department: "Owner",
        phoneNumber: data.phoneNumber,
        accessLevel: "regular", // company owners aren't "platform super"
        hostelId: createdHostel?.id,
        status: "active",
      }).returning();

      if (!createdAdmin) {
        throw createError({
          statusCode: 500,
          message: "Failed to create admin record. Please try again.",
        });
      }

      const [createdMembership] = await tx.insert(companyMember).values({
        companyId: createdCompany.id,
        userId: createdUser.id,
        role: "owner",
        status: "active",
      }).returning();

      if (!createdMembership) {
        throw createError({
          statusCode: 500,
          message: "Failed to create company membership. Please try again.",
        });
      }

      return {
        user: createdUser,
        company: createdCompany,
        admin: createdAdmin,
        membership: createdMembership,
        hostel: createdHostel,
      };
    });
  };

  return {
    registerCompanyOwner,
  };
}
