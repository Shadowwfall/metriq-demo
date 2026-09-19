import { formatDate } from "./format";

export interface PdfCertificate {
  certificateNumber: string;
  verificationReference: string;
  instrumentCode: string;
  instrumentCategory: string;
  instrumentType: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  capacity: string;
  accuracyClass: string;
  ownerName: string;
  locationLabel: string;
  district: string;
  state: string;
  verificationDate: number;
  validUntil: number;
  issuingAuthority: string;
  officerName: string;
  status: string;
}

/**
 * Builds the A4 certificate PDF entirely on the client: no certificate data
 * leaves the browser, and the QR code embeds the public verification URL.
 *
 * jsPDF and the QR encoder are imported lazily so they are only downloaded when
 * the user actually requests a download.
 */
export async function downloadCertificatePdf(
  certificate: PdfCertificate,
  verifyUrl: string,
  qrDataUrl: string,
) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Outer frame
  doc.setDrawColor(22, 48, 90);
  doc.setLineWidth(0.7);
  doc.rect(margin - 5, 10, contentWidth + 10, 277);
  doc.setLineWidth(0.2);
  doc.rect(margin - 3.5, 11.5, contentWidth + 7, 274);

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(22, 48, 90);
  doc.text("GOVERNMENT OF INDIA", pageWidth / 2, 24, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70, 80, 95);
  doc.text(
    "Ministry of Consumer Affairs, Food & Public Distribution",
    pageWidth / 2,
    30,
    { align: "center" },
  );
  doc.text("Department of Consumer Affairs · Legal Metrology", pageWidth / 2, 35, {
    align: "center",
  });

  doc.setDrawColor(231, 154, 51);
  doc.setLineWidth(0.9);
  doc.line(pageWidth / 2 - 18, 39, pageWidth / 2 + 18, 39);

  // Title band
  doc.setFillColor(29, 59, 104);
  doc.rect(margin, 46, contentWidth, 15, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("DIGITAL VERIFICATION CERTIFICATE", pageWidth / 2, 56, {
    align: "center",
  });

  // Certificate identity
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(90, 100, 115);
  doc.text("Certificate number", margin, 70);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(22, 48, 90);
  doc.text(certificate.certificateNumber, margin, 78);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(90, 100, 115);
  doc.text("Verification reference", margin, 88);
  doc.setFont("courier", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 55, 75);
  doc.text(certificate.verificationReference, margin, 94);
  doc.setFont("helvetica", "normal");

  // QR block (right side)
  const qrSize = 40;
  const qrX = pageWidth - margin - qrSize;
  doc.addImage(qrDataUrl, "PNG", qrX, 64, qrSize, qrSize);
  doc.setFontSize(7.5);
  doc.setTextColor(90, 100, 115);
  doc.text("Scan to verify", qrX + qrSize / 2, 108, { align: "center" });

  // Status chip
  const statusLabel =
    certificate.status === "valid"
      ? "VALID"
      : certificate.status === "expiring_soon"
        ? "VALID — RENEWAL DUE"
        : certificate.status.toUpperCase();
  const chipColor =
    certificate.status === "valid" || certificate.status === "expiring_soon"
      ? ([19, 136, 8] as const)
      : ([178, 40, 40] as const);
  doc.setFillColor(chipColor[0], chipColor[1], chipColor[2]);
  doc.roundedRect(margin, 103, 58, 9, 1.6, 1.6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabel, margin + 4, 109.2);

  // Detail grid
  const rows: [string, string][] = [
    ["Instrument ID", certificate.instrumentCode],
    ["Instrument type", certificate.instrumentType],
    ["Category", certificate.instrumentCategory],
    ["Manufacturer", certificate.manufacturer],
    ["Model", certificate.model],
    ["Serial number", certificate.serialNumber],
    ["Capacity", certificate.capacity],
    ["Accuracy class", certificate.accuracyClass],
    ["Owner / establishment", certificate.ownerName],
    ["Location of instrument", certificate.locationLabel],
    ["District / State", `${certificate.district}, ${certificate.state}`],
    ["Verification date", formatDate(certificate.verificationDate)],
    ["Valid until", formatDate(certificate.validUntil)],
    ["Verifying officer", certificate.officerName],
    ["Issuing authority", certificate.issuingAuthority],
    ["Verification result", "VERIFIED"],
  ];

  let y = 124;
  const colWidth = contentWidth / 2;
  rows.forEach((row, index) => {
    const column = index % 2;
    const x = margin + column * colWidth;
    const rowY = y + Math.floor(index / 2) * 12.5;

    doc.setDrawColor(228, 232, 238);
    doc.setLineWidth(0.15);
    doc.line(x, rowY + 8, x + colWidth - 6, rowY + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.4);
    doc.setTextColor(110, 120, 135);
    doc.text(row[0].toUpperCase(), x, rowY + 2.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.4);
    doc.setTextColor(28, 40, 58);
    doc.text(row[1], x, rowY + 7, { maxWidth: colWidth - 10 });
  });

  y += Math.ceil(rows.length / 2) * 12.5 + 6;

  // Verification note
  doc.setFillColor(246, 248, 251);
  doc.rect(margin, y, contentWidth, 18, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(70, 80, 95);
  doc.text(
    doc.splitTextToSize(
      "This certificate records the outcome of a field verification carried out under the conceptual requirements of the Legal Metrology Act, 2009 and the Legal Metrology (General) Rules, 2011. The instrument described above was found to comply with the prescribed limits at the time of verification.",
      contentWidth - 8,
    ),
    margin + 4,
    y + 6,
  );

  // Footer
  const footerY = 268;
  doc.setDrawColor(205, 212, 222);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(22, 48, 90);
  doc.text("Digital certificate", margin, footerY + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 100, 115);
  doc.setFontSize(7.6);
  doc.text(
    `${certificate.issuingAuthority} · generated on ${formatDate(Date.now())}`,
    margin,
    footerY + 11,
  );
  doc.text(
    doc.splitTextToSize(
      "PROTOTYPE DEMONSTRATION — this is not an official Government of India certificate and carries no legal validity.",
      contentWidth,
    ),
    margin,
    footerY + 16,
  );

  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 130, 145);
  doc.text(verifyUrl, pageWidth - margin, footerY + 11, { align: "right" });

  doc.save(`${certificate.certificateNumber}.pdf`);
}
