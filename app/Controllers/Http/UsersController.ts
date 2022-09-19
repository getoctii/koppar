import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { registerUser } from 'App/Validators/RegisterUserValidator'
import { db } from 'Config/db'
import jwt from 'jsonwebtoken'
import Env from '@ioc:Adonis/Core/Env'
import { challengeUser } from 'App/Validators/ChallengeUserValidator'
import { randomUUID } from 'crypto'
import { loginUser } from 'App/Validators/LoginUserValidator'
import { SigningPair } from '@innatical/inncryption'
import { publicKeychain } from 'App/Validators/KeychainValidator'
import { z } from 'zod'
import { putRelationship } from 'App/Validators/PutRelationshipValidator'
import { isBlocked } from 'App/Util/Relationship'
import { findUser } from 'App/Validators/FindUserValidator'
import { patchUser } from 'App/Validators/PatchUserValidator'
import Ws from 'App/Services/Ws'
import { UserState } from '.prisma/client'

export default class UsersController {
  public async me(ctx: HttpContextContract) {
    return ctx.response.ok({
      id: ctx.user!.id,
      email: ctx.user!.email,
      username: ctx.user!.username,
      discriminator: ctx.user!.discriminator,
      avatar: ctx.user!.avatar,
      status: ctx.user!.status,
      state: ctx.user!.state,
      createdAt: ctx.user!.createdAt,
      updatedAt: ctx.user!.updatedAt,
      badges: ctx.user!.badges,
      flags: ctx.user!.flags,
      keychain: ctx.user!.keychain!,
    })
  }

  public async update(ctx: HttpContextContract) {
    const input = patchUser.safeParse(ctx.request.body())
    if (!input.success) return ctx.response.badRequest({ error: input.error })

    await db.user.update({
      where: {
        id: ctx.user!.id,
      },
      data: {
        username: input.data.username,
        state: input.data.state,
        status: input.data.status,
      },
    })

    return ctx.response.ok(undefined)
  }

  public async myRelationships(ctx: HttpContextContract) {
    const user = await db.user.findUnique({
      where: {
        id: ctx.user!.id,
      },
      include: {
        incomingRelationships: true,
        outgoingRelationships: true,
      },
    })

    const outgoing = user!.outgoingRelationships
      .filter((r) => r.type === 'OUTGOING')
      .map((friend) => friend.recipientID)
    const incoming = user!.incomingRelationships
      .filter((r) => r.type === 'OUTGOING')
      .map((friend) => friend.userID)

    return ctx.response.ok({
      friends: outgoing.filter((friend) => incoming.includes(friend)),
      outgoing: outgoing.filter((friend) => !incoming.includes(friend)),
      incoming: incoming.filter((friend) => !outgoing.includes(friend)),
      blocked: user!.outgoingRelationships
        .filter((r) => r.type === 'BLOCKED')
        .map((r) => r.recipientID),
    })
  }

  public async myConversations(ctx: HttpContextContract) {
    const user = await db.user.findUnique({
      where: {
        id: ctx.user!.id,
      },
      include: {
        conversationMembers: true,
      },
    })

    return ctx.response.ok(user!.conversationMembers.map((m) => m.conversationID))
  }

  public async myCommunities(ctx: HttpContextContract) {
    const user = await db.user.findUnique({
      where: {
        id: ctx.user!.id,
      },
      include: {
        communityMembers: true,
      },
    })

    return ctx.response.ok(user!.communityMembers.map((m) => m.communityID))
  }

  public async putRelationship(ctx: HttpContextContract) {
    const input = putRelationship.safeParse(ctx.request.body())
    if (!input.success) return ctx.response.badRequest({ error: input.error })

    const id = ctx.request.param('id')

    const recipient = await db.user.findUnique({
      where: {
        id,
      },
    })

    if (!recipient) return ctx.response.notFound({ error: 'UserNotFound' })
    if (recipient.id === ctx.user!.id) return ctx.response.badRequest({ error: 'InvalidUser' })

    if (input.data.type === 'OUTGOING' && (await isBlocked(ctx.user!.id, recipient.id)))
      return ctx.response.notFound({ error: 'UserNotFound' })

    if (input.data.type === 'BLOCKED')
      await db.relationship.deleteMany({
        where: {
          userID: recipient.id,
          recipientID: ctx.user!.id,
          type: {
            not: 'BLOCKED',
          },
        },
      })

    await db.relationship.upsert({
      where: {
        userID_recipientID: {
          userID: ctx.user!.id,
          recipientID: recipient.id,
        },
      },
      create: {
        type: input.data.type,
        user: {
          connect: {
            id: ctx.user!.id,
          },
        },
        recipient: {
          connect: {
            id,
          },
        },
      },
      update: {
        type: input.data.type,
      },
    })

    return ctx.response.ok(undefined)
  }

