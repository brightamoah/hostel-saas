export async function useWorkerMailer() {
  const { WorkerMailer } = await import("worker-mailer");

  const runtimeConfig = useRuntimeConfig();

  const mailer = await WorkerMailer.connect({
    credentials: {
      username: runtimeConfig.nodemailerAuthUser,
      password: runtimeConfig.nodemailerAuthPass,
    },
    authType: ["plain", "login"],
    host: runtimeConfig.nodemailerHost,
    port: Number(runtimeConfig.nodemailerPort),
    secure: true,
  });

  return mailer;
}
