import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
} from '@casl/ability';
import { PERMISSIONS, type PermissionKey } from './permission-catalog.js';

export type AppAbility = MongoAbility;

export function defineAbilityFor(
  userId: string,
  permissionKeys: readonly string[],
): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
  can('read', 'User', { id: userId });
  can('update', 'User', { id: userId });

  for (const permission of PERMISSIONS) {
    if (permissionKeys.includes(permission.key)) {
      can(permission.action, permission.subject);
    }
  }

  return build();
}

export function allowsUnconditional(
  ability: AppAbility,
  permissionKey: PermissionKey,
): boolean {
  const permission = PERMISSIONS.find((item) => item.key === permissionKey);
  if (!permission) {
    return false;
  }
  return ability
    .rulesFor(permission.action, permission.subject)
    .some((rule) => !rule.conditions && !rule.inverted);
}
