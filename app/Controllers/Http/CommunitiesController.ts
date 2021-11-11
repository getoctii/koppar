import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { getCommunityMember } from 'App/Util/Community'
import { createCommunity } from 'App/Validators/CreateCommunityValidator'
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
}
