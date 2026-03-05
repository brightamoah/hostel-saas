import type { StudentStatusResponse } from "~~/shared/types";

import { roomQueries } from "~~/server/db/queries";
import { userQueries } from "~~/server/db/queries/user";
import { handleError } from "~~/server/utils/errorHandler";

export default defineEventHandler(async (event): Promise<StudentStatusResponse> => {
  try {
    const { user } = await getUserSession(event);
    const { getOnboardedStudent } = await userQueries();
    const { checkActiveOrPendingAllocation } = await roomQueries();

    if (!user || !user.emailVerified) {
      return {
        success: true,
        hasProfile: false,
        hasActiveBooking: false,
        student: null,
      };
    }

    if (user.role === "admin") {
      return {
        success: true,
        hasProfile: false,
        hasActiveBooking: false,
        student: null,
      };
    }

    const existingStudent = await getOnboardedStudent(user.id);

    if (!existingStudent) {
      return {
        success: true,
        hasProfile: false,
        hasActiveBooking: false,
        student: null,
      };
    }

    const activeAllocation = await checkActiveOrPendingAllocation(existingStudent.id);

    return {
      success: true,
      hasProfile: true,
      hasActiveBooking: !!activeAllocation,
      studentId: existingStudent.id,
      student: existingStudent,
    };
  }
  catch (error) {
    handleError(error, "Check Student Details", event);
  }
});
