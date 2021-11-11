import { z } from 'zod'
import { encryptedMessage, publicKeychain } from './KeychainValidator'

export const registerUser = z.object({
  username: z
    .string()
    .regex(/^[a-zA-Z0-9_]*$/)
    .min(3)
    .max(32),
  email: z.string().email(),
  salt: z.array(z.number().int()),
  encryptedKeychain: encryptedMessage,
  publicKeychain: publicKeychain,
})
