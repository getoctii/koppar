import { z } from 'zod'

export const createConversation = z.union([
  z.object({
    type: z.literal('DM'),
    recipient: z.string(),
  }),
  z.object({
    type: z.literal('GROUP'),
    recipients: z.array(z.string()),
  }),
])
