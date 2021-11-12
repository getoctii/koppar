import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { db } from 'Config/db'
import jwt from 'jsonwebtoken'
import Env from '@ioc:Adonis/Core/Env'

export default class AuthRequest {
  public async handle(ctx: HttpContextContract, next: () => Promise<void>) {
    const authorization = ctx.request.header('authorization')
    if (!authorization) return ctx.response.unauthorized({ error: 'AuthorizationRequired' })

    let token: {
      sub: string
      type: string
    }

    try {
      token = jwt.verify(authorization, Env.get('JWT_KEY')) as {
        sub: string
        type: string
      }
    } catch {
      return ctx.response.unauthorized({ error: 'InvalidToken' })
    }

    if (token.type !== 'user') return ctx.response.unauthorized({ error: 'NotUserToken' })

    const user = await db.user.findUnique({ where: { id: token.sub }, include: { keychain: true } })
    if (!user) return ctx.response.notFound({ error: "The user doesn't exist?!?!?!" })

    // LMAO hacks
    ctx.user = user as any

    await next()
  }
}
