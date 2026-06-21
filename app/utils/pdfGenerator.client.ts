import { useDateFormat } from "@vueuse/core";
import { jsPDF as JSPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const PRIMARY_COLOR = "#214d49";
const TEXT_COLOR = "#333333";
const GRAY_COLOR = "#666666";
const BG_COLOR = "#f8f9fa";
const BORDER_COLOR = "#dee2e6";

const STATUS_COLORS: Record<string, string> = {
  "fully paid": "#16a34a",
  "partially paid": "#d97706",
  "unpaid": "#333333",
  "overdue": "#dc2626",
  "cancelled": "#6b7280",
};

const paymentStatusColorMap: Record<string, string> = {
  completed: "#16a34a",
  failed: "#dc2626",
  pending: "#d97706",
  refunded: "#6b7280",
};

function formatMoney(amount: number | string) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    currencyDisplay: "code",
  }).format(Number(amount));
}

function formatDate(date: Date | string | null) {
  if (!date) return "N/A";
  return useDateFormat(date, "dddd, MMMM D, YYYY").value;
}

function getDaysDifference(start: Date | string, end: Date | string) {
  if (start == null || end == null) return 30;
  const date1 = new Date(start);
  const date2 = new Date(end);
  if (Number.isNaN(date1.getTime()) || Number.isNaN(date2.getTime())) return 30;
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function generateInvoicePDF(
  billing: Billing,
  paymentContext?: { bankName?: string; accountNumber?: string; supportPhone?: string },
): Promise<Blob> {
  return new Promise((resolve) => {
    const doc = new JSPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const PAGE_WIDTH = doc.internal.pageSize.width;
    const MARGIN = 15;
    let y = 20;

    // --- 1. Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(PRIMARY_COLOR);
    doc.text(billing.hostel?.name || "Kayanest", PAGE_WIDTH / 2, y, { align: "center" });

    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(GRAY_COLOR);
    doc.text(billing.hostel?.address || "University Campus, Accra, Ghana", PAGE_WIDTH / 2, y, { align: "center" });

    y += 5;
    doc.text(`${billing.hostel?.email || "support@kayanest.com"} | ${billing.hostel?.contactNumber || ""}`, PAGE_WIDTH / 2, y, { align: "center" });

    y += 8;
    doc.setDrawColor(PRIMARY_COLOR);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

    // 2. Meta Data
    y += 10;
    const col2X = PAGE_WIDTH / 2 + 10;
    const labelOffset = 18;

    doc.setFontSize(10);
    doc.setTextColor(TEXT_COLOR);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE ID:", MARGIN, y);
    doc.setTextColor(TEXT_COLOR);
    doc.setFont("helvetica", "normal");
    doc.text(billing.invoiceNumber || `INV-${String(billing.id).padStart(6, "0")}`, MARGIN + 25, y);

    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Date Issued:", MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(billing.dateIssued), MARGIN + 25, y);

    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Due Date:", MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(billing.dueDate), MARGIN + 25, y);

    y -= 12; // Reset for Right Col

    // Status Logic
    doc.setFont("helvetica", "bold");
    doc.setTextColor(TEXT_COLOR);
    doc.text("Status:", col2X, y);

    const statusKey = billing.status?.toLowerCase();
    const statusHex = STATUS_COLORS[statusKey] || TEXT_COLOR;
    doc.setTextColor(statusHex);
    doc.text(billing.status?.toUpperCase() || "UNPAID", col2X + labelOffset, y);

    y += 6;
    doc.setTextColor(TEXT_COLOR);
    doc.setFont("helvetica", "bold");
    doc.text("Period:", col2X, y);
    doc.setFont("helvetica", "normal");
    doc.text(capitalizeWords(billing.academicPeriod || "N/A"), col2X + labelOffset, y);

    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Purpose:", col2X, y);
    doc.setFont("helvetica", "normal");
    doc.text(capitalizeWords(billing.type || "Hostel Fee"), col2X + labelOffset, y);

    // 3. Billed To
    y += 8;
    const boxHeight = 42;
    doc.setFillColor(BG_COLOR);
    doc.setDrawColor(PRIMARY_COLOR);
    doc.rect(MARGIN, y, PAGE_WIDTH - (MARGIN * 2), boxHeight, "F");
    doc.setFillColor(PRIMARY_COLOR);
    doc.rect(MARGIN, y, 1.5, boxHeight, "F");

    let boxY = y + 10;
    const boxX = MARGIN + 8;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(PRIMARY_COLOR);
    doc.text("Billed To:", boxX, boxY);

    boxY += 8;
    doc.setTextColor(TEXT_COLOR);
    doc.setFontSize(11);
    doc.text(billing.student?.user?.name?.toUpperCase() || "Unknown Student", boxX, boxY);

    boxY += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(GRAY_COLOR);
    doc.text(`Student ID: ${billing.student?.id || "N/A"}`, boxX, boxY);

    boxY += 5;
    doc.text(`Email: ${billing.student?.user?.email || "N/A"}`, boxX, boxY);
    boxY += 5;
    doc.text(`Phone: ${billing.student?.phoneNumber || "N/A"}`, boxX, boxY);

    y += boxHeight + 8;

    // 4. Table
    const subtotal = Number(billing.amount);
    const lateFee = Number(billing.lateFee || 0);
    const total = subtotal + lateFee;
    const paid = Number(billing.paidAmount || 0);
    const balance = total - paid;

    autoTable(doc, {
      startY: y,
      head: [["#", "Description", "Amount"]],
      body: [
        ["1", billing.description || billing.type || "Hostel Fee", formatMoney(subtotal)],
      ],
      theme: "grid",
      headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: "bold", halign: "left" },
      columnStyles: {
        0: { cellWidth: 15, halign: "center" },
        2: { cellWidth: 40, halign: "right" },
      },
      styles: { fontSize: 10, cellPadding: 3, lineColor: [222, 226, 230], lineWidth: 0.1 },
      margin: { left: MARGIN, right: MARGIN },
    });

    // @ts-expect-error: lastAutoTable is added by jspdf-autotable at runtime, not typed in jsPDF
    y = doc.lastAutoTable.finalY + 8;

    // 5. Totals
    const rightColLabelX = 140;
    const rightColValueX = 195;

    doc.setFontSize(10);

    const addRow = (label: string, value: string, isBold = false, color = TEXT_COLOR, borderTop = false) => {
      if (borderTop) {
        doc.setDrawColor(PRIMARY_COLOR);
        doc.line(rightColLabelX, y - 4, PAGE_WIDTH - MARGIN, y - 4);
      }

      doc.setTextColor(GRAY_COLOR);
      doc.setFont("helvetica", "bold");
      doc.text(label, rightColLabelX, y);

      doc.setTextColor(color);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.text(value, rightColValueX, y, { align: "right" });
      y += 6;
    };

    addRow("Subtotal:", formatMoney(subtotal));
    addRow("Tax (0%):", formatMoney(0));
    y += 2;
    addRow("Total:", formatMoney(total), true, TEXT_COLOR, true);
    addRow("Amount Paid:", formatMoney(paid), true, STATUS_COLORS["fully paid"]);
    addRow("Balance Due:", formatMoney(balance), true, STATUS_COLORS.overdue);

    // 6. Payment Info
    y += 6;
    doc.setFillColor(BG_COLOR);
    doc.setDrawColor(BORDER_COLOR);
    doc.rect(MARGIN, y, PAGE_WIDTH - (MARGIN * 2), 28, "FD");

    let payY = y + 7;
    const payX = MARGIN + 5;

    doc.setTextColor(PRIMARY_COLOR);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Payment Information", payX, payY);

    payY += 6;
    doc.setFontSize(9);
    doc.setTextColor(TEXT_COLOR);

    doc.setFont("helvetica", "bold");
    doc.text("Bank Name:", payX, payY);
    doc.setFont("helvetica", "normal");
    doc.text(paymentContext?.bankName || "N/A", payX + 25, payY);

    // Use actual account number without masking
    const acctNum = paymentContext?.accountNumber || "N/A";

    doc.setFont("helvetica", "bold");
    doc.text("Account No:", payX + 85, payY);
    doc.setFont("helvetica", "normal");
    doc.text(acctNum, payX + 110, payY);

    payY += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Account Name:", payX, payY);
    doc.setFont("helvetica", "normal");
    doc.text(billing.hostel?.name || "Kayanest", payX + 25, payY);

    doc.setFont("helvetica", "bold");
    doc.text("Support Contact:", payX + 85, payY);
    doc.setFont("helvetica", "normal");
    doc.text(paymentContext?.supportPhone || "N/A", payX + 110, payY);

    y += 38;

    // 7. Transaction History
    doc.setTextColor(PRIMARY_COLOR);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Transaction History", MARGIN, y);

    if (billing.payments && billing.payments.length > 0) {
      const paymentRows = billing.payments.map((p: Billing["payments"][0]) => {
        const status = (p.status || "pending").toLowerCase();
        return [
          formatDate(p.paymentDate),
          p.paymentMethod.replace("_", " ").toUpperCase(),
          formatMoney(p.amount),
          {
            content: status.toUpperCase(),
            styles: {
              textColor: paymentStatusColorMap[status] || TEXT_COLOR,
              fontStyle: "bold" as const,
              halign: "left" as const,
            },
          },
          p.transactionReference || "-",
        ];
      });

      autoTable(doc, {
        startY: y + 4,
        head: [["Date", "Payment Method", "Amount", "Status", "Reference"]],
        body: paymentRows,
        theme: "grid",
        headStyles: { fillColor: BG_COLOR, textColor: TEXT_COLOR, fontStyle: "bold", lineColor: BORDER_COLOR, lineWidth: 0.1 },
        columnStyles: { 2: { halign: "right" }, 3: { halign: "center" } },
        styles: { fontSize: 9, lineColor: BORDER_COLOR, lineWidth: 0.1 },
        margin: { left: MARGIN, right: MARGIN },
      });
      // @ts-expect-error: jsPDF autoTable plugin extends doc with lastAutoTable property
      y = doc.lastAutoTable.finalY + 10;
    }
    else {
      y += 4;
      doc.setDrawColor(BORDER_COLOR);
      doc.rect(MARGIN, y, PAGE_WIDTH - (MARGIN * 2), 12);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(GRAY_COLOR);
      doc.text("No payment transactions recorded", PAGE_WIDTH / 2, y + 8, { align: "center" });
      y += 20;
    }

    // Terms & Conditions

    const PAGE_HEIGHT = doc.internal.pageSize.height;
    const BOTTOM_MARGIN = 15;

    const TERMS_LINE_HEIGHT = 4.5;
    const TERMS_PADDING_TOP = 7;
    const TERMS_PADDING_BOTTOM = 6;

    // CALCULATE DAYS
    const dueInDays = getDaysDifference(billing.dateIssued, billing.dueDate);

    const terms = [
      `1. Payment is due within ${dueInDays} days of invoice date.`,
      "2. Late payments will incur a 5% penalty fee.",
      "3. No refunds will be issued after the academic term begins.",
      "4. For any payment inquiries, please contact our billing department.",
    ];

    // Split long text safely (future-proof)
    const wrappedTerms = terms.map(term =>
      doc.splitTextToSize(term, PAGE_WIDTH - (MARGIN * 2) - 10),
    );

    // Calculate dynamic height
    const contentHeight
      = TERMS_PADDING_TOP
        + 6
        + wrappedTerms.flat().length * TERMS_LINE_HEIGHT
        + TERMS_PADDING_BOTTOM;

    if (y + contentHeight > PAGE_HEIGHT - BOTTOM_MARGIN) {
      doc.addPage();
      y = 20;
    }

    // Draw Box
    doc.setFillColor(BG_COLOR);
    doc.setDrawColor(BORDER_COLOR);
    doc.rect(MARGIN, y, PAGE_WIDTH - (MARGIN * 2), contentHeight, "FD");

    y += TERMS_PADDING_TOP;
    doc.setTextColor(PRIMARY_COLOR);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Terms & Conditions", MARGIN + 5, y);

    y += 6;
    doc.setTextColor(TEXT_COLOR);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    wrappedTerms.forEach((lines) => {
      lines.forEach((line: string) => {
        y += TERMS_LINE_HEIGHT;
        doc.text(line, MARGIN + 5, y);
      });
    });

    y += 10;

    resolve(doc.output("blob"));
  });
}
