import { z } from 'zod'
import jwt from 'jsonwebtoken'
import Ws from 'App/Services/Ws'
import Env from '@ioc:Adonis/Core/Env'
import { db } from 'Config/db'

Ws.boot()

const getRooms = async (id: string) => {
  const user = await db.user.findUnique({
    where: {
      id,
    },
    include: {
      conversationMembers: {
        include: {
          conversation: {
            include: {
              channels: true,
            },
          },
        },
      },
    },
  })

  return [
    'user:' + id,
    ...user!.conversationMembers.flatMap((member) => [
      'conversation:' + member.conversationID,
      'channel:' + member.conversation.channels.find((c) => c.type === 'TEXT')?.id,
      'voiceChannel:' + member.conversation.channels.find((c) => c.type === 'VOICE')?.id,
      'channel/messages:' + member.conversation.channels.find((c) => c.type === 'TEXT')?.id,
    ]),
  ]
}

const authenticatePayload = z.object({
  token: z.string(),
})

/**
 * Listen for incoming socket connections
 */
Ws.io.on('connection', async (socket) => {
  const input = authenticatePayload.safeParse(socket.handshake.auth)
  if (!input.success) return socket.send({ error: 'InvalidAuth' }).disconnect()

  let token: {
    sub: string
    type: string
  }

  try {
    token = jwt.verify(input.data.token, Env.get('JWT_KEY')) as {
      sub: string
      type: string
    }
  } catch {
    return socket.send({ error: 'InvalidToken' }).disconnect()
  }

  if (token.type !== 'user') return socket.send({ error: 'NotUserToken' })

  const user = await db.user.findUnique({
    where: { id: token.sub },
    include: { keychain: true },
  })

  if (!user) return socket.send({ error: "The user doesn't exist?!?!?!" }).disconnect()

  socket.join(await getRooms(user.id))
})
