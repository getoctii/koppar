import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { getCommunityMember } from 'App/Util/Community'
import { hasPermissions } from 'App/Util/Group'
import { db } from 'Config/db'

export default class GroupsController {
  public async get(ctx: HttpContextContract) {
    const id = ctx.request.param('id')

    const group = await db.group.findUnique({
      where: {
        id,
      },
    })

    if (!group) return ctx.response.notFound({ error: 'ChannelNotFound' })

    return {
      id: group.id,
      name: group.name,
      communityID: group.communityID,
      color: group.color,
      permissions: group.permissions,
    }
  }

  public async delete(ctx: HttpContextContract) {
    const id = ctx.request.param('id')

    const group = await db.group.findUnique({
      where: {
        id,
      },
      include: {
        community: true,
      },
    })

    if (!group?.community) return ctx.response.notFound({ error: 'CommunityNotFound' })
    if (!(await getCommunityMember(id, ctx.user!.id)))
      return ctx.response.notFound({ error: 'CommunityNotFound' })

    if (!(await hasPermissions(group.community.id, ctx.user!.id, ['MANAGE_GROUPS'])))
      return ctx.response.unauthorized({ error: 'InsufficentPermission' })

    await db.groupMember.deleteMany({
      where: {
        groupID: id,
      },
    })
    await db.group.delete({
      where: {
        id,
      },
    })

    return ctx.response.ok(undefined)
  }
}
