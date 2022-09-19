import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { inChannel } from 'App/Util/Channel'
import { db } from 'Config/db'

export default class MessagesController {
  public async get(ctx: HttpContextContract) {
    const id = ctx.request.param('id')

    const message = await db.message.findUnique({
      where: {
        id,
      },
    })

    if (!message) return ctx.response.notFound({ error: 'MessageNotFound' })

    if (!(await inChannel(message.channelID, ctx.user!.id)))
      return ctx.response.notFound({ error: 'MessageNotFound' })

    return ctx.response.ok({
      id: message.id,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      authorID: message.authorID,
      payload: message.payload,
    })
  }
}