  public async deleteRelationship(ctx: HttpContextContract) {
    const id = ctx.request.param('id')
    const recipient = await db.user.findUnique({
      where: {
        id,
      },
    })

    if (!recipient) return ctx.response.notFound({ error: 'UserNotFound' })

    await db.relationship.deleteMany({
      where: {
        userID: ctx.user!.id,
        recipientID: recipient?.id,
      },
    })

    await db.relationship.deleteMany({
      where: {
        userID: recipient?.id,
        recipientID: ctx.user!.id,
        type: 'OUTGOING',
      },
    })

    return ctx.response.ok(undefined)
  }

  public async get(ctx: HttpContextContract) {
    const userID = ctx.request.param('id')
    const user = await db.user.findUnique({
      where: {
        id: userID,
      },
      include: {
        keychain: true,
      },
    })

    if (!user) return ctx.response.notFound({ error: 'UserNotFound' })
    const sockets = await Ws.io.in(`user:${user.id}`).fetchSockets()
    return ctx.response.ok({
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      status: user.status,
      state: sockets.length > 0 ? user.state ?? UserState.ONLINE : UserState.OFFLINE,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      badges: user.badges,
      flags: user.flags,
      keychain: {
        publicKeychain: user.keychain!.publicKeychain,
      },
    })
  }

  public async find(ctx: HttpContextContract) {
    const input = findUser.safeParse(ctx.request.qs())
    if (!input.success) return ctx.response.badRequest({ error: input.error })

    const user = await db.user.findUnique({
      where: {
        username_discriminator: {
          username: input.data.username,
          discriminator: input.data.discriminator,
        },
      },
      include: {
        keychain: true,
      },
    })

    if (!user) return ctx.response.notFound({ error: 'UserNotFound' })

    return ctx.response.ok({
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      status: user.status,
      state: user.state,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      badges: user.badges,
      flags: user.flags,
      keychain: {
        publicKeychain: user.keychain!.publicKeychain,
      },
    })
  }

  public async register(ctx: HttpContextContract) {
    const input = registerUser.safeParse(ctx.request.body())
    if (!input.success) return ctx.response.badRequest({ error: input.error })

    {
      const user = await db.user.findUnique({
        where: {
          email: input.data.email,
        },
      })

      if (user) return ctx.response.badRequest({ error: 'EmailInUse' })
    }

    let discriminator: number

    {
      const users = await db.user.findMany({
        where: {
          username: input.data.username,
        },
      })

      if (users.length >= 9999) return ctx.response.badRequest({ error: 'UsernameTaken' })

      const allDisciminators = [...Array(10000).keys()].slice(1)
      const discriminators = new Set(users.map((user) => user.discriminator))

      const complement = allDisciminators.filter((d) => !discriminators.has(d))

      discriminator = complement[Math.floor(Math.random() * complement.length)]
    }

    const user = await db.user.create({
      data: {
        username: input.data.username,
        email: input.data.email,
        discriminator,
        keychain: {
          create: {
            encryptedKeychain: input.data.encryptedKeychain,
            publicKeychain: input.data.publicKeychain,
            salt: input.data.salt,
          },
        },
      },
    })

    return ctx.response.ok({
      token: jwt.sign({ type: 'user' }, Env.get('JWT_KEY'), {
        expiresIn: '7w',
        subject: user.id,
      }),
    })
  }

  public async login(ctx: HttpContextContract) {
    const input = loginUser.safeParse(ctx.request.body())
    if (!input.success) return ctx.response.badRequest({ error: input.error })

    const user = await db.user.findUnique({
      where: {
        email: input.data.email,
      },
      include: {
        keychain: true,
      },
    })
    if (!user) return ctx.response.notFound({ error: 'UserNotFound' })

    const challenge = await SigningPair.verify(
      input.data.signedChallenge,
      (user.keychain!.publicKeychain as z.infer<typeof publicKeychain>).signing
    )

    if (!challenge.ok) return ctx.response.unauthorized({ error: 'InvalidSignature' })

    try {
      const token = jwt.verify(challenge.message as string, Env.get('JWT_KEY')) as {
        sub: string
        type: string
      }
      if (token.sub !== user.id || token.type !== 'challenge')
        return ctx.response.unauthorized({ error: 'InvalidToken' })
    } catch {
      return ctx.response.unauthorized({ error: 'InvalidToken' })
    }

    return ctx.response.ok({
      token: jwt.sign({ type: 'user' }, Env.get('JWT_KEY'), {
        expiresIn: '7w',
        subject: user.id,
      }),
    })
  }

  public async challenge(ctx: HttpContextContract) {
    const input = challengeUser.safeParse(ctx.request.body())
    if (!input.success) return ctx.response.badRequest({ error: input.error })

    const user = await db.user.findUnique({
      where: {
        email: input.data.email,
      },
      include: {
        keychain: true,
      },
    })

    if (!user) return ctx.response.notFound({ error: 'UserNotFound' })

    return ctx.response.ok({
      challenge: jwt.sign({ type: 'challenge' }, Env.get('JWT_KEY'), {
        expiresIn: '30s',
        subject: user.id,
        jwtid: randomUUID(),
      }),
      encryptedKeychain: user.keychain!.encryptedKeychain,
      salt: user.keychain!.salt,
    })
  }
}
