import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Ws from 'App/Services/Ws'
import { inChannel } from 'App/Util/Channel'
import { getCommunityMember } from 'App/Util/Community'
import { areFriends } from 'App/Util/Relationship'
import { createMessage } from 'App/Validators/CreateMessageValidator'
import { patchChannel } from 'App/Validators/PatchChannelValidator'
import { db } from 'Config/db'
import { servers } from 'Config/voice'
import jsonwebtoken from 'jsonwebtoken'
import Env from '@ioc:Adonis/Core/Env'

export default class ChannelsController {
  public async get(ctx: HttpContextContract) {
    const id = ctx.request.param('id')

    const channel = await db.channel.findUnique({
      where: {
        id,
      },
      include: {
        conversation: true,
        voiceRoom: {
          include: {
            users: true,
          },
        },
      },
    })

    if (!channel) return ctx.response.notFound({ error: 'ChannelNotFound' })
    if (!(await inChannel(channel.id, ctx.user!.id)))
      return ctx.response.notFound({ error: 'ChannelNotFound' })

    const read = await db.read.findUnique({
      where: {
        channelID_userID: {
          channelID: channel.id,
          userID: ctx.user!.id,
        },
      },
    })

    const lastMessage = await db.message.findFirst({
      where: {
        channelID: channel.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return {
      id: channel.id,
      type: channel.type,
      name: channel.name,
      conversationID: channel.conversation?.id,
      parentID: channel.parentID,
      communityID: channel.communityID,
      baseAllow: channel.baseAllow,
      baseDeny: channel.baseDeny,
      lastReadMessageID: read?.lastReadMessageID,
      lastMessageID: lastMessage?.id,
      lastMessageDate: lastMessage?.createdAt,
      voiceUsers: channel.voiceRoom?.users.map((user) => user.id),
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

    Ws.io.to('channel/messages:' + channel.id).emit('newMessage', message.channelID, {
      id: message.id,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      authorID: message.authorID,
      payload: message.payload,
    })

    return ctx.response.send({ id: message.id })
  }

  public async ack(ctx: HttpContextContract) {
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

    const lastMessage = await db.message.findFirst({
      where: {
        channelID: channel.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (lastMessage) {
      await db.read.upsert({
        where: {
          channelID_userID: {
            channelID: channel.id,
            userID: ctx.user!.id,
          },
        },
        create: {
          channelID: channel.id,
          userID: ctx.user!.id,
          lastReadMessageID: lastMessage.id,
        },
        update: {
          lastReadMessageID: lastMessage.id,
        },
      })
    }

    return ctx.response.send(undefined)
  }

  public async join(ctx: HttpContextContract) {
    const id = ctx.request.param('id')

    const channel = await db.channel.findUnique({
      where: {
        id,
      },
      include: {
        conversation: true,
        voiceRoom: {
          include: {
            users: true,
          },
        },
      },
    })
    if (!channel) return ctx.response.notFound({ error: 'ChannelNotFound' })
    if (!(await inChannel(channel.id, ctx.user!.id)))
      return ctx.response.notFound({ error: 'ChannelNotFound' })

    if (channel.type !== 'VOICE') return ctx.response.badRequest({ error: 'WrongChannelType' })

    const ids = Object.keys(servers)
    if (channel.conversation) {
      if (!channel.voiceRoom || channel.voiceRoom.users.length === 0) {
        Ws.io.to('conversation:' + channel.conversation.id).emit('INCOMING_CALL', {
          id: channel.conversation.id,
          userID: ctx.user!.id,
          channelID: channel.id,
        })
      }
    }
    const room = await db.voiceRoom.upsert({
      where: {
        channelID: channel.id,
      },
      create: {
        serverID: ids[Math.floor(Math.random() * ids.length)],
        channelID: channel.id,
      },
      update: {},
    })

    return ctx.response.ok({
      roomID: room.id,
      socket: servers[room.serverID].socket,
      token: jsonwebtoken.sign({ type: 'voice', room: room.id }, Env.get('JWT_KEY'), {
        subject: ctx.user!.id,
        expiresIn: '30s',
      }),
    })
  }

  public async edit(ctx: HttpContextContract) {
    const input = patchChannel.safeParse(ctx.request.body())
    if (!input.success) return ctx.response.badRequest({ error: input.error })
    const id = ctx.request.param('id')

    const channel = await db.channel.findUnique({
      where: {
        id,
      },
      include: {
        community: true,
      },
    })

    if (!channel?.community) return ctx.response.notFound({ error: 'CommunityNotFound' })
    if (!(await getCommunityMember(id, ctx.user!.id)))
      return ctx.response.notFound({ error: 'CommunityNotFound' })

    // TODO: More advanced permissions checks
    if (channel.community.ownerID !== ctx.user!.id)
      return ctx.response.unauthorized({ error: 'InsufficentPermission' })

    await db.channel.update({
      where: {
        id,
      },
      data: {
        name: input.data.name,
      },
    })

    return ctx.response.ok(undefined)
  }

  public async delete(ctx: HttpContextContract) {
    const id = ctx.request.param('id')

    const channel = await db.channel.findUnique({
      where: {
        id,
      },
      include: {
        community: true,
      },
    })

    if (!channel?.community) return ctx.response.notFound({ error: 'CommunityNotFound' })
    if (!(await getCommunityMember(id, ctx.user!.id)))
      return ctx.response.notFound({ error: 'CommunityNotFound' })

    // TODO: More advanced permissions checks
    if (channel.community.ownerID !== ctx.user!.id)
      return ctx.response.unauthorized({ error: 'InsufficentPermission' })

    if (channel.type === 'TEXT') {
      await db.message.deleteMany({
        where: {
          channelID: id,
        },
      })
    } else if (channel.type === 'VOICE') {
      await db.voiceRoom.deleteMany({
        where: {
          channelID: id,
        },
      })
    }

    await db.channel.delete({
      where: {
        id,
      },
    })

    return ctx.response.ok(undefined)
  }
}
