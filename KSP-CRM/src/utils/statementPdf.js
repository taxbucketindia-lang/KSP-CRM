import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadLogo, COMPANY } from './logo';

// 🔴 CLIENT ACCOUNT STATEMENT (bank statement jaisa PDF)
// Upar kone me TaxBucket ka logo, uske neeche client ki detail, phir tareekh-wise Debit / Credit / Balance.

const amount = (v) => (Number(v) ? Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
// Balance: client par baaki ho toh "Dr", client ka advance ho toh "Cr"
const balanceText = (v) => `${Math.abs(Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${Number(v) < 0 ? 'Cr' : 'Dr'}`;
const day = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '-');
// jsPDF ke default font me ₹ nahi hota
const clean = (text) => String(text || '').replace(/₹/g, 'Rs. ');

// ledger = [{ date, type, particulars, ref, debit, credit, balance }] (purana pehle)
export const downloadClientStatement = async (client, ledger) => {
  const logo = await loadLogo();
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const totalDebit = ledger.reduce((sum, e) => sum + Number(e.debit || 0), 0);
  const totalCredit = ledger.reduce((sum, e) => sum + Number(e.credit || 0), 0);
  const closing = ledger.length ? ledger[ledger.length - 1].balance : 0;
  const opening = ledger.find(e => e.type === 'Opening')?.debit || 0;
  const dated = ledger.filter(e => e.type !== 'Opening' && e.date);
  const periodFrom = dated.length ? dated[0].date : client.createdAt;

  // ---------- HEADER: logo upar baayein kone me, daayein statement ka title ----------
  let headerBottom = 30;
  if (logo) {
    const h = 18;
    const w = Math.min(48, h * logo.ratio);
    doc.addImage(logo.dataUrl, 'PNG', margin, 10, w, w / logo.ratio);
    headerBottom = Math.max(headerBottom, 10 + w / logo.ratio + 2);
  } else {
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 138);
    doc.text(COMPANY.brand.toUpperCase(), margin, 22);
  }

  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(15, 23, 42);
  doc.text('STATEMENT OF ACCOUNT', pageWidth - margin, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105);
  doc.text(COMPANY.legalName, pageWidth - margin, 21, { align: 'right' });
  doc.text(COMPANY.tagline, pageWidth - margin, 25.5, { align: 'right' });
  doc.text(COMPANY.contact, pageWidth - margin, 30, { align: 'right' });

  doc.setDrawColor(30, 58, 138); doc.setLineWidth(0.6);
  doc.line(margin, headerBottom + 4, pageWidth - margin, headerBottom + 4);

  // ---------- CLIENT KI DETAIL (baayein) + STATEMENT KI DETAIL (daayein) ----------
  const address = [client.address, client.district, client.state, client.pinCode].filter(Boolean).join(', ');
  const clientLines = [
    ['Client ID', client.clientId], ['PAN', client.pan], ['GSTIN', client.gstin],
    ['Mobile', client.mobile], ['Email', client.email], ['Address', address]
  ].filter(([, value]) => value);

  autoTable(doc, {
    startY: headerBottom + 8,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 1, bottom: 1, left: 0, right: 2 }, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 22, textColor: [100, 116, 139], fontStyle: 'bold' },
      1: { cellWidth: 78 },
      2: { cellWidth: 34, textColor: [100, 116, 139], fontStyle: 'bold' },
      3: { halign: 'right', fontStyle: 'bold' }
    },
    head: [[{ content: clean(client.name) + (client.tradeName ? `  (${clean(client.tradeName)})` : ''), colSpan: 2, styles: { fontSize: 12, fontStyle: 'bold', textColor: [15, 23, 42] } }, { content: 'Statement Details', colSpan: 2, styles: { fontSize: 10, fontStyle: 'bold', textColor: [15, 23, 42], halign: 'right' } }]],
    body: (() => {
      const right = [
        ['Statement Date', day(new Date())],
        ['Period', `${day(periodFrom)} to ${day(new Date())}`],
        ['Opening Balance', balanceText(opening)],
        ['Total Billed (Dr)', amount(totalDebit - opening) || '0.00'],
        ['Total Received (Cr)', amount(totalCredit) || '0.00'],
        ['Closing Balance', balanceText(closing)]
      ];
      const rows = Math.max(clientLines.length, right.length);
      return Array.from({ length: rows }, (_, i) => [clientLines[i]?.[0] || '', clean(clientLines[i]?.[1]) || '', right[i]?.[0] || '', right[i]?.[1] || '']);
    })()
  });

  // ---------- CLOSING BALANCE KI PATTI ----------
  let y = doc.lastAutoTable.finalY + 5;
  const due = closing > 0;
  doc.setFillColor(...(due ? [254, 242, 242] : [236, 253, 245]));
  doc.setDrawColor(...(due ? [254, 202, 202] : [167, 243, 208]));
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...(due ? [190, 18, 60] : [4, 120, 87]));
  doc.text(due ? 'Net Amount Due' : closing < 0 ? 'Advance / Credit Balance' : 'No Dues Pending', margin + 4, y + 7.8);
  doc.text(`Rs. ${Math.abs(closing).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin - 4, y + 7.8, { align: 'right' });

  // ---------- STATEMENT TABLE ----------
  autoTable(doc, {
    startY: y + 17,
    head: [['Date', 'Particulars', 'Ref. No.', 'Debit (Rs.)', 'Credit (Rs.)', 'Balance (Rs.)']],
    body: ledger.length
      ? ledger.map(e => [
          e.type === 'Opening' ? 'Opening' : day(e.date),
          clean(e.particulars),
          e.ref || '',
          amount(e.debit),
          amount(e.credit),
          balanceText(e.balance)
        ])
      : [[{ content: 'No transactions found for this client.', colSpan: 6, styles: { halign: 'center', textColor: [148, 163, 184] } }]],
    foot: ledger.length ? [['', 'TOTAL', '', amount(totalDebit) || '0.00', amount(totalCredit) || '0.00', balanceText(closing)]] : undefined,
    showFoot: 'lastPage',
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.2, lineColor: [226, 232, 240], lineWidth: 0.1, textColor: [30, 41, 59], valign: 'middle' },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', halign: 'left' },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 24 },
      2: { cellWidth: 31, fontSize: 7.5 }, // lamba invoice number ek hi line me aaye
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right', textColor: [4, 120, 87] },
      5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      // Number wale columns ke heading / total bhi daayein
      if (data.section !== 'body' && data.column.index >= 3) data.cell.styles.halign = 'right';
    },
    margin: { left: margin, right: margin, bottom: 22 }
  });

  // ---------- FOOTER (har page par) ----------
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
    doc.text('Dr = amount payable by the client. Cr = amount received / advance. This is a computer generated statement and does not require a signature.', margin, pageHeight - 11);
    doc.text(`${COMPANY.legalName}`, margin, pageHeight - 7);
    doc.text(`Page ${p} of ${pages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  const safeName = String(client.tradeName || client.name || 'Client').replace(/[^a-zA-Z0-9]+/g, '_');
  doc.save(`Statement_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
};
