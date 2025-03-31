import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(1, 'Full name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;