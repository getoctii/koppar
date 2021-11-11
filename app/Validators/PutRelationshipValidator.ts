import { z } from 'zod'

export const putRelationship = z.object({
  type: z.enum(['OUTGOING', 'BLOCKED']),
})
