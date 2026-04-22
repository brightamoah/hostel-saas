import type { FormErrorEvent, FormSubmitEvent } from "@nuxt/ui";

import { acceptHMRUpdate, defineStore } from "pinia";

export const useMaintenanceStore = defineStore("maintenanceStore", () => {
  const { user } = usePortalUserSession();
  const { $apiFetch } = useNuxtApp();

  const toast = useToast();

  const isLoading = ref<boolean>(false);
  const isModalOpen = ref<boolean>(false);

  const maintenanceDataKey = computed(() => user.value?.role === "admin"
    ? `maintenanceData:${user.value?.adminData?.accessLevel}`
    : `maintenanceData:${user.value?.id}`,
  );

  const dashboardKey = computed(() => `dashboardData:${user.value?.id}`);

  const maintenanceStatusResponseState = ref<Partial<StatusResponseForm>>({
    responseText: "",
    status: undefined,
  });

  const isUpdateFormValid = computed(() => {
    return (
      typeof maintenanceStatusResponseState.value.status === "string"
      && maintenanceStatusResponseState.value?.status.trim() !== ""
      && typeof maintenanceStatusResponseState.value.responseText === "string"
      && maintenanceStatusResponseState.value.responseText.trim() !== ""
    );
  });

  const isAddResponseFormValid = computed(() => {
    return (
      typeof maintenanceStatusResponseState.value.responseText === "string"
      && maintenanceStatusResponseState.value.responseText.trim() !== ""
    );
  });

  const updateStatusAndAddResponse = async (payload: MaintenanceStatusResponseSchema) => {
    if (!isUpdateFormValid.value) return;

    if (!payload.maintenanceId && !payload.status && !payload.responseText) return;

    isLoading.value = true;

    try {
      const response = await $apiFetch("/api/maintenance/updateStatus", {
        method: "POST",
        body: payload,
      });

      toast.add({
        title: "Maintenance Status Updated Successfully",
        description: response.message,
        color: "success",
        icon: "i-lucide-circle-check-big",
      });

      await refreshNuxtData(maintenanceDataKey.value);
      clearState();
    }
    catch (error) {
      const message = (error as any)?.data?.message;
      toast.add({
        title: "Failed to Update Maintenance Status",
        description: message,
        color: "error",
        icon: "i-lucide-circle-alert",
        duration: 8000,
      });
    }
    finally {
      isLoading.value = false;
    }
  };

  const addMaintenanceResponse = async (payload: Omit<MaintenanceStatusResponseSchema, "status">) => {
    if (!isAddResponseFormValid.value) return;

    if (!payload.maintenanceId && !payload.responseText) return;

    isLoading.value = true;

    try {
      const response = await $apiFetch("/api/maintenance/addResponse", {
        method: "POST",
        body: payload,
      });

      toast.add({
        title: "Maintenance Response Added Successfully",
        description: response.message,
        color: "success",
        icon: "i-lucide-circle-check-big",
      });

      await refreshNuxtData(maintenanceDataKey.value);
      clearState();
    }
    catch (error) {
      const message = (error as any)?.data?.message;
      toast.add({
        title: "Failed to Add Maintenance Response",
        description: message,
        color: "error",
        icon: "i-lucide-circle-alert",
        duration: 8000,
      });
    }
    finally {
      isLoading.value = false;
    }
  };

  const isCreateModalOpen = ref(false);
  const createMaintenanceState = ref<Partial<CreateMaintenanceSchema>>({
    issueType: undefined,
    description: "",
    priority: undefined,
    hostelId: undefined,
    studentId: undefined,
    roomId: undefined,
    mediaAttachments: undefined,
  });

  const isCreateFormValid = computed(() => {
    return (
      createMaintenanceState.value.issueType?.trim() !== ""
      && createMaintenanceState.value.description?.trim() !== ""
      && createMaintenanceState.value.priority?.trim() !== ""
      && createMaintenanceState.value.hostelId !== undefined
      && createMaintenanceState.value.studentId !== undefined
      && createMaintenanceState.value.roomId !== undefined
      && createMaintenanceState.value.mediaAttachments !== undefined
    );
  });

  const createMaintenance = async (payload: FormSubmitEvent<CreateMaintenanceSchema>) => {
    if (!isCreateFormValid.value) return;

    isLoading.value = true;

    try {
      const formData = { ...payload.data };
      let uploadedMedia: MediaAttachment[] = [];

      if (formData.mediaAttachments && formData.mediaAttachments.length > 0) {
        uploadedMedia = await uploadFiles(formData.mediaAttachments);
      }

      const backendPayload = {
        ...formData,
        mediaAttachments: uploadedMedia,
      };

      const response = await $apiFetch("/api/maintenance/student/createRequest", {
        method: "POST",
        body: backendPayload,
      });

      await refreshNuxtData(maintenanceDataKey.value);
      await refreshNuxtData(dashboardKey.value);

      toast.add({
        title: "Success",
        description: response.message,
        color: "success",
        icon: "i-lucide-circle-check-big",
      });

      isCreateModalOpen.value = false;
      clearState();
    }
    catch (error) {
      const message = (error as any)?.data?.message;
      toast.add({
        title: "Failed to Create Maintenance",
        description: message,
        color: "error",
        icon: "i-lucide-circle-alert",
        duration: 8000,
      });
    }
    finally {
      isLoading.value = false;
    }
  };

  const editingId = ref<number | null>(null);
  const originalEditState = ref<EditFormState | null>(null);

  const editMaintenanceState = ref<EditFormState>({
    issueType: undefined,
    description: "",
    priority: undefined,
    hostelId: undefined,
    studentId: undefined,
    roomId: undefined,
    mediaAttachments: undefined,
    existingMedia: [],
  });

  const isEditFormValid = computed(() => {
    const { issueType, description, priority, hostelId, studentId, roomId } = editMaintenanceState.value;

    return (
      (issueType?.trim() ?? "") !== ""
      && description?.trim() !== ""
      && (priority?.trim() ?? "") !== ""
      && hostelId !== undefined
      && studentId !== undefined
      && roomId !== undefined
    );
  });

  // const hasNoChanges = computed(() => {
  //   if (!originalEditState.value) return false;

  //   return isDeepEqual(editMaintenanceState.value, originalEditState.value);
  // });

  const initEditSession = (maintenance: MaintenanceType) => {
    editingId.value = maintenance.id;

    const safeMedia = maintenance.mediaAttachments
      ? JSON.parse(JSON.stringify(maintenance.mediaAttachments))
      : [];

    const mappedState: EditFormState = {
      issueType: maintenance.issueType,
      description: maintenance.description,
      priority: maintenance.priority,
      hostelId: maintenance.hostelId,
      studentId: maintenance.studentId,
      roomId: maintenance.roomId,
      existingMedia: safeMedia,
      mediaAttachments: undefined,
    };

    originalEditState.value = { ...mappedState, existingMedia: [...safeMedia] };
    editMaintenanceState.value = { ...mappedState, existingMedia: [...safeMedia] };
  };

  const editMaintenance = async (payload: FormSubmitEvent<EditFormState>) => {
    if (!isEditFormValid.value || !editingId.value) return;

    const formData = payload.data;
    const original = originalEditState.value;
    if (!original) return;

    const changes: Record<string, any> = {};

    for (const key in formData) {
      if (key === "existingMedia" || key === "mediaAttachments") continue;

      const k = key as keyof CreateMaintenanceSchema;
      if (!isDeepEqual(formData[k], original[k])) {
        changes[k] = formData[k];
      }
    }

    const mediaChanged
      = !isDeepEqual(formData.existingMedia, original.existingMedia)
        || (formData.mediaAttachments && formData.mediaAttachments.length > 0);

    if (Object.keys(changes).length === 0 && !mediaChanged) {
      toast.add({
        title: "No Changes Detected",
        description: "Please make changes to the form before submitting.",
        color: "warning",
        icon: "i-lucide-triangle-alert",
      });
      return;
    }

    isLoading.value = true;

    try {
      if (mediaChanged) {
        let uploadedMedia: MediaAttachment[] = [];

        if (formData.mediaAttachments && formData.mediaAttachments.length > 0) {
          uploadedMedia = await uploadFiles(formData.mediaAttachments as File[]);
        }

        changes.mediaAttachments = [...(formData.existingMedia || []), ...uploadedMedia];
      }

      if (!original.studentId) {
        throw new Error("Student ID is required for editing maintenance");
      }

      const backendPayload = {
        maintenanceId: editingId.value,
        studentId: original.studentId,
        data: changes,
      };
      const response = await $apiFetch(`/api/maintenance/student/${editingId.value}`, {
        method: "PATCH",
        body: backendPayload,
      });

      await refreshNuxtData(maintenanceDataKey.value);
      await refreshNuxtData(dashboardKey.value);

      toast.add({
        title: "Maintenance Edited Successfully",
        description: response.message,
        color: "success",
        icon: "i-lucide-circle-check-big",
      });

      clearState();
    }
    catch (error) {
      const message = (error as any)?.data?.message;
      toast.add({
        title: "Failed to Edit Maintenance",
        description: message,
        color: "error",
        icon: "i-lucide-circle-alert",
        duration: 8000,
      });
    }
    finally {
      isLoading.value = false;
    }
  };

  function clearState() {
    maintenanceStatusResponseState.value = {
      responseText: "",
      status: undefined,
    };

    createMaintenanceState.value = {
      issueType: undefined,
      description: "",
      priority: undefined,
      hostelId: undefined,
      studentId: undefined,
      roomId: undefined,
    };

    editingId.value = null;
    originalEditState.value = null;
    editMaintenanceState.value = {
      issueType: undefined,
      description: "",
      priority: undefined,
      hostelId: undefined,
      studentId: undefined,
      roomId: undefined,
      existingMedia: [],
      mediaAttachments: undefined,
    };
  };

  const handleFormError = (event: FormErrorEvent) => {
    const messages = event.errors.map(e => e.message).join(", ");
    toast.add({
      title: "Form Validation Error",
      description: messages,
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  };

  return {
    isLoading,
    isModalOpen,
    isUpdateFormValid,
    isAddResponseFormValid,
    maintenanceStatusResponseState,
    createMaintenanceState,
    isCreateModalOpen,
    editMaintenanceState,
    editingId,
    updateStatusAndAddResponse,
    addMaintenanceResponse,
    clearState,
    createMaintenance,
    initEditSession,
    editMaintenance,
    handleFormError,
  };
});

if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useMaintenanceStore, import.meta.hot));
