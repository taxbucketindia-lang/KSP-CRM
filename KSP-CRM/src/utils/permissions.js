// 🔴 ACCESS RIGHTS (permissions)
//   CEO   : sab kuch. Wahi Admin banata / hatata hai aur tay karta hai Admin ko kya milega.
//   Admin : wahi rights jo CEO ne diye. In me se koi bhi right kisi employee ko de sakta hai.
//   Employee : wahi rights jo Admin (ya CEO) ne diye.
// Har right ya to sidebar ka ek tab hai (path), ya tab ke andar ka khaas kaam (action: true).
// ⚠️ Yahi keys backend me bhi hain: backend/utils/permissions.js. Naya right dono jagah jodna hai.

export const PERMISSION_CATALOG = [
  {
    group: 'Main',
    items: [
      { key: 'WORK_MANAGEMENT', label: 'Work Management', path: '/work-management', hint: 'See own tasks and update their status' },
      { key: 'WORK_ASSIGN', label: 'Assign & Manage Tasks', action: true, parent: 'WORK_MANAGEMENT', hint: 'Assign tasks to others, edit / re-assign / delete them and see everyone\'s tasks' },
      { key: 'TASK_HANDOVER', label: 'Task Handover', path: '/taskhandover', hint: 'Hand over pending work to anyone' }
    ]
  },
  {
    group: 'Marketing & Sales',
    items: [
      { key: 'LEADS', label: 'Leads & Prospects', path: '/leads' },
      { key: 'GST_HEALTH', label: 'GST Health Reports', path: '/gst-health' },
      { key: 'FEE_DOCS', label: 'Fee & Documents', path: '/feeanddocuments' }
    ]
  },
  {
    group: 'Service Team',
    items: [
      { key: 'REGISTRATIONS', label: 'Registrations', path: '/clients' },
      { key: 'CLIENT_MASTER', label: 'Client Master', path: '/client-master' },
      { key: 'ITR', label: 'ITR Return', path: '/itr-returns' },
      { key: 'GST', label: 'GST Return', path: '/gst-returns' },
      { key: 'ROC', label: 'ROC Return', path: '/roc-returns' },
      { key: 'TDS', label: 'TDS Return', path: '/tds-returns' },
      { key: 'AUDIT', label: 'Audit', path: '/audit' },
      { key: 'FSSAI', label: 'FSSAI Return', path: '/fssai-returns' },
      { key: 'BAS', label: 'Business Associates', path: '/bas' },
      { key: 'BIRTHDAY', label: 'Client Birthday', path: '/birthday-wishes' }
    ]
  },
  {
    group: 'HR & Ops',
    items: [
      { key: 'EMPLOYEE_MASTER', label: 'Employee Master', path: '/hr/employees' },
      { key: 'ATTENDANCE', label: 'Attendance Control', path: '/hr/attendance' },
      { key: 'SALARY', label: 'Salary Calculation', path: '/hr/salary' },
      { key: 'HOLIDAY', label: 'Holiday', path: '/hr/holiday' },
      { key: 'OFFICE_EXPENSE', label: 'Office Expense', path: '/officexpense' }
    ]
  },
  {
    group: 'Finance',
    items: [{ key: 'INVOICES', label: 'Invoices', path: '/invoice-generator' }]
  },
  {
    group: 'IT Department',
    items: [{ key: 'DEV_TASKS', label: 'Development Tasks', path: '/it/dev-task' }]
  },
  {
    group: 'Executive',
    items: [
      { key: 'CEO_DASHBOARD', label: 'CEO Dashboard', path: '/ceo-panel' },
      { key: 'BUSINESS_HEALTH', label: 'Client Health Reports (CFO)', path: '/business-health' }
    ]
  },
  {
    // Tab nahi, khaas kaam
    group: 'Special Rights',
    items: [
      { key: 'DELETE_RECORDS', label: 'Delete Records', action: true, hint: 'Delete saved data in Client Master, ITR, GST, ROC, TDS, Audit, FSSAI, Leads, Registrations and Invoices. Without this right nobody can delete.' }
    ]
  }
];

export const ALL_PERMISSION_ITEMS = PERMISSION_CATALOG.flatMap(g => g.items.map(item => ({ ...item, group: g.group })));
export const ALL_PERMISSION_KEYS = ALL_PERMISSION_ITEMS.map(item => item.key);

// user.permissions = server se aaye hue asli (effective) rights
export const can = (user, key) => {
  if (!user) return false;
  if (user.role === 'CEO') return true;
  return Array.isArray(user.permissions) && user.permissions.includes(key);
};

export const canAny = (user, keys) => keys.some(key => can(user, key));

export const permissionLabel = (key) => ALL_PERMISSION_ITEMS.find(item => item.key === key)?.label || key;
