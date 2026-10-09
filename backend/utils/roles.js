// Role hierarchy: CEO > Admin > baaki sab employees
export const CEO_ROLE = 'CEO';
export const ADMIN_ROLE = 'Admin';

export const isCeo = (user) => user?.role === CEO_ROLE;

// CEO ke paas Admin ke saare rights hote hain
export const isAdminOrAbove = (user) => user?.role === CEO_ROLE || user?.role === ADMIN_ROLE;

// CEO account ko sirf CEO hi create / edit / delete kar sakta hai
export const canManageUser = (actor, target) => target?.role !== CEO_ROLE || isCeo(actor);

// CEO role sirf CEO hi kisi ko de sakta hai
export const canGrantRole = (actor, role) => role !== CEO_ROLE || isCeo(actor);

// CEO -> sirf Admin ko task assign karega, Admin -> employees ko (CEO ko nahi)
export const getAssignError = (actor, assignee) => {
  if (!assignee) return 'Selected employee not found';
  if (isCeo(actor) && assignee.role !== ADMIN_ROLE) return 'CEO can assign tasks to Admins only';
  if (!isCeo(actor) && assignee.role === CEO_ROLE) return 'Tasks cannot be assigned to the CEO';
  return null;
};
