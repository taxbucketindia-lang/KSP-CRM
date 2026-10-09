// Role hierarchy: CEO > Admin > baaki sab employees
export const isCeoRole = (role) => role === 'CEO';

// CEO ke paas Admin ke saare rights hote hain
export const isAdminRole = (role) => role === 'Admin' || role === 'CEO';
