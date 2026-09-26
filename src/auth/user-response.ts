import type { UserRecord } from '../identity/users.repository.js';

export function toUserResponse(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    profile: {
      id: user.profileId,
      name: user.profileName,
    },
  };
}
