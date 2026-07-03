// Simple HTML escape utility for XSS prevention in email templates
// Escapes &, <, >, ", and '
import type { User } from "#auth-utils";

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Drake palette — hex equivalents of OKLCH values for email client compatibility.
 * Email clients do not support oklch(), so we use pre-converted hex values.
 *
 * drake-50  #e9f4f3  — lightest tint (background washes)
 * drake-100 #d1e8e6  — light tint (dividers, subtle fills)
 * drake-600 #3d8582  — mid tone (button bg, accents)
 * drake-800 #265757  — dark (headings)
 * drake-950 #112c2c  — darkest (footer text)
 */

// ─── Shared layout shell ────────────────────────────────────────────────────

export function shell(content: string, previewText: string, hostelName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${previewText}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f0;font-family:Arial,Helvetica,sans-serif;">

  <span style="display:none;max-height:0;overflow:hidden;">${previewText}</span>

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f0;">
    <tr>
      <td align="center" style="padding:24px 12px;">

        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:6px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#265757;padding:14px 20px;">
              <p style="margin:0;font-size:13px;font-weight:600;color:#d1e8e6;letter-spacing:0.05em;">
                ${hostelName.toUpperCase()}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:18px 22px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #e9f4f3;padding:14px 22px;background:#fafafa;">
              <p style="margin:0;font-size:11px;color:#6b7280;">
                If you didn’t request this, you can ignore this email.
              </p>
              <p style="margin:6px 0 0;font-size:10px;color:#9ca3af;">
                © ${new Date().getFullYear()} ${hostelName}
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Shared components ───────────────────────────────────────────────────────

export function heading(text: string): string {
  return `<h1 style="margin:0 0 3px;font-size:20px;font-weight:600;color:#265757;letter-spacing:-0.01em;line-height:1.3;">${text}</h1>`;
}

export function subtext(text: string): string {
  return `<p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.7;">${text}</p>`;
}

export function divider(): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:15px 0;">
    <tr><td style="height:1px;background-color:#e9f4f3;"></td></tr>
  </table>`;
}

export function primaryButton(label: string, url: string): string {
  // Only allow http(s) URLs, fallback to '#'
  let safeUrl = "#";
  try {
    const parsed = new URL(url, "http://dummy-base");
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      // Remove dangerous characters from href
      safeUrl = escapeHtml(url);
    }
  }
  catch {
    // fallback to '#'
  }
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
    <tr>
      <td style="background-color:#3d8582;border-radius:6px;">
        <a href="${safeUrl}" style="display:inline-block;padding:10px 13px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">${label}</a>
      </td>
    </tr>
  </table>`;
}

export function codeBlock(text: string): string {
  return `<p style="margin:16px 0;background-color:#e9f4f3;border-radius:4px;padding:12px 14px;font-family:'Courier New',Courier,monospace;font-size:13px;color:#265757;word-break:break-all;line-height:1.6;">${text}</p>`;
}

export function infoRow(label: string, value: string, mono = false): string {
  const valueStyle = mono
    ? `font-family:'Courier New',Courier,monospace;font-size:14px;color:#265757;font-weight:600;`
    : `font-size:14px;color:#1f2937;`;
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #e9f4f3;font-size:13px;color:#6b7280;width:38%;">${label}</td>
    <td style="padding:10px 0;border-bottom:1px solid #e9f4f3;${valueStyle}">${value}</td>
  </tr>`;
}

export function infoTable(rows: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 28px;">
    ${rows}
  </table>`;
}

export function smallNote(text: string): string {
  return `<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.7;">${text}</p>`;
}

// ─── Templates ───────────────────────────────────────────────────────────────

export function getEmailTemplate(
  verificationUrl: string,
  user: Omit<User, "lastLogin" | "role">,
  hostelName: string,
) {
  const safeUserName = escapeHtml(user.name);
  const bodyContent = `
    ${heading("Verify your email address")}
    ${subtext(`Hi <b>${safeUserName}</b>, thanks for signing up. Please confirm your email address to activate your account.`)}
    ${primaryButton("Verify email address", verificationUrl)}
    <p style="margin:0 0 0px;font-size:13px;color:#6b7280;">Or copy this link into your browser:</p>
    ${codeBlock(verificationUrl)}
    ${divider()}
    ${smallNote("This link expires in <strong>10 minutes</strong>. If you didn't create an account, no action is needed.")}
  `;

  const htmlTemplate = shell(bodyContent, "Verify your email", hostelName);

  const textTemplate = `
KayaNest — Verify your email address

Hi ${user.name},

Thanks for signing up. Please verify your email address by visiting the link below:

${verificationUrl}

This link expires in 10 minutes.

If you didn't create an account, you can safely ignore this email.

— The ${hostelName} Team
  `.trim();

  return { htmlTemplate, textTemplate };
}

