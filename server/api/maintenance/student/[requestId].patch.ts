import { maintenanceQueries } from "~~/server/db/queries";
import { deleteMediaByUrls } from "~~/server/utils/r2Upload";

export default defineEventHandler(async (event) => {
  await studentSessionCheck(event);

  const idFromParam = Number(getRouterParam(event, "requestId"));

  if (Number.isNaN(idFromParam) || idFromParam <= 0) {
    throw createError({
      statusCode: 400,
      message: "Invalid Request ID: The provided request ID is not valid.",
    });
  }

  try {
    const body = await readValidatedBody(event, body => editMaintenanceSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: body.error.issues.map(i => i.message).join(", "),
      });
    }

    const { maintenanceId, data, studentId } = body.data;

    if (maintenanceId !== idFromParam) {
      throw createError({
        statusCode: 400,
        message: "Request ID Mismatch: The request ID in the body does not match the URL parameter.",
      });
    }

    const { updateMaintenance, getMaintenanceByIdForStudent } = await maintenanceQueries();

    const existingMaintenance = await getMaintenanceByIdForStudent(maintenanceId, studentId);

    if (!existingMaintenance) {
      throw createError({
        statusCode: 404,
        message: "Maintenance Request Not Found: Unable to find the specified maintenance request.",
      });
    }

    const mediaAttachments = data.mediaAttachments;
    const deletedMedia = mediaAttachments !== undefined
      ? (existingMaintenance.mediaAttachments || []).filter(
          m => !mediaAttachments.map(media => media.url).includes(m.url),
        )
      : [];

    const updatedMaintenance = await updateMaintenance(
      maintenanceId,
      studentId,
      data as Parameters<typeof updateMaintenance>[2],
    );

    if (!updatedMaintenance) {
      throw createError({
        statusCode: 500,
        message: "Maintenance request update failed: no record was returned.",
      });
    }

    if (deletedMedia.length > 0) {
      await deleteMediaByUrls(deletedMedia).catch((e) => {
        console.error("Failed to delete orphaned media attachments:", e);
      });
    }

    return {
      success: true,
      message: `Maintenance request with ID ${updatedMaintenance.id} updated successfully.`,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Update Maintenance Request", event);
  }
});
