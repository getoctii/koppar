import { ConversationMemberPermission } from '@prisma/client'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { areFriends, isBlocked } from 'App/Util/Relationship'
import { createConversation } from 'App/Validators/CreateConversationValidator'
import { db } from 'Config/db'
import { getMember } from 'App/Util/Conversation'
import { putConversationMember } from 'App/Validators/PutConversationMember'
import { patchConversation } from 'App/Validators/PatchConversationValidator'
import Ws from 'App/Services/Ws'

export default class ConversationsController {
  public async create(ctx: HttpContextContract) {
    const input = createConversation.safeParse(ctx.request.body())
    if (!input.success) return ctx.response.badRequest({ error: input.error })

    if (
      input.data.type === 'DM' &&
      (!(await db.user.findUnique({ where: { id: input.data.recipient } })) ||
        (await isBlocked(ctx.user!.id, input.data.recipient)))
    )
      return ctx.response.notFound({ error: 'UserNotFound' })

    if (input.data.type === 'GROUP') {
      const foundUsers = await db.user.findMany({
        where: {
          OR: input.data.recipients.map((r) => ({ id: r })),
        },
      })

      const blocks = await db.relationship.count({
        where: {
          OR: input.data.recipients.map((r) => ({ recipientID: ctx.user!.id, userID: r })),
          type: 'BLOCKED',
        },
      })

      if (blocks !== 0) return ctx.response.notFound({ error: 'UserNotFound' })

      if (!input.data.recipients.every((r) => !!foundUsers.find((u) => u.id === r)))
        return ctx.response.notFound({ error: 'UserNotFound' })
    }

    if (input.data.type === 'DM' && !(await areFriends(ctx.user!.id, input.data.recipient)))
      return ctx.response.badRequest({ error: 'NotFriends' })

    if (input.data.type === 'GROUP') {
      const outgoing = await db.relationship.findMany({
        where: {
          userID: ctx.user!.id,
          type: 'OUTGOING',
        },
      })

      const incoming = await db.relationship.findMany({
        where: {
          recipientID: ctx.user!.id,
          type: 'OUTGOING',
        },
      })

      if (
        !input.data.recipients.every(
          (r) => outgoing.find((u) => r === u.recipientID) && incoming.find((u) => r === u.userID)
        )
      )
        return ctx.response.badRequest({ error: 'NotFriends' })
    }

    if (
      input.data.type === 'DM' &&
      (await db.conversation.findFirst({
        where: {
          members: {
            every: {
              OR: [
                {
                  userID: ctx.user?.id,
                },
                {
                  userID: input.data.recipient,
                },
              ],
            },
          },
        },
      }))
    )
      return ctx.response.badRequest({ error: 'AlreadyExists' })

    const conversation = await db.conversation.create({
      data: {
        type: input.data.type,
        channels: {
          createMany: {
            data: [
              {
                type: 'TEXT',
              },
              {
                type: 'VOICE',
              },
            ],
          },
        },
      },
      include: {
        channels: true,
      },
    })

    await db.conversationMember.create({
      data: {
        permission: 'OWNER',
        conversation: {
          connect: {
            id: conversation.id,
          },
        },
        user: {
          connect: {
            id: ctx.user!.id,
          },
        },
      },
    })
    ;(await Ws.io.in('user:' + ctx.user!.id).fetchSockets()).forEach((socket) =>
      socket.join([
        'conversation:' + conversation.id,
        'channel:' + conversation.channels.find((c) => c.type === 'TEXT')?.id,
        'voiceChannel:' + conversation.channels.find((c) => c.type === 'VOICE')?.id,
        'channel/messages:' + conversation.channels.find((c) => c.type === 'TEXT')?.id,
      ])
    )

    Ws.io.to('user:' + ctx.user!.id).emit('CONVERSATION_CREATE', {
      id: conversation.id,
    })

    if (input.data.type === 'DM') {
      await db.conversationMember.create({
        data: {
          permission: 'OWNER',
          conversation: {
            connect: {
              id: conversation.id,
            },
          },
          user: {
            connect: {
              id: input.data.recipient,
            },
          },
        },
      })
      ;(await Ws.io.in('user:' + input.data.recipient).fetchSockets()).forEach((socket) =>
        socket.join([
          'conversation:' + conversation.id,
          'channel:' + conversation.channels.find((c) => c.type === 'TEXT')?.id,
          'voiceChannel:' + conversation.channels.find((c) => c.type === 'VOICE')?.id,
          'channel/messages:' + conversation.channels.find((c) => c.type === 'TEXT')?.id,
        ])
      )
      Ws.io.to('user:' + input.data.recipient).emit('CONVERSATION_CREATE', {
        id: conversation.id,
      })
    } else {
      await db.conversationMember.createMany({
        data: input.data.recipients.map((r) => ({
          permission: 'MEMBER' as ConversationMemberPermission,
          conversationID: conversation.id,
          userID: r,
        })),
      })

      await Promise.all(
        input.data.recipients.map(async (recipient) => {
          ;(await Ws.io.in('user:' + recipient).fetchSockets()).forEach((socket) =>
            socket.join([
              'conversation:' + conversation.id,
              'channel:' + conversation.channels.find((c) => c.type === 'TEXT'),
              'voiceChannel:' + conversation.channels.find((c) => c.type === 'VOICE')?.id,
              'channel/messages:' + conversation.channels.find((c) => c.type === 'TEXT'),
            ])
          )
        })
      )

      Ws.io.to('conversation:' + conversation.id).emit('CONVERSATION_CREATE', {
        id: conversation.id,
      })
    }

    return {
      id: conversation.id,
    }
  }

