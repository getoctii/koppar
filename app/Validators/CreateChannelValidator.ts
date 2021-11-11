import { z } from 'zod'

export const createChannel = z.object({
  name: z.string().min(6).max(32),
})
