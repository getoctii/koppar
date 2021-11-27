import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { getCommunityMember } from 'App/Util/Community'
import { hasPermissions } from 'App/Util/Group'
import { createChannel } from 'App/Validators/CreateChannelValidator'
import { createCommunity } from 'App/Validators/CreateCommunityValidator'
import { createGroup } from 'App/Validators/CreateGroupValidator'
import { swapChannels } from 'App/Validators/SwapChannelsValidator'
import { db } from 'Config/db'

export default class CommunitiesController {
  public async create(ctx: HttpContextContract) {
    const input = createCommunity.safeParse(ctx.request.body())
    if (!input.success) return ctx.response.badRequest({ error: input.error })

    const community = await db.community.create({
      data: {
        name: input.data.name,
        ownerID: ctx.user!.id,
        members: {
          create: {
            userID: ctx.user!.id,
          },
        },
      },
    })

    return {
      id: community.id,
    }
  }

  public async get(ctx: HttpContextContract) {
    const id = ctx.request.param('id')

    const community = await db.community.findUnique({
      where: {
        id,
      },
      include: {
        channels: true,
      },
    })

    if (!community) return ctx.response.notFound({ error: 'CommunityNotFound' })
    if (!(await getCommunityMember(id, ctx.user!.id)))
      return ctx.response.notFound({ error: 'CommunityNotFound' })

    return {
      id: community.id,
      flags: community.flags,
      ownerID: community.ownerID,
      icon: community.icon,
      description: community.description,
      name: community.name,
      banner: community.banner,
    }
  }

  public async getChannels(ctx: HttpContextContract) {
    const id = ctx.request.param('id')

    const community = await db.community.findUnique({
      where: {
        id,
      },
      include: {
        channels: true,
      },
    })

    if (!community) return ctx.response.notFound({ error: 'CommunityNotFound' })
    if (!(await getCommunityMember(id, ctx.user!.id)))
      return ctx.response.notFound({ error: 'CommunityNotFound' })

    return community.channels.map((c) => c.id)
  }

  public async createChannel(ctx: HttpContextContract) {
    const input = createChannel.safeParse(ctx.request.body())
    if (!input.success) return ctx.response.badRequest({ error: input.error })

    const id = ctx.request.param('id')

    const community = await db.community.findUnique({
      where: {
        id,
      },
    })

    if (!community) return ctx.response.notFound({ error: 'CommunityNotFound' })
    if (!(await getCommunityMember(id, ctx.user!.id)))
      return ctx.response.notFound({ error: 'CommunityNotFound' })

    if (!(await hasPermissions(id, ctx.user!.id, ['MANAGE_CHANNELS'])))
      return ctx.response.unauthorized({ error: 'InsufficentPermission' })
    const channel = await db.channel.create({
      data: {
        type: input.data.type ?? 'TEXT',
        communityID: community.id,
        name: input.data.name,
      },
    })

    return ctx.response.ok({ id: channel.id })
  }

  public async getGroups(ctx: HttpContextContract) {
    const id = ctx.request.param('id')

    const community = await db.community.findUnique({
      where: {
        id,
      },
      include: {
        groups: true,
      },
    })

    if (!community) return ctx.response.notFound({ error: 'CommunityNotFound' })
    if (!(await getCommunityMember(id, ctx.user!.id)))
      return ctx.response.notFound({ error: 'CommunityNotFound' })

    return community.groups.map((c) => c.id)
  }

  public async createGroup(ctx: HttpContextContract) {
    const id = ctx.request.param('id')
    const input = createGroup.safeParse(ctx.request.body())
    if (!input.success) return ctx.response.badRequest({ error: input.error })
    const community = await db.community.findUnique({
      where: {
        id,
      },
    })

    if (!community) return ctx.response.notFound({ error: 'CommunityNotFound' })
    if (!(await getCommunityMember(id, ctx.user!.id)))
      return ctx.response.notFound({ error: 'CommunityNotFound' })

    if (!(await hasPermissions(id, ctx.user!.id, ['MANAGE_GROUPS'])))
      return ctx.response.unauthorized({ error: 'InsufficentPermission' })
    const group = await db.group.create({
      data: {
        community: {
          connect: {
            id,
          },
        },
        name: input.data.name,
        permissions: input.data.permissions,
      },
    })

    return ctx.response.ok({ id: group.id })
  }

  public async swapChannels(ctx: HttpContextContract) {
    const input = swapChannels.safeParse(ctx.request.body())
    if (!input.success) return ctx.response.badRequest({ error: input.error })
    const id = ctx.request.param('id')
    const community = await db.community.findUnique({
      where: {
        id,
      },
    })

    if (!community) return ctx.response.notFound({ error: 'CommunityNotFound' })
    if (!(await getCommunityMember(id, ctx.user!.id)))
      return ctx.response.notFound({ error: 'CommunityNotFound' })

    if (!(await hasPermissions(id, ctx.user!.id, ['MANAGE_CHANNELS'])))
      return ctx.response.unauthorized({ error: 'InsufficentPermission' })
  }
}
