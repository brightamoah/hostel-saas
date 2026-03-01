export function useTogglePasswordField() {
  const passwordFieldType = ref<"text" | "password">("password");
  const confirmPasswordFieldType = ref<"text" | "password">("password");

  const togglePasswordFieldType = () => {
    passwordFieldType.value = passwordFieldType.value === "password" ? "text" : "password";
  };

  const toggleConfirmPasswordFieldType = () => {
    confirmPasswordFieldType.value
      = confirmPasswordFieldType.value === "password" ? "text" : "password";
  };

  return {
    passwordFieldType,
    confirmPasswordFieldType,
    togglePasswordFieldType,
    toggleConfirmPasswordFieldType,
  };
}
