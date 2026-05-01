import { clearIdentity, setIdentity } from "evlog/client";

export default defineNuxtRouteMiddleware(() => {
  const { user } = usePortalUserSession();

  if (user.value) setIdentity({ userId: user.value.id, email: user.value.email });

  else clearIdentity();
});
