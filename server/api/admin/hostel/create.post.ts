import { roomQueries } from "~~/server/db/queries";

defineRouteMeta({
  openAPI: {
    summary: "Create a new hostel",
    tags: ["Admin", "Hostel"],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              slug: { type: "string" },
              supportEmail: { type: "string", nullable: true },
              supportPhone: { type: "string", nullable: true },
              address: { type: "string" },
              logoUrl: { type: "string", nullable: true },
              joinCode: { type: "string", nullable: true },
            },
            required: ["name", "slug", "address"],
          },
        },
      },
    },
    responses: {
      200: {
        description: "Hostel created successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                message: { type: "string" },
                hostel: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                    name: { type: "string" },
                    slug: { type: "string" },
                    joinCode: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
      400: { description: "Bad Request - Validation failed or no company association" },
      403: { description: "Forbidden - Only company owners can create hostels" },
    },
  },
});

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
