import { z } from 'zod'

export const patchConversation = z.object({
  name: z.string().min(1).max(32),
})
