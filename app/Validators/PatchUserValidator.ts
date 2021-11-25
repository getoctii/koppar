import { z } from 'zod'

export const patchUser = z.object({
  username: z
    .string()
    .regex(/^[a-zA-Z0-9_]*$/)
    .min(3)
    .max(32)
    .optional(),
  state: z.enum(['ONLINE', 'IDLE', 'DND', 'OFFLINE']).optional(),
  status: z.string().min(3).max(128).optional(),
})
