import { db } from 'Config/db'

export const getCommunityMember = async (community: string, user: string) => {
  return await db.communityMember.findUnique({
    where: {
      communityID_userID: {
        communityID: community,
        userID: user,
      },
    },
  })
}
