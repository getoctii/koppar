import { z } from 'zod'

export const swapChannels = z
  .object({
    id: z.string(),
    position: z.number().optional(),
    parentID: z.string().optional(),
  })
  .array()
