import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { db } from 'Config/db'
import jwt from 'jsonwebtoken'
import Env from '@ioc:Adonis/Core/Env'

export default class AuthRequest {
  public async handle(ctx: HttpContextContract, next: () => Promise<void>) {
    const authorization = ctx.request.header('authorization')
    if (!authorization) return ctx.response.unauthorized({ error: 'AuthorizationRequired' })

    const token = jwt.verify(authorization, Env.get('JWT_KEY')) as {
      sub: string
      type: string
    }

    if (token.type !== 'user') return ctx.response.unauthorized({ error: 'Not a user token' })

    const user = await db.user.findUnique({ where: { id: token.sub }, include: { keychain: true } })
    if (!user) return ctx.response.notFound({ error: "The user doesn't exist?!?!?!" })

    // LMAO hacks
    ctx.user = user as any

    await next()
  }
}
