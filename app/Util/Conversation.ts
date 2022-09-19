import { db } from 'Config/db'

export const getMember = (conversation: string, user: string) => {
  return db.conversationMember.findUnique({
    where: {
      userID_conversationID: {
        userID: user,
        conversationID: conversation,
      },
    },
  })
}
