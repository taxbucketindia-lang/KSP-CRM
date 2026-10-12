// 🔴 GST MONTHLY RETURN TRACKING
// Har mahine ki GSTR-1 / GSTR-3B filing alag row me save hoti hai (period, filing date, status, remark).
// Purane 4 fields (gstr1FilingDate, gstr1NextDueDate, gstr3bFilingDate, gstr3bNextDueDate) inhi rows se
// apne aap bante hain, taaki list ke filter, Excel export aur Client Master pehle jaise chalte rahein.

export const RETURN_TYPES = ['GSTR1', 'GSTR3B'];
export const FILING_STATUSES = ['Filed', 'Pending', 'Not Filed'];

const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;
const DUE_DAY = { GSTR1: '11', GSTR3B: '20' };

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// 'YYYY-MM' me mahine jodna
const addMonths = (period, count) => {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + count, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

// Form se aayi rows saaf karna: galat row hata do, ek hi mahina do baar aaye toh aakhri wali rakho
export const readFilingRecords = (list) => {
  if (!Array.isArray(list)) return [];
  const byKey = new Map();
  list.forEach(row => {
    if (!row || !RETURN_TYPES.includes(row.returnType) || !PERIOD.test(String(row.period || ''))) return;
    const filingDate = toDate(row.filingDate);
    // Filing date daali hai toh Filed; warna Pending / Not Filed
    const status = filingDate ? 'Filed' : (row.status === 'Not Filed' ? 'Not Filed' : 'Pending');
    byKey.set(`${row.returnType}|${row.period}`, {
      returnType: row.returnType,
      period: row.period,
      filingDate,
      status,
      remark: String(row.remark || '').trim().slice(0, 300)
    });
  });
  return [...byKey.values()].sort((a, b) => b.period.localeCompare(a.period) || a.returnType.localeCompare(b.returnType));
};

// Rows se purane fields nikalna: latest filing date aur agli due date
// Agli due date: koi mahina pending hai toh uski due date, warna aakhri file hue mahine ke agle mahine ki.
// (September ka return October me due hota hai: GSTR-1 11 tareekh, GSTR-3B 20 tareekh)
export const deriveLegacyFields = (records) => {
  const fields = {};
  RETURN_TYPES.forEach(type => {
    const rows = records.filter(r => r.returnType === type);
    const filed = rows.filter(r => r.status === 'Filed').sort((a, b) => b.period.localeCompare(a.period));
    const pending = rows.filter(r => r.status !== 'Filed').sort((a, b) => a.period.localeCompare(b.period));

    const duePeriod = pending[0] ? addMonths(pending[0].period, 1) : filed[0] ? addMonths(filed[0].period, 2) : null;
    const prefix = type === 'GSTR1' ? 'gstr1' : 'gstr3b';
    fields[`${prefix}FilingDate`] = filed[0]?.filingDate || null;
    fields[`${prefix}NextDueDate`] = duePeriod ? new Date(`${duePeriod}-${DUE_DAY[type]}`) : null;
  });
  return fields;
};

// Create / update ke body par lagana. Jab form "filingRecords" bhejta hai tabhi chalta hai
// (status ya remark wale chhote update ise nahi chhedte).
export const applyFilingRecords = (body) => {
  if (!body || !Array.isArray(body.filingRecords)) return body;
  body.filingRecords = readFilingRecords(body.filingRecords);
  Object.assign(body, deriveLegacyFields(body.filingRecords));
  return body;
};