  public async get(ctx: HttpContextContract) {
    const id = ctx.request.param('id')

    const conversation = await db.conversation.findUnique({
      where: {
        id,
      },
      include: {
        members: true,
        channels: true,
      },
    })

    if (!conversation) return ctx.response.notFound({ error: 'ConversationNotFound' })
    if (!(await getMember(conversation.id, ctx.user!.id)))
      return ctx.response.notFound({ error: 'ConversationNotFound' })

    return ctx.response.ok({
      id: conversation.id,
      name: conversation.name,
      type: conversation.type,
      channelID: conversation.channels.find((c) => c.type === 'TEXT')?.id,
      voiceChannelID: conversation.channels.find((c) => c.type === 'VOICE')?.id,
    })
  }

  public async patch(ctx: HttpContextContract) {
    const id = ctx.request.param('id')
    const input = patchConversation.safeParse(ctx.request.body())
    if (!input.success) return ctx.response.badRequest({ error: input.error })

    const conversation = await db.conversation.findUnique({
      where: {
        id,
      },
      include: {
        members: true,
      },
    })

    if (!conversation) return ctx.response.notFound({ error: 'ConversationNotFound' })
    if (conversation.type !== 'GROUP')
      return ctx.response.badRequest({ error: 'InvalidConversationType' })

    const member = await getMember(conversation.id, ctx.user!.id)
    if (!member) return ctx.response.notFound({ error: 'ConversationNotFound' })
    if (member.permission !== 'ADMINISTRATOR' && member.permission !== 'OWNER')
      return ctx.response.badRequest({ error: 'InsufficientPermissions' })

    await db.conversation.update({
      where: {
        id,
      },
      data: {
        name: input.data.name,
      },
    })

    Ws.io.to('conversation:' + conversation.id).emit('CONVERSATION_UPDATE', {
      id: conversation.id,
      name: input.data.name,
      authorID: ctx.user!.id,
    })

    return ctx.response.ok(undefined)
  }

  public async getMembers(ctx: HttpContextContract) {
    const id = ctx.request.param('id')

    const conversation = await db.conversation.findUnique({
      where: {
        id,
      },
      include: {
        members: true,
      },
    })

    if (!conversation) return ctx.response.notFound({ error: 'ConversationNotFound' })
    if (!(await getMember(conversation.id, ctx.user!.id)))
      return ctx.response.notFound({ error: 'ConversationNotFound' })

    return ctx.response.ok(
      conversation.members.map((m) => ({ permission: m.permission, userID: m.userID }))
    )
  }

  public async putMember(ctx: HttpContextContract) {
    const input = putConversationMember.safeParse(ctx.request.body())
    if (!input.success) return ctx.response.badRequest({ error: input.error })

    const id = ctx.request.param('id')
    const userID = ctx.request.param('userID')

    const conversation = await db.conversation.findUnique({
      where: {
        id,
      },
      include: {
        channels: true,
      },
    })

    if (!conversation) return ctx.response.notFound({ error: 'ConversationNotFound' })
    if (conversation.type !== 'GROUP')
      return ctx.response.badRequest({ error: 'InvalidConversationType' })

    const member = await getMember(conversation.id, ctx.user!.id)
    if (!member) return ctx.response.notFound({ error: 'ConversationNotFound' })

    const recipient = await db.user.findUnique({
      where: {
        id: userID,
      },
    })

    if (!recipient) return ctx.response.notFound({ error: 'RecipientNotFound' })

    const recipientMember = await db.conversationMember.findUnique({
      where: {
        userID_conversationID: {
          userID: recipient.id,
          conversationID: conversation.id,
        },
      },
    })

    if (!recipientMember) {
      if (await isBlocked(ctx.user!.id, recipient.id))
        return ctx.response.notFound({ error: 'RecipientNotFound' })

      if (!(await areFriends(ctx.user!.id, recipient.id)))
        return ctx.response.badRequest({ error: 'NotFriends' })
    }

    if (
      input.data.permission === 'ADMINISTRATOR' &&
      !(member.permission === 'ADMINISTRATOR' || member.permission === 'OWNER')
    )
      return ctx.response.badRequest({ error: 'InsufficientPermissions' })

    if (input.data.permission === 'OWNER' && member.permission !== 'OWNER')
      return ctx.response.badRequest({ error: 'InsufficientPermissions' })

    if (input.data.permission) {
      await db.conversationMember.upsert({
        where: {
          userID_conversationID: {
            userID: recipient.id,
            conversationID: conversation.id,
          },
        },
        create: {
          user: {
            connect: {
              id: recipient.id,
            },
          },
          conversation: {
            connect: {
              id: conversation.id,
            },
          },
          permission: input.data.permission,
        },
        update: {
          permission: input.data.permission,
        },
      })

      Ws.io
        .to('conversation:' + conversation.id)
        .emit(!recipientMember ? 'MEMBER_ADD' : 'MEMBER_UPDATE', {
          id: conversation.id,
          userID: recipient.id,
          authorID: ctx.user!.id,
          permission: input.data.permission,
        })
      if (!recipientMember) {
        ;(await Ws.io.in('user:' + recipient.id).fetchSockets()).forEach((socket) =>
          [
            'conversation:' + conversation.id,
            'channel:' + conversation.channels.find((c) => c.type === 'TEXT')?.id,
            'voiceChannel:' + conversation.channels.find((c) => c.type === 'VOICE')?.id,
            'channel/messages:' + conversation.channels.find((c) => c.type === 'TEXT')?.id,
          ].forEach((room) => socket.leave(room))
        )

        Ws.io.to('user:' + recipient.id).emit('CONVERSATION_CREATE', {
          id: conversation.id,
        })
      }
    }
    return ctx.response.ok(undefined)
  }

