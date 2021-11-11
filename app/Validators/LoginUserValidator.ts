import { z } from 'zod'
import { signedMessage } from './KeychainValidator'

export const loginUser = z.object({
  email: z.string().email(),
  signedChallenge: signedMessage,
})
