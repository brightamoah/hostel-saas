import {
  divider,
  escapeHtml,
  heading,
  infoRow,
  infoTable,
  shell,
  smallNote,
  subtext,
} from "./emailTemplate";

// ─── Reminder-specific component ────────────────────────────────────────────

function balanceDue(amountDue: string, isOverdue: boolean): string {
  const bg = isOverdue ? "#dc3545" : "#3d8582";
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
    <tr>
      <td style="background-color:${bg};border-radius:6px;padding:14px 16px;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff;opacity:0.85;">Balance Due</p>
        <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#ffffff;">${amountDue}</p>
      </td>
    </tr>
  </table>`;
}

// ─── Template ────────────────────────────────────────────────────────────────

export function getReminderEmailTemplate(
  studentName: string,
  invoiceNumber: string,
  dateIssued: string,
  dateDue: string,
  amountTotal: string,
  amountPaid: string,
  amountDue: string,
  hostelName: string,
  hostelEmail: string = "support@kayanest.app",
  hostelPhone: string = "+233 54 968 4848",
  hostelAddress: string = "University Campus, Accra, Ghana",
  isOverdue: boolean = false,
) {
  const reminderTitle = isOverdue ? "Overdue payment reminder" : "Upcoming payment reminder";
  const greetingText = isOverdue
    ? "This is a polite reminder that your payment for the following invoice is currently overdue. Please arrange payment as soon as possible to avoid any late fees or disruptions."
    : "This is a friendly reminder that your payment for the following invoice is due soon. Please ensure payment is made by the due date.";

  const safeStudentName = escapeHtml(studentName);

  const rows = [
    infoRow("Invoice No.", escapeHtml(invoiceNumber), true),
    infoRow("Date issued", escapeHtml(dateIssued)),
    infoRow("Due date", escapeHtml(dateDue)),
    infoRow("Total amount", escapeHtml(amountTotal)),
    infoRow("Amount paid", escapeHtml(amountPaid)),
  ].join("\n");

  const bodyContent = `
    ${heading(reminderTitle)}
    ${subtext(`Hi <b>${safeStudentName}</b>, ${greetingText}`)}
    ${infoTable(rows)}
    ${balanceDue(escapeHtml(amountDue), isOverdue)}
    ${divider()}
    <p style="margin:0 0 16px;font-size:14px;color:#4b5563;line-height:1.7;">Please log in to your student portal to complete the payment securely online.</p>
    ${smallNote(`Already paid or need help? Contact us at <a href="mailto:${escapeHtml(hostelEmail)}" style="color:#3d8582;text-decoration:none;">${escapeHtml(hostelEmail)}</a> or call ${escapeHtml(hostelPhone)}.`)}
  `;

  const htmlTemplate = shell(bodyContent, `${reminderTitle} — Invoice #${invoiceNumber}`, hostelName);

  const textTemplate = `
${hostelName} — ${reminderTitle}
==============================================

Dear ${studentName},

${greetingText}

INVOICE DETAILS
---------------
Invoice No:    ${invoiceNumber}
Date Issued:   ${dateIssued}
Due Date:      ${dateDue}
Total Amount:  ${amountTotal}
Amount Paid:   ${amountPaid}

BALANCE DUE:   ${amountDue}
---------------

How to Pay:
Please log in to your student portal to complete the payment securely online.

If you have already made this payment or need assistance, please contact us.
Thank you.

--
${hostelName}
${hostelAddress}
Phone: ${hostelPhone}
Email: ${hostelEmail}

This is an automated message. Please do not reply directly to this email unless you need support.
  `.trim();

  return { htmlTemplate, textTemplate, emailSubject: `${reminderTitle} — Invoice #${invoiceNumber}` };
}
