import { z } from 'zod'

export const challengeUser = z.object({
  email: z.string().email(),
})
