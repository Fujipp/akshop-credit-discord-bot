const configManager = require('./configManager');

function isAuthorized(member) {
  if (!member) return false;

  const perms = configManager.get('permissions') || {};
  const allowedRoles = Array.isArray(perms.allowedRoles) ? perms.allowedRoles : [];
  const allowedUsers = Array.isArray(perms.allowedUsers) ? perms.allowedUsers : [];

  // Check if user is in allowed users list
  if (allowedUsers.includes(member.user.id)) {
    return true;
  }

  // Check if user has any of the allowed roles
  if (allowedRoles.some(roleId => member.roles.cache.has(roleId))) {
    return true;
  }

  // Check if user has administrator permission
  if (member.permissions.has('Administrator')) {
    return true;
  }

  return false;
}

module.exports = { isAuthorized };