  public async removeMember(ctx: HttpContextContract) {
    const id = ctx.request.param('id')
    const userID = ctx.request.param('userID')

    const conversation = await db.conversation.findUnique({
      where: {
        id,
      },
      include: {
        channels: true,
      },
    })

    if (!conversation) return ctx.response.notFound({ error: 'ConversationNotFound' })
    if (conversation.type !== 'GROUP')
      return ctx.response.badRequest({ error: 'InvalidConversationType' })

    const member = await getMember(conversation.id, ctx.user!.id)
    if (!member) return ctx.response.notFound({ error: 'ConversationNotFound' })

    const recipient = await db.user.findUnique({
      where: {
        id: userID,
      },
    })

    if (!recipient) return ctx.response.notFound({ error: 'RecipientNotFound' })

    const recipientMember = await db.conversationMember.findUnique({
      where: {
        userID_conversationID: {
          userID: recipient.id,
          conversationID: conversation.id,
        },
      },
    })

    if (!recipientMember) return ctx.response.notFound({ error: 'RecipientMemberNotFound' })

    if (recipientMember.permission === 'OWNER')
      return ctx.response.badRequest({ error: 'InsufficientPermissions' })

    if (recipientMember.permission === 'ADMINISTRATOR' && member.permission !== 'OWNER')
      return ctx.response.badRequest({ error: 'InsufficientPermissions' })

    if (
      recipientMember.permission === 'MEMBER' &&
      !(member.permission === 'OWNER' || member.permission === 'ADMINISTRATOR')
    )
      return ctx.response.badRequest({ error: 'InsufficientPermissions' })

    await db.conversationMember.delete({
      where: {
        userID_conversationID: {
          userID: recipient.id,
          conversationID: conversation.id,
        },
      },
    })

    Ws.io.to('conversation:' + conversation.id).emit('MEMBER_REMOVE', {
      id: conversation.id,
      userID: recipient.id,
      authorID: ctx.user!.id,
    })
    ;(await Ws.io.in('user:' + ctx.user!.id).fetchSockets()).forEach((socket) =>
      [
        'conversation:' + conversation.id,
        'channel:' + conversation.channels.find((c) => c.type === 'TEXT')?.id,
        'voiceChannel:' + conversation.channels.find((c) => c.type === 'VOICE')?.id,
        'channel/messages:' + conversation.channels.find((c) => c.type === 'TEXT')?.id,
      ].forEach((room) => socket.leave(room))
    )

    Ws.io.to('user:' + recipient.id).emit('MEMBER_REMOVE', {
      id: conversation.id,
      userID: recipient.id,
    })

    return ctx.response.ok(undefined)
  }

  public async leave(ctx: HttpContextContract) {
    const id = ctx.request.param('id')

    const conversation = await db.conversation.findUnique({
      where: {
        id,
      },
      include: {
        channels: true,
      },
    })

    if (!conversation) return ctx.response.notFound({ error: 'ConversationNotFound' })

    const member = await getMember(conversation.id, ctx.user!.id)
    if (!member) return ctx.response.notFound({ error: 'ConversationNotFound' })

    await db.conversationMember.delete({
      where: {
        userID_conversationID: {
          userID: ctx.user!.id,
          conversationID: conversation.id,
        },
      },
    })
    ;(await Ws.io.in('user:' + ctx.user!.id).fetchSockets()).forEach((socket) =>
      [
        'conversation:' + conversation.id,
        'channel:' + conversation.channels.find((c) => c.type === 'TEXT')?.id,
        'voiceChannel:' + conversation.channels.find((c) => c.type === 'VOICE')?.id,
        'channel/messages:' + conversation.channels.find((c) => c.type === 'TEXT')?.id,
      ].forEach((room) => socket.leave(room))
    )

    Ws.io.to('conversation:' + conversation.id).emit('MEMBER_LEAVE', {
      id: conversation.id,
      userID: ctx.user!.id,
    })

    return ctx.response.ok(undefined)
  }
}
