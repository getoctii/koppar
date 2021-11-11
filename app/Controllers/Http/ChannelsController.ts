import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { inChannel } from 'App/Util/Channel'
import { areFriends } from 'App/Util/Relationship'
import { createMessage } from 'App/Validators/CreateMessageValidator'
import { db } from 'Config/db'

export default class ChannelsController {
  public async get(ctx: HttpContextContract) {
    const id = ctx.request.param('id')

    const channel = await db.channel.findUnique({
      where: {
        id,
      },
      include: {
        conversation: true,
      },
    })

    if (!channel) return ctx.response.notFound({ error: 'ChannelNotFound' })
    if (!(await inChannel(channel.id, ctx.user!.id)))
      return ctx.response.notFound({ error: 'ChannelNotFound' })

    return {
      id: channel.id,
      type: channel.type,
      conversationID: channel.conversation?.id,
      communityID: channel.communityID,
      baseAllow: channel.baseAllow,
      baseDeny: channel.baseDeny,
    }
  }

  public async getMessages(ctx: HttpContextContract) {
    const id = ctx.request.param('id')
    const query = ctx.request.qs()

    const channel = await db.channel.findUnique({
      where: {
        id,
      },
      include: {
        conversation: true,
      },
    })

    if (!channel) return ctx.response.notFound({ error: 'ChannelNotFound' })
    if (!(await inChannel(channel.id, ctx.user!.id)))
      return ctx.response.notFound({ error: 'ChannelNotFound' })

    if (channel.type !== 'TEXT') return ctx.response.notFound({ error: 'WrongChannelType' })

    const messages = await db.message.findMany({
      where: {
        channelID: channel.id,
      },
      skip: query.lastID ? 1 : 0,
      take: 25,
      orderBy: {
        createdAt: 'desc',
      },
      ...(query.lastID
        ? {
            cursor: {
              id: query.lastID,
            },
          }
        : {}),
    })

    return ctx.response.ok(
      messages
        .map((m) => ({
          id: m.id,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          authorID: m.authorID,
          payload: m.payload,
        }))
        .reverse()
    )
  }

  public async postMessage(ctx: HttpContextContract) {
    const input = createMessage.safeParse(ctx.request.body())
    if (!input.success) return ctx.response.badRequest({ error: input.error })

    const id = ctx.request.param('id')

    const channel = await db.channel.findUnique({
      where: {
        id,
      },
      include: {
        conversation: true,
      },
    })

    if (!channel) return ctx.response.notFound({ error: 'ChannelNotFound' })
    if (!(await inChannel(channel.id, ctx.user!.id)))
      return ctx.response.notFound({ error: 'ChannelNotFound' })

    if (channel.type !== 'TEXT') return ctx.response.badRequest({ error: 'WrongChannelType' })
    if (channel.conversation?.type === 'DM') {
      const members = await db.conversationMember.findMany({
        where: {
          conversationID: channel.conversation.id,
        },
      })

      if (members.length === 2 && !(await areFriends(members[0].userID, members[1].userID)))
        return ctx.response.badRequest({ error: 'DeliveryFailed' })
    }

    // TODO: check if the user has perms to send messages

    if (!channel.conversation && 'iv' in input.data.payload)
      return ctx.response.badRequest({ error: 'WrongMessageType' })

    const message = await db.message.create({
      data: {
        authorID: ctx.user!.id,
        channelID: channel.id,
        payload: input.data.payload,
      },
    })

    return ctx.response.send({ id: message.id })
  }
}
