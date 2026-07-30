import config from '../../config.js';

export function getRoleIdsForPackageSlug(packageSlug) {
  const roleIds = config.subscriptionSync.roleMap[packageSlug];
  return roleIds && roleIds.length > 0 ? roleIds : null;
}

/** Every role this system ever grants, across all packages - what reconciliation strips from inactive users. */
export function getAllManagedRoleIds() {
  return [...new Set(Object.values(config.subscriptionSync.roleMap).flat())];
}
