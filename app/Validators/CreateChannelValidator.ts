import { z } from 'zod'

export const createChannel = z.object({
  name: z.string().min(1).max(32),
  type: z.enum(['TEXT', 'CATEGORY', 'VOICE']).optional(),
})
