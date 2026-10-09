// 🔴 LIST STATS: upar ke cards poore FILTERED data ka total dikhayein, sirf us page ke 10 records ka nahi.
// Ek hi halki aggregate query chalti hai (records load nahi hote), isliye server par bojh nahi padta.

// Field ko number me badlo (galat / khali value = 0)
export const num = (field) => ({ $convert: { input: `$${field}`, to: 'double', onError: 0, onNull: 0 } });

// Jitne records condition match karein unki ginti
export const countIf = (condition) => ({ $sum: { $cond: [condition, 1, 0] } });

// Field ki value list me ho (khali value ko fallback maan kar)
export const statusIn = (field, values, fallback = null) => ({
  $in: [fallback === null ? `$${field}` : { $ifNull: [`$${field}`, fallback] }, values]
});

// filter = wahi filter jo list ke liye use hua; groupFields = { naam: aggregate expression }
export const getListStats = async (Model, filter, groupFields) => {
  const [result] = await Model.aggregate([
    { $match: filter },
    { $group: { _id: null, ...groupFields } }
  ]);

  const stats = {};
  Object.keys(groupFields).forEach(key => { stats[key] = result?.[key] || 0; });
  return stats;
};