export function getResetPasswordTemplate(resetUrl: string, userName: string, hostelName: string) {
  const safeUserName = escapeHtml(userName);
  const bodyContent = `
    ${heading("Reset your password")}
    ${subtext(`Hi <b>${safeUserName}</b>, we received a request to reset the password for your KayaNest account.`)}
    ${primaryButton("Reset password", resetUrl)}
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Or copy this link into your browser:</p>
    ${codeBlock(resetUrl)}
    ${divider()}
    ${smallNote("This link expires in <strong>10 minutes</strong>. If you didn't request a password reset, please ignore this email — your password will remain unchanged.")}
  `;

  const html = shell(bodyContent, "Reset your password", hostelName);

  const text = `
KayaNest — Reset your password

Hi ${userName},

We received a request to reset your password. Visit the link below to set a new one:

${resetUrl}

This link expires in 10 minutes. If you didn't request this, ignore this email.

— The ${hostelName} Team
  `.trim();

  return { html, text };
}

export function getWelcomeAdminTemplate(
  adminName: string,
  adminEmail: string,
  tempPassword: string,
  hostelName: string,
  baseurl: string,
) {
  const rows = [
    infoRow("Email address", adminEmail),
    infoRow("Temporary password", tempPassword, true),
  ].join("\n");

  // Ensure baseurl does not end with a slash to avoid double slashes in the URL
  const normalizedBaseUrl = baseurl.replace(/\/+$/, "");
  const safeAdminName = escapeHtml(adminName);
  const bodyContent = `
    ${heading("Your admin account is ready")}
    ${subtext(`Hi <b>${safeAdminName}</b>, your administrator account for KayaNest has been created. Use the credentials below to sign in.`)}
    ${infoTable(rows)}
    ${primaryButton("LogIn To Your Account", `${normalizedBaseUrl}/auth/login`)}
    ${divider()}
    ${smallNote("For security, please <strong>change your password immediately</strong> after your first sign-in. Do not share these credentials with anyone.")}
  `;

  const html = shell(bodyContent, "Your admin account is ready", hostelName);

  const text = `
KayaNest — Your admin account is ready

Hi ${adminName},

Your administrator account has been created.

Email:              ${adminEmail}
Temporary password: ${tempPassword}

Please sign in and change your password immediately.

— The ${hostelName} Team
  `.trim();

  return { html, text };
}

export function getBillingTemplate(params: {
  studentName: string;
  hostelName: string;
  amount: string;
  purpose: string;
  dueDate: string;
  invoiceNumber: string;
  dashboardUrl: string;
  supportEmail: string;
}) {
  const {
    studentName,
    hostelName,
    amount,
    purpose,
    dueDate,
    dashboardUrl,
    invoiceNumber = `INV-${Math.floor(Math.random() * 900000 + 100000)}`,
    supportEmail = "support@kayanest.app",
  } = params;

  // Standalone detail table — full background, clear label/value contrast
  const detailTable = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="margin:0 0 28px;border-radius:8px;border:1px solid #d1e8e6;overflow:hidden;">
      <thead>
        <tr style="background-color:#265757;">
          <th style="padding:10px 16px;font-size:11px;font-weight:600;letter-spacing:0.08em;
            text-transform:uppercase;color:#96c8c5;text-align:left;">Invoice Detail</th>
          <th style="padding:10px 16px;font-size:11px;font-weight:600;letter-spacing:0.08em;
            text-transform:uppercase;color:#96c8c5;text-align:right;">&nbsp;</th>
        </tr>
      </thead>
      <tbody>
      <tr style="background-color:#ffffff;">
          <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Invoice Number</td>
          <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#265757;text-align:right;">${invoiceNumber}</td>
        </tr>
       <tr style="background-color:#ffffff;">
          <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Amount</td>
          <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#265757;text-align:right;">${amount}</td>
        </tr>
        <tr style="background-color:#f9fafa;">
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e9f4f3;">Purpose</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#265757;text-align:right;border-bottom:1px solid #e9f4f3;">${purpose}</td>
        </tr>
        <tr style="background-color:#ffffff;">
          <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e9f4f3;">Hostel</td>
          <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#265757;text-align:right;border-bottom:1px solid #e9f4f3;">${hostelName}</td>
        </tr>
       
      </tbody>
    </table>`;

  const bodyContent = `
    ${heading("You have a new invoice")}
    ${subtext(`Hi ${studentName}, an invoice has been raised for your stay at ${hostelName}.`)}
    ${detailTable}
    ${primaryButton("View & pay invoice", dashboardUrl)}
    ${divider()}
    ${smallNote(`If you think this was raised in error, contact us at <a href="mailto:${supportEmail}" style="color:#3d8582;text-decoration:none;">${supportEmail}</a>.`)}
  `;

  const html = shell(bodyContent, `Invoice for ${amount} — ${hostelName}`, hostelName);

  const text = `
Invoice for ${amount} — ${hostelName}

Hi ${studentName},

Amount due: ${amount}
Due by:     ${dueDate}
Hostel:     ${hostelName}
Purpose:    ${purpose}

Pay online: ${dashboardUrl}

Raised in error? Contact us at ${supportEmail}

— ${hostelName}
  `.trim();

  return { html, text };
}
