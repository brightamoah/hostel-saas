import { roomQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const { companyId, companyRole } = await adminSessionCheck(event);

  if (companyRole !== "owner") {
    throw createError({
      statusCode: 403,
      message: "Only company owners can create hostels.",
    });
  }

  if (!companyId) {
    throw createError({
      statusCode: 400,
      message: "Your account is not associated with a company. Please contact support.",
    });
  }

  try {
    const body = await readValidatedBody(event, body => hostelDetailsSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: body.error.issues.map(i => i.message).join(", "),
      });
    }

    const {
      name,
      slug,
      supportEmail,
      supportPhone,
      address,
      logoUrl,
      joinCode,
    } = body.data;

    const { createNewHostel } = await roomQueries();

    const newHostel = await createNewHostel({
      name,
      slug,
      email: supportEmail,
      contactNumber: supportPhone,
      supportEmail,
      supportPhone,
      address,
      logoUrl,
      joinCode,
      companyId,
    });

    return {
      success: true,
      message: "Hostel created successfully.",
      hostel: {
        id: newHostel?.id,
        name: newHostel?.name,
        slug: newHostel?.slug,
        joinCode: newHostel?.joinCode,
      },
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Create New Hostel", event);
  }
});
