import { db } from 'Config/db'
import { getCommunityMember } from './Community'
import { getMember } from './Conversation'

export const inChannel = async (channel: string, user: string) => {
  const c = await db.channel.findUnique({
    where: {
      id: channel,
    },
    include: {
      conversation: true,
      community: true,
    },
  })
  if (!c) return new Error("Can't be in a channel that doesn't exist :/")

  if (c.conversation) {
    return !!(await getMember(c.conversation.id, user))
  } else if (c.community) {
    // TODO: More advanced checks
    return !!(await getCommunityMember(c.community.id, user))
  } else {
    return false
  }
}
