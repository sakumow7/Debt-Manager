import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Debt, AttackPlanResult, AppSettings } from '../types';

function currency(n: number, code = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(n);
}

function monthsToText(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m}mo`;
  if (m === 0) return `${y}yr`;
  return `${y}yr ${m}mo`;
}

export function exportPayoffPlanPDF(
  debts: Debt[],
  plan: AttackPlanResult,
  settings: AppSettings
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const cur = settings.currency || 'USD';
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, w, 32, 'F');
  doc.setTextColor(16, 185, 129);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Chisel Finance', 14, 14);
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Debt Payoff Plan', 14, 21);
  doc.text(`Generated ${today}`, 14, 27);

  // ── Strategy badge ────────────────────────────────────────────────────────
  const stratLabel = plan.strategy === 'avalanche' ? 'Avalanche Strategy' : 'Snowball Strategy';
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(w - 60, 8, 46, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(stratLabel, w - 37, 14.5, { align: 'center' });

  // ── Summary cards ─────────────────────────────────────────────────────────
  let y = 42;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, y);
  y += 6;

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const summaryItems = [
    { label: 'Total Debt', value: currency(totalDebt, cur), color: [239, 68, 68] as [number, number, number] },
    { label: 'Debt-Free Date', value: plan.payoffDate, color: [16, 185, 129] as [number, number, number] },
    { label: 'Total Interest', value: currency(plan.totalInterestPaid, cur), color: [245, 158, 11] as [number, number, number] },
    { label: 'Time to Freedom', value: monthsToText(plan.totalMonths), color: [59, 130, 246] as [number, number, number] },
  ];

  const cardW = (w - 28 - 9) / 4;
  summaryItems.forEach((item, i) => {
    const x = 14 + i * (cardW + 3);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardW, 22, 2, 2, 'F');
    doc.setDrawColor(...item.color);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, cardW, 22, 2, 2, 'S');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, x + cardW / 2, y + 7, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...item.color);
    doc.text(item.value, x + cardW / 2, y + 16, { align: 'center' });
  });

  // ── Debts table ───────────────────────────────────────────────────────────
  y += 30;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('My Debts', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Debt', 'Type', 'Balance', 'APR %', 'Min Payment', 'Due Day']],
    body: debts.map(d => [
      d.name,
      d.type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      currency(d.balance, cur),
      `${d.interestRate.toFixed(2)}%`,
      currency(d.minimumPayment, cur),
      `Day ${d.dueDate}`,
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  // ── Payoff order ──────────────────────────────────────────────────────────
  y = (doc as any).lastAutoTable.finalY + 10;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Payoff Order', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['#', 'Debt', 'Payoff Date', 'Interest Paid']],
    body: plan.debtPayoffInfo.map((info, i) => [
      `${i + 1}`,
      info.debtName,
      info.date,
      currency(info.totalInterestPaid, cur),
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: { 3: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  // ── 12-month schedule ─────────────────────────────────────────────────────
  const schedule12 = plan.monthlySchedule.slice(0, 12);
  if (schedule12.length > 0) {
    y = (doc as any).lastAutoTable.finalY + 10;
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('12-Month Snapshot', 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['Month', 'Total Payment', 'Interest', 'Principal', 'Remaining Balance']],
      body: schedule12.map((m, i) => {
        const totalInterest = m.payments.reduce((s, p) => s + p.interest, 0);
        const totalPrincipal = m.payments.reduce((s, p) => s + p.principal, 0);
        return [
          `Month ${i + 1}`,
          currency(m.totalPayment, cur),
          currency(totalInterest, cur),
          currency(totalPrincipal, cur),
          currency(m.totalBalance, cur),
        ];
      }),
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text(`Chisel Finance · chiselfinance.app · Page ${p} of ${pageCount}`, w / 2, 292, { align: 'center' });
  }

  doc.save(`chisel-payoff-plan-${new Date().toISOString().slice(0, 10)}.pdf`);
}
