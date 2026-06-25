import type { BrandingContext, DynamicReportOptions } from "./types";

import { jsPDF as JSPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  BG_COLOR,
  BORDER_COLOR,
  DEFAULT_FONT,
  GRAY_COLOR,
  // primaryHex,
  TEXT_COLOR,
  WHITE,
} from "./constants";
import {
  cellText,
  fetchImageAsBase64,
  fmt,
  formatDate,
  formatMoney,
  resolveColorToHex,
} from "./helpers";

export async function generateDynamicReportPDF({
  title,
  config,
  data,
  hostelName,
  hostelAddress,
  branding,
}: DynamicReportOptions & { branding?: BrandingContext }): Promise<Blob> {
  const logoData = branding?.logoUrl ? await fetchImageAsBase64(branding.logoUrl) : null;
  const primaryHexVal = resolveColorToHex(branding?.primaryColor);
  const businessName = branding?.name || hostelName || "Kayanest";
  const address = branding?.address || hostelAddress || "";

  return new Promise((resolve) => {
    const orientation = config.fields.length > 5 ? "landscape" : "portrait";
    const doc = new JSPDF({ orientation, unit: "mm", format: "a4" });

    const PW = doc.internal.pageSize.width;
    const PH = doc.internal.pageSize.height;
    const MARGIN = 14;
    let y = MARGIN;

    // Logo and business info
    if (logoData) {
      doc.addImage(logoData, "PNG", MARGIN, y, 20, 20, undefined, "FAST");
    }

    const textX = logoData ? MARGIN + 26 : MARGIN;
    const textY = y + 10;

    doc.setFont(DEFAULT_FONT, "bold");
    doc.setFontSize(18);
    doc.setTextColor(primaryHexVal);
    doc.text(businessName, textX, textY);

    if (address) {
      doc.setFont(DEFAULT_FONT, "normal");
      doc.setFontSize(10);
      doc.setTextColor(GRAY_COLOR);
      doc.text(`Location: ${address}`, textX, textY + 8);
    }

    // Header Date
    doc.setFont(DEFAULT_FONT, "normal");
    doc.setFontSize(9);
    doc.setTextColor(GRAY_COLOR);
    doc.text(
      `Generated: ${formatDate(new Date())}`,
      PW - MARGIN,
      textY,
      { align: "right" },
    );

    y = Math.max(y + 20, textY + 8) + 12;

    // Report title
    doc.setFont(DEFAULT_FONT, "bold");
    doc.setFontSize(15);
    doc.setTextColor(primaryHexVal);
    doc.text(title, MARGIN, y);
    y += 7;

    // Meta row
    const metaParts: string[] = [
      `Module: ${capitalizeWords(config.module)}`,
    ];
    if (config.dateRange?.start || config.dateRange?.end) {
      metaParts.push(`Period: ${config.dateRange?.start ?? "N/A"} to ${config.dateRange?.end ?? "N/A"}`);
    }
    if (config.statusFilter?.length) {
      metaParts.push(`Status: ${config.statusFilter.map(status => capitalizeWords(status)).join(", ")}`);
    }
    if (config.sortBy) {
      metaParts.push(`Sorted by: ${config.sortBy} (${config.sortDir})`);
    }

    doc.setFont(DEFAULT_FONT, "normal");
    doc.setFontSize(8);
    doc.setTextColor(GRAY_COLOR);
    const metaString = metaParts.join("  |  ");
    const splitMeta = doc.splitTextToSize(metaString, PW - (MARGIN * 2));
    doc.text(splitMeta, MARGIN, y);
    y += (splitMeta.length * 4);

    // Divider
    doc.setDrawColor(...fmt(primaryHexVal));
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y, PW - MARGIN, y);
    y += 5;

    // Resolve column descriptors
    const allDescriptors = MODULE_FIELDS[config.module as ReportModule] ?? [];
    const descriptors = config.fields
      .map(k => allDescriptors.find(d => d.key === k))
      .filter((d): d is FieldDescriptor => !!d);

    // Table head
    const head = [descriptors.map(d => capitalizeWords(d.label))];

    // Table body
    const body = data.map(row =>
      descriptors.map((d) => {
        const raw = row[d.key];
        if (d.type === "badge" && d.badgeMap) {
          const colour = d.badgeMap[String(raw ?? "").toLowerCase()];
          return {
            content: capitalizeWords(String(raw ?? "—")),
            styles: {
              textColor: colour ? fmt(colour) : fmt(TEXT_COLOR),
              fontStyle: "bold" as const,
            },
          };
        }
        return cellText(raw, d);
      }),
    );

    // Render table
    autoTable(doc, {
      startY: y,
      head,
      body,
      theme: "grid",
      headStyles: {
        fillColor: fmt(primaryHexVal),
        textColor: fmt(WHITE),
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: fmt(TEXT_COLOR),
        cellPadding: 2.5,
        overflow: "linebreak",
      },
      alternateRowStyles: {
        fillColor: fmt(BG_COLOR),
      },
      styles: {
        lineColor: fmt(BORDER_COLOR),
        lineWidth: 0.1,
      },
      margin: { left: MARGIN, right: MARGIN },

      didDrawPage: (hookData) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(7);
        doc.setFont(DEFAULT_FONT, "normal");
        doc.setTextColor(GRAY_COLOR);
        doc.text(title, MARGIN, PH - 5);
        doc.text(`Page ${hookData.pageNumber} of ${pageCount}`, PW / 2, PH - 5, { align: "center" });
        doc.text(businessName, PW - MARGIN, PH - 5, { align: "right" });
      },
    });

    // @ts-expect-error: jspdf-autotable injects lastAutoTable at runtime
    const finalY: number = doc.lastAutoTable.finalY + 7;

    const summaryItems: string[] = [];

    // Currency Fields summing
    const currencyFields = descriptors.filter(d => d.type === "currency");
    for (const cf of currencyFields.slice(0, 3)) {
      const total = data.reduce((sum, row) => sum + Number(row[cf.key] ?? 0), 0);
      summaryItems.push(`Total ${cf.label}: ${formatMoney(total)}`);
    }

    // Aggregate Fields counting
    const aggregateFields = allDescriptors.filter(d => d.aggregate);
    for (const af of aggregateFields) {
      const counts = data.reduce((acc, row) => {
        const rawVal = row[af.key];
        if (rawVal === undefined || rawVal === null || rawVal === "") return acc;
        const val = capitalizeWords(String(rawVal));
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(counts).forEach(([val, count]) => {
        summaryItems.push(`Total ${val}: ${count}`);
      });
    }

    const itemsPerLine = orientation === "landscape" ? 4 : 3;
    const lines = Math.ceil(summaryItems.length / itemsPerLine) || 1;
    const boxHeight = 6 + (lines * 4);

    if (finalY < PH - boxHeight - 8) {
      // Summary box
      doc.setFillColor(...fmt(BG_COLOR));
      doc.setDrawColor(...fmt(BORDER_COLOR));
      doc.rect(MARGIN, finalY, PW - MARGIN * 2, boxHeight, "FD");

      doc.setFont(DEFAULT_FONT, "bold");
      doc.setFontSize(8);
      doc.setTextColor(TEXT_COLOR);
      doc.text(`Total records: ${data.length}`, MARGIN + 4, finalY + 6.5);

      let xOffset = 60;
      let lineIdx = 0;
      summaryItems.forEach((item, i) => {
        if (i > 0 && i % itemsPerLine === 0) {
          xOffset = 60;
          lineIdx++;
        }
        doc.text(item, MARGIN + xOffset, finalY + 6.5 + (lineIdx * 4));
        xOffset += 45;
      });
    }

    resolve(doc.output("blob"));
  });
}
