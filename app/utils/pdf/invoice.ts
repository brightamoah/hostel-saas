import type { BrandingContext } from "./types";
import { jsPDF as JSPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BG_COLOR,
  BORDER_COLOR,
  DEFAULT_FONT,
  GRAY_COLOR,
  paymentStatusColorMapPdf,
  // primaryHex,
  STATUS_COLORS,
  TEXT_COLOR,
} from "./constants";
import {
  fetchImageAsBase64,
  // fmt,
  formatDate,
  formatMoney,
  getDaysDifference,
  resolveColorToHex,
} from "./helpers";

export async function generateInvoicePDF(
  billing: Billing,
  paymentContext?: { bankName?: string; accountNumber?: string; supportPhone?: string },
  branding?: BrandingContext,
): Promise<Blob> {
  const hSettings = billing?.hostel?.settings;
  const cSettings = billing?.company?.settings;

  const bName = billing?.hostel?.name || billing?.company?.name || branding?.name || "Kayanest";
  const bAddress = (billing?.hostel?.address || branding?.address || "Address not provided").replace(/[\r\n]+/g, ", ");
  const bLogoUrl = hSettings?.logoUrl || cSettings?.logoUrl || billing?.hostel?.logoUrl || branding?.logoUrl;
  const bPrimaryColor = hSettings?.primaryColor || cSettings?.primaryColor || billing?.hostel?.primaryColor || branding?.primaryColor;
  const bSupportEmail = hSettings?.supportEmail || cSettings?.supportEmail || billing?.hostel?.email || branding?.supportEmail || "support@kayanest.com";
  const bSupportPhone = hSettings?.supportPhone || cSettings?.supportPhone || billing?.hostel?.contactNumber || branding?.supportPhone || "";

  const logoData = bLogoUrl ? await fetchImageAsBase64(bLogoUrl) : null;
  const primaryHex = resolveColorToHex(bPrimaryColor);

  return new Promise((resolve) => {
    const doc = new JSPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const PAGE_WIDTH = doc.internal.pageSize.width;
    const PAGE_HEIGHT = doc.internal.pageSize.height;
    const MARGIN = 15;
    let y = 20;

    // Header
    const businessName = bName;
    const address = bAddress;
    const supportEmail = bSupportEmail;
    const supportPhone = bSupportPhone;

    if (logoData) {
      doc.addImage(logoData, "PNG", MARGIN, y, 20, 20, undefined, "FAST");
    }

    const textX = logoData ? MARGIN + 25 : MARGIN;
    let rightY = y + 4;
    let textY = y + 8;

    // Left side
    doc.setFont(DEFAULT_FONT, "bold");
    doc.setFontSize(18);
    doc.setTextColor(primaryHex);
    doc.text(businessName, textX, textY);

    textY += 6;
    doc.setFont(DEFAULT_FONT, "normal");
    doc.setFontSize(10);
    doc.setTextColor(GRAY_COLOR);
    doc.text(address, textX, textY);

    textY += 5;
    if (supportEmail || supportPhone) {
      doc.text(`${supportEmail} ${supportPhone ? `| ${supportPhone}` : ""}`, textX, textY);
    }

    // Right side (Invoice details)
    const invoiceLabel = billing.invoiceNumber || `INV-${String(billing.id).padStart(6, "0")}`;

    const blockX = PAGE_WIDTH - MARGIN - 65;
    const valueOffset = 22;

    doc.setFontSize(14);
    doc.setFont(DEFAULT_FONT, "bold");
    doc.setTextColor(TEXT_COLOR);
    doc.text("Invoice ID: ", blockX, rightY);
    const idWidth = doc.getTextWidth("Invoice ID: ");

    doc.setTextColor(primaryHex);
    doc.text(invoiceLabel, blockX + idWidth, rightY);

    rightY += 6;
    doc.setFontSize(10);
    doc.setTextColor(GRAY_COLOR);
    doc.setFont(DEFAULT_FONT, "normal");
    doc.text("Date Issued:", blockX, rightY);
    doc.text(formatDate(billing.dateIssued), blockX + valueOffset, rightY);

    rightY += 6;
    doc.text("Due Date:", blockX, rightY);
    doc.text(formatDate(billing.dueDate), blockX + 18, rightY);

    rightY += 6;
    doc.text("Status:", blockX, rightY);

    const statusKey = billing.status?.toLowerCase();
    const statusHex = STATUS_COLORS[statusKey] || TEXT_COLOR;
    const statusText = billing.status?.toUpperCase() || "UNPAID";

    // Set font to bold before measuring so the box width is accurate
    doc.setFont(DEFAULT_FONT, "bold");
    // const statusBoxWidth = doc.getTextWidth(statusText) + 6;

    doc.setDrawColor(statusHex);
    doc.setFillColor(BG_COLOR);
    // doc.roundedRect(blockX + valueOffset, rightY - 4, statusBoxWidth, 6, 1, 1, "D");
    doc.setTextColor(statusHex);

    // Centered inside the dynamically growing box
    doc.text(statusText, blockX + valueOffset + 4, rightY, { align: "center" });

    rightY += 6;
    doc.setTextColor(GRAY_COLOR);
    doc.setFont(DEFAULT_FONT, "normal");
    doc.text("Period:", blockX, rightY);
    doc.text(capitalizeWords(billing.academicPeriod || "N/A"), blockX + 13, rightY);

    y = Math.max(textY, rightY) + 8;

    doc.setDrawColor(primaryHex);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

    // Billed To & From
    y += 8;
    const boxHeight = 35;
    const boxWidth = (PAGE_WIDTH - (MARGIN * 2) - 10) / 2;

    // Left Box (Billed To)
    doc.setFillColor(BG_COLOR);
    doc.setDrawColor(primaryHex);
    doc.rect(MARGIN, y, boxWidth, boxHeight, "F");
    doc.setFillColor(primaryHex);
    doc.rect(MARGIN, y, 1.5, boxHeight, "F");

    let boxY = y + 8;
    const boxX = MARGIN + 6;

    doc.setFont(DEFAULT_FONT, "bold");
    doc.setTextColor(primaryHex);
    doc.text("Billed To:", boxX, boxY);

    boxY += 6;
    doc.setTextColor(TEXT_COLOR);
    doc.setFontSize(10);
    doc.text(billing.student?.user?.name?.toUpperCase() || "Unknown Student", boxX, boxY);

    boxY += 6;
    doc.setFontSize(9);
    doc.setFont(DEFAULT_FONT, "normal");
    doc.setTextColor(GRAY_COLOR);
    doc.text(`Email: ${billing.student?.user?.email || "N/A"}`, boxX, boxY);
    boxY += 5;
    doc.text(`Phone: ${billing.student?.phoneNumber || "N/A"}`, boxX, boxY);
    boxY += 5;

    const sAddress = (billing.student?.address || "Address not provided").replace(/[\r\n]+/g, ", ");
    const sAddrLines = doc.splitTextToSize(`Address: ${sAddress}`, boxWidth - 5);
    doc.text(sAddrLines.slice(0, 2), boxX, boxY);

    // Right Box (From)
    const rightBoxX = MARGIN + boxWidth + 10;
    doc.setFillColor(BG_COLOR);
    doc.setDrawColor(primaryHex);
    doc.rect(rightBoxX, y, boxWidth, boxHeight, "F");
    doc.setFillColor(primaryHex);
    doc.rect(rightBoxX, y, 1.5, boxHeight, "F");

    let rightBoxY = y + 8;
    const rightTextX = rightBoxX + 6;

    doc.setFont(DEFAULT_FONT, "bold");
    doc.setTextColor(primaryHex);
    doc.text("From:", rightTextX, rightBoxY);

    rightBoxY += 6;
    doc.setTextColor(TEXT_COLOR);
    doc.setFontSize(10);
    doc.text(bName.toUpperCase(), rightTextX, rightBoxY);

    rightBoxY += 6;
    doc.setFontSize(9);
    doc.setFont(DEFAULT_FONT, "normal");
    doc.setTextColor(GRAY_COLOR);

    doc.text(`Email: ${bSupportEmail}`, rightTextX, rightBoxY);
    rightBoxY += 5;
    doc.text(`Phone: ${bSupportPhone || "N/A"}`, rightTextX, rightBoxY);
    rightBoxY += 5;

    const bAddrLines = doc.splitTextToSize(`Address: ${bAddress}`, boxWidth - 10);
    doc.text(bAddrLines.slice(0, 2), rightTextX, rightBoxY);

    y += boxHeight + 8;

    // Table
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
      headStyles: { fillColor: primaryHex, textColor: 255, fontStyle: "bold", halign: "left" },
      columnStyles: {
        0: { cellWidth: 15, halign: "center" },
        2: { cellWidth: 40, halign: "right" },
      },
      styles: { fontSize: 10, cellPadding: 3, lineColor: [222, 226, 230], lineWidth: 0.1 },
      margin: { left: MARGIN, right: MARGIN },
    });

    // @ts-expect-error: lastAutoTable is added by jspdf-autotable at runtime
    y = doc.lastAutoTable.finalY + 8;

    // Totals
    const rightColLabelX = 140;
    const rightColValueX = 195;

    doc.setFontSize(10);

    const addRow = (label: string, value: string, isBold = false, color = TEXT_COLOR, borderTop = false) => {
      if (borderTop) {
        doc.setDrawColor(primaryHex);
        doc.line(rightColLabelX, y - 4, PAGE_WIDTH - MARGIN, y - 4);
      }

      doc.setTextColor(GRAY_COLOR);
      doc.setFont(DEFAULT_FONT, "bold");
      doc.text(label, rightColLabelX, y);

      doc.setTextColor(color);
      doc.setFont(DEFAULT_FONT, isBold ? "bold" : "normal");
      doc.text(value, rightColValueX, y, { align: "right" });
      y += 6;
    };

    addRow("Subtotal:", formatMoney(subtotal));
    addRow("Tax (0%):", formatMoney(0));
    y += 2;
    addRow("Total:", formatMoney(total), true, TEXT_COLOR, true);
    addRow("Amount Paid:", formatMoney(paid), true, STATUS_COLORS["fully paid"]);
    addRow("Balance Due:", formatMoney(balance), true, STATUS_COLORS.overdue);

    // Payment Info
    y += 6;
    doc.setFillColor(BG_COLOR);
    doc.setDrawColor(BORDER_COLOR);
    doc.rect(MARGIN, y, PAGE_WIDTH - (MARGIN * 2), 28, "FD");

    let payY = y + 7;
    const payX = MARGIN + 5;

    doc.setTextColor(primaryHex);
    doc.setFont(DEFAULT_FONT, "bold");
    doc.setFontSize(11);
    doc.text("Payment Information", payX, payY);

    payY += 6;
    doc.setFontSize(9);
    doc.setTextColor(TEXT_COLOR);

    doc.setFont(DEFAULT_FONT, "bold");
    doc.text("Bank Name:", payX, payY);
    doc.setFont(DEFAULT_FONT, "normal");
    doc.text(paymentContext?.bankName || "N/A", payX + 20, payY);

    const acctNum = paymentContext?.accountNumber || "N/A";

    doc.setFont(DEFAULT_FONT, "bold");
    doc.text("Account No:", payX + 90, payY);
    doc.setFont(DEFAULT_FONT, "normal");
    doc.text(acctNum, payX + 111, payY);

    payY += 5;
    doc.setFont(DEFAULT_FONT, "bold");
    doc.text("Account Name:", payX, payY);
    doc.setFont(DEFAULT_FONT, "normal");
    doc.text(billing.hostel?.name || "Kayanest", payX + 25, payY);

    doc.setFont(DEFAULT_FONT, "bold");
    doc.text("Support Contact:", payX + 90, payY);
    doc.setFont(DEFAULT_FONT, "normal");
    doc.text(paymentContext?.supportPhone || "N/A", payX + 118, payY);

    y += 38;

    // Transaction History
    doc.setTextColor(primaryHex);
    doc.setFontSize(11);
    doc.setFont(DEFAULT_FONT, "bold");
    doc.text("Transaction History", MARGIN, y);

    if (billing.payments && billing.payments.length > 0) {
      const paymentRows = billing.payments.map((p: any) => {
        const status = (p.status || "pending").toLowerCase();
        return [
          formatDate(p.paymentDate),
          p.paymentMethod.replace("_", " ").toUpperCase(),
          formatMoney(p.amount),
          {
            content: status.toUpperCase(),
            styles: {
              textColor: paymentStatusColorMapPdf[status] || TEXT_COLOR,
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
      doc.setFont(DEFAULT_FONT, "italic");
      doc.setFontSize(9);
      doc.setTextColor(GRAY_COLOR);
      doc.text("No payment transactions recorded", PAGE_WIDTH / 2, y + 8, { align: "center" });
      y += 20;
    }

    // Terms & Conditions
    const BOTTOM_MARGIN = 15;
    const TERMS_LINE_HEIGHT = 4.5;
    const TERMS_PADDING_TOP = 7;
    const TERMS_PADDING_BOTTOM = 6;

    const dueInDays = getDaysDifference(billing.dateIssued, billing.dueDate);

    const terms = [
      `1. Payment is due within ${dueInDays} days of invoice date.`,
      "2. Late payments will incur a 5% penalty fee.",
      "3. No refunds will be issued after the academic term begins.",
      "4. For any payment inquiries, please contact our billing department.",
    ];

    const wrappedTerms = terms.map(term =>
      doc.splitTextToSize(term, PAGE_WIDTH - (MARGIN * 2) - 10),
    );

    const contentHeight = TERMS_PADDING_TOP + 6 + wrappedTerms.flat().length * TERMS_LINE_HEIGHT + TERMS_PADDING_BOTTOM;

    if (y + contentHeight > PAGE_HEIGHT - BOTTOM_MARGIN) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(BG_COLOR);
    doc.setDrawColor(BORDER_COLOR);
    doc.rect(MARGIN, y, PAGE_WIDTH - (MARGIN * 2), contentHeight, "FD");

    y += TERMS_PADDING_TOP;
    doc.setTextColor(primaryHex);
    doc.setFont(DEFAULT_FONT, "bold");
    doc.setFontSize(11);
    doc.text("Terms & Conditions", MARGIN + 5, y);

    y += 6;
    doc.setTextColor(TEXT_COLOR);
    doc.setFont(DEFAULT_FONT, "normal");
    doc.setFontSize(8);

    wrappedTerms.forEach((lines) => {
      lines.forEach((line: string) => {
        y += TERMS_LINE_HEIGHT;
        doc.text(line, MARGIN + 5, y);
      });
    });

    y += 10;

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setFont(DEFAULT_FONT, "normal");
      doc.setTextColor(GRAY_COLOR);

      doc.text(`Generated: ${formatDate(new Date())}`, PAGE_WIDTH - MARGIN, 8, { align: "right" });

      const invoiceLabel = billing.invoiceNumber || `INV-${String(billing.id).padStart(6, "0")}`;
      doc.text(`Invoice: ${invoiceLabel}`, MARGIN, PAGE_HEIGHT - 5);

      doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 5, { align: "center" });

      doc.text(businessName, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 5, { align: "right" });
    }

    resolve(doc.output("blob"));
  });
}
