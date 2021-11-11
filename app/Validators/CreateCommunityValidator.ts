import { z } from 'zod'

export const createCommunity = z.object({
  name: z.string().min(6).max(32),
})
