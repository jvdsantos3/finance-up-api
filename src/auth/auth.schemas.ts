import { z } from 'zod';

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const updateMeSchema = z
  .object({
    name: z.string().min(1).optional(),
    password: z.string().min(8).optional(),
  })
  .strict();

export const createUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1),
  profileId: z.uuid().optional(),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    password: z.string().min(8).optional(),
    profileId: z.uuid().optional(),
  })
  .strict();

export const profileBodySchema = z.object({
  name: z.string().min(1),
});

export const profilePermissionsSchema = z.object({
  permissionKeys: z.array(z.string()),
});
