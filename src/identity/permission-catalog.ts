export const PERMISSIONS = [
  { key: 'users.read', action: 'read', subject: 'User' },
  { key: 'users.create', action: 'create', subject: 'User' },
  { key: 'users.update', action: 'update', subject: 'User' },
  { key: 'users.assign-profile', action: 'assign-profile', subject: 'User' },
  { key: 'profiles.read', action: 'read', subject: 'Profile' },
  { key: 'profiles.manage', action: 'manage', subject: 'Profile' },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]['key'];

export const SYSTEM_PROFILES = {
  admin: 'Admin',
  usuario: 'Usuario',
} as const;
