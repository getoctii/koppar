import { GroupPermissions } from '.prisma/client'
import { db } from 'Config/db'

export const retriveGroups = async (communityID: string, memberID: string) => {
  const groups = await db.groupMember.findMany({
    where: {
      memberCommunityID: communityID,
      memberUserID: memberID,
    },
    include: {
      group: true,
    },
    orderBy: {
      group: {
        position: 'desc',
      },
    },
  })
  return groups
}

export const retrivePermissions = async (
  basePermissions: GroupPermissions[],
  communityID: string,
  memberID: string
) => {
  const groups = await retriveGroups(communityID, memberID)

  const totalPermissions = [...basePermissions, ...groups.map((g) => g.group.permissions)]

  return totalPermissions
}

export const hasPermissions = async (
  communityID: string,
  memberID: string,
  permissions: GroupPermissions[]
) => {
  const community = await db.community.findUnique({
    where: {
      id: communityID,
    },
  })

  if (community?.ownerID === memberID) return true

  const currentPermissions = await retrivePermissions(
    community?.basePermissions ?? [],
    communityID,
    memberID
  )

  if (currentPermissions.includes('OWNER') || currentPermissions.includes('ADMINISTRATOR'))
    return true
  return permissions.every((perm) => currentPermissions.includes(perm))
}
