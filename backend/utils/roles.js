// Role hierarchy: CEO > Admin > baaki sab employees
export const CEO_ROLE = 'CEO';
export const ADMIN_ROLE = 'Admin';

export const isCeo = (user) => user?.role === CEO_ROLE;

// CEO ya Admin
export const isAdminOrAbove = (user) => user?.role === CEO_ROLE || user?.role === ADMIN_ROLE;

const isTopRole = (role) => role === CEO_ROLE || role === ADMIN_ROLE;

// 🔴 CEO aur Admin ke account ko sirf CEO hi create / edit / delete kar sakta hai.
// Admin sirf employees ko manage karta hai (dusre Admin ya khud ko nahi).
export const canManageUser = (actor, target) => !isTopRole(target?.role) || isCeo(actor);

// 🔴 CEO aur Admin role sirf CEO hi kisi ko de sakta hai (Admin banana / hatana CEO ka kaam hai)
export const canGrantRole = (actor, role) => !isTopRole(role) || isCeo(actor);

// Task kisko diya ja sakta hai:
//   CEO -> sirf Admin ko. Admin -> employees ko (CEO ko nahi).
//   "Assign Task" right wala employee -> sirf employees ko (CEO / Admin ko nahi).
export const getAssignError = (actor, assignee) => {
  if (!assignee) return 'Selected employee not found';
  if (isCeo(actor)) return assignee.role === ADMIN_ROLE ? null : 'CEO can assign tasks to Admins only';
  if (assignee.role === CEO_ROLE) return 'Tasks cannot be assigned to the CEO';
  if (actor?.role !== ADMIN_ROLE && assignee.role === ADMIN_ROLE) return 'Only the CEO can assign tasks to an Admin';
  return null;
};
