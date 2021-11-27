import { z } from 'zod'

export const patchChannel = z.object({
  name: z.string().min(1).max(32),
})
