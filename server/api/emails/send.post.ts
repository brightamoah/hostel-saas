import { z } from "zod";

// Define which templates are allowed to be rendered from the client
const ALLOWED_TEMPLATES = ["welcome", "PasswordResetEmail", "verifyEmail"];

const bodySchema = z.object({
  name: z.string().refine(name => ALLOWED_TEMPLATES.includes(name), {
    message: "Invalid template name",
  }),
  props: z.record(z.string(), z.any()).optional(),
  to: z.email().optional(), // Adding 'to' for testing purposes
});

export default defineEventHandler(async (event) => {
  // Add your own authentication/authorization logic here
  // const user = await requireUser(event)

  const { name, props, to } = await readValidatedBody(event, bodySchema.parse);

  const result = await renderEmailComponent(name, props, {
    pretty: true,
  });

  const finalHtml = typeof result === "string" ? result : result.html;
  const finalSubject = typeof result === "string" ? `Test from Nuxt Email Renderer: ${name}` : result.subject;

  if (import.meta.dev) {
    const { sendMail } = useNodeMailer();
    await sendMail({
      to,
      subject: finalSubject,
      html: finalHtml,
    });
  }

  return { success: true, html: finalHtml };
});
