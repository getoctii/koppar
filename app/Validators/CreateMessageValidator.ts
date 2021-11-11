import { z } from 'zod'
import { encryptedMessage } from './KeychainValidator'

export const plainMessage = z.object({
  content: z.string(),
})

export const createMessage = z.object({
  payload: z.union([encryptedMessage, plainMessage]),
})
