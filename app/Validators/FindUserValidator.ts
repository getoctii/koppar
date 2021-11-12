import { z } from 'zod'

export const findUser = z.object({
  username: z.string(),
  discriminator: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => Number(val)),
})
