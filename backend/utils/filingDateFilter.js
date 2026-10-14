// 🔴 DATE OF FILING FILTER (ITR, GST, ROC, TDS ki list): ?filedFrom=YYYY-MM-DD&filedTo=YYYY-MM-DD
// Din India ke hisaab se: filedFrom ki subah 00:00 se filedTo ki raat 23:59 tak.
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const readFilingRange = (query = {}) => {
  const from = DAY.test(String(query.filedFrom || '')) ? new Date(`${query.filedFrom}T00:00:00.000+05:30`) : null;
  const to = DAY.test(String(query.filedTo || '')) ? new Date(`${query.filedTo}T23:59:59.999+05:30`) : null;
  if (!from && !to) return null;
  const range = {};
  if (from && !Number.isNaN(from.getTime())) range.$gte = from;
  if (to && !Number.isNaN(to.getTime())) range.$lte = to;
  return Object.keys(range).length ? range : null;
};

// Pehle se lage filter ke saath ek aur shart jodna (search wala $or kharab na ho)
export const addCondition = (filter, condition) => {
  filter.$and = [...(filter.$and || []), condition];
  return filter;
};
