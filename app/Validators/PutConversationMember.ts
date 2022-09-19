import { z } from 'zod'

export const putConversationMember = z.object({
  permission: z.enum(['MEMBER', 'ADMINISTRATOR', 'OWNER']),
})
