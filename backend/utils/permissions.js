// 🔴 ACCESS RIGHTS (permissions)
//   CEO   : sab kuch. Wahi Admin banata / hatata hai aur tay karta hai Admin ko kya milega.
//   Admin : wahi rights jo CEO ne diye. In me se koi bhi right kisi employee ko de sakta hai (jo khud ke paas nahi wo nahi).
//   Employee : wahi rights jo Admin (ya CEO) ne diye.
// Har right ek key hai: ya to sidebar ka ek tab, ya tab ke andar ka koi khaas kaam (jaise WORK_ASSIGN).
// ⚠️ Yahi list frontend me bhi hai: KSP-CRM/src/utils/permissions.js. Naya right dono jagah jodna hai.

export const PERMISSION_GROUPS = {
  'Main': ['WORK_MANAGEMENT', 'WORK_ASSIGN', 'TASK_HANDOVER'],
  'Marketing & Sales': ['LEADS', 'GST_HEALTH', 'FEE_DOCS'],
  'Service Team': ['REGISTRATIONS', 'CLIENT_MASTER', 'ITR', 'GST', 'ROC', 'TDS', 'AUDIT', 'FSSAI', 'BAS', 'BIRTHDAY'],
  'HR & Ops': ['EMPLOYEE_MASTER', 'ATTENDANCE', 'SALARY', 'HOLIDAY', 'OFFICE_EXPENSE'],
  'Finance': ['INVOICES'],
  'IT Department': ['DEV_TASKS'],
  'Executive': ['CEO_DASHBOARD', 'BUSINESS_HEALTH'],
  // Tab nahi, khaas kaam: Client Master, ITR, GST, ROC, TDS, Audit, FSSAI, Leads, Registrations, Invoices ka data delete karna
  'Special Rights': ['DELETE_RECORDS']
};

export const ALL_PERMISSIONS = Object.values(PERMISSION_GROUPS).flat();

// Purane system me poore group ka ek hi right hota tha. Use naye tab-wise rights me badalna.
const LEGACY_GROUPS = {
  MARKETING_SALES: PERMISSION_GROUPS['Marketing & Sales'],
  SERVICE_TEAM: PERMISSION_GROUPS['Service Team'],
  HR_OPS: PERMISSION_GROUPS['HR & Ops'],
  FINANCE: PERMISSION_GROUPS['Finance'],
  IT_DEPT: PERMISSION_GROUPS['IT Department'],
  EXECUTIVE: PERMISSION_GROUPS['Executive']
};

// Jin employees ke rights naye system me abhi set nahi hue, unhe yeh pehle jaisa milta rahega
const DEFAULT_EMPLOYEE_PERMISSIONS = ['WORK_MANAGEMENT', 'TASK_HANDOVER'];

const expand = (list) => {
  const result = new Set();
  (Array.isArray(list) ? list : []).forEach(key => {
    if (LEGACY_GROUPS[key]) LEGACY_GROUPS[key].forEach(k => result.add(k));
    else if (ALL_PERMISSIONS.includes(key)) result.add(key);
  });
  return result;
};

// User ke asli (effective) rights
export const getEffectivePermissions = (user) => {
  if (!user) return [];
  if (user.role === 'CEO') return [...ALL_PERMISSIONS];

  if (user.role === 'Admin') {
    // Jab tak CEO ne Admin ke rights alag se set nahi kiye, Admin ke paas sab kuch hai
    return user.fullAccess === false ? [...expand(user.permissions)] : [...ALL_PERMISSIONS];
  }

  const granted = expand(user.permissions);
  if (user.permsVersion !== 2) DEFAULT_EMPLOYEE_PERMISSIONS.forEach(k => granted.add(k));
  return [...granted];
};

export const can = (user, key) => getEffectivePermissions(user).includes(key);

// Sirf sahi keys rakho (galat / purani key hata do)
export const sanitizePermissions = (list) => [...new Set((Array.isArray(list) ? list : []).filter(key => ALL_PERMISSIONS.includes(key)))];

// Express middleware: yeh right na ho toh 403
export const requirePermission = (...keys) => (req, res, next) => {
  if (keys.some(key => can(req.user, key))) return next();
  res.status(403).json({ message: 'You do not have permission for this action.' });
};
