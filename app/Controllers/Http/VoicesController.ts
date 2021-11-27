import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Env from '@ioc:Adonis/Core/Env'
import { db } from 'Config/db'
import Ws from 'App/Services/Ws'

export default class VoicesController {
  public async started(ctx: HttpContextContract) {
    const id = ctx.request.param('id')
    if (ctx.request.header('authorization') !== Env.get('GATEWAY_TOKEN'))
      return ctx.response.unauthorized({ error: 'InvalidToken' })
    await db.voiceRoom.deleteMany({
      where: {
        serverID: id,
      },
    })
    return ctx.response.ok(undefined)
  }

  public async join(ctx: HttpContextContract) {
    const id = ctx.request.param('id')
    const userID = ctx.request.param('userID')
    if (ctx.request.header('authorization') !== Env.get('GATEWAY_TOKEN'))
      return ctx.response.unauthorized({ error: 'InvalidToken' })

    const room = await db.voiceRoom.update({
      where: {
        id,
      },
      data: {
        users: {
          connect: [
            {
              id: userID,
            },
          ],
        },
      },
    })

    Ws.io.to('voiceChannel:' + room.channelID).emit('MEMBER_VOICE_JOIN', {
      id: room.channelID,
      userID: userID,
      roomID: room.id,
    })

    return ctx.response.ok(undefined)
  }

  public async leave(ctx: HttpContextContract) {
    const id = ctx.request.param('id')
    const userID = ctx.request.param('userID')
    if (ctx.request.header('authorization') !== Env.get('GATEWAY_TOKEN'))
      return ctx.response.unauthorized({ error: 'InvalidToken' })

    const room = await db.voiceRoom.update({
      where: {
        id,
      },
      data: {
        users: {
          disconnect: [
            {
              id: userID,
            },
          ],
        },
      },
    })

    Ws.io.to('voiceChannel:' + room.channelID).emit('MEMBER_VOICE_LEAVE', {
      id: room.channelID,
      userID: userID,
      roomID: room.id,
    })

    return ctx.response.ok(undefined)
  }
}
