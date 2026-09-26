const PERMISSIONS = {
  god_admin: ["*"],
  main_admin: ["chat:read_all", "chat:delete_any", "group:create", "user:block", "monitor:assign"],
  chat_monitor: ["chat:delete_in_group", "user:mute_in_group"],
  member: ["chat:send"],
};

export function can(role, permission) {
  const rolePerms = PERMISSIONS[role] || [];
  return rolePerms.includes("*") || rolePerms.includes(permission);
}