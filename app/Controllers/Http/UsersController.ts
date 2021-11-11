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
import z from 'zod'

export default class UsersController {
  public async me(ctx: HttpContextContract) {
    return ctx.response.ok({
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

    return ctx.response.ok({
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

      const complement = allDisciminators.filter((d) => discriminators.has(d))

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

    return {
      ok: true,
      token: jwt.sign({ type: 'user' }, Env.get('JWT_KEY'), {
        expiresIn: '7w',
        subject: user.id,
      }),
    }
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
