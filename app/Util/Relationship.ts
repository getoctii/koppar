import { db } from 'Config/db'

export const isBlocked = async (userID: string, recipientID: string) => {
  const relationship = await db.relationship.findFirst({
    where: {
      userID: recipientID,
      recipientID: userID,
      type: 'BLOCKED',
    },
  })

  return !!relationship
}

export const areFriends = async (userID: string, recipientID: string) => {
  return !!(
    (await db.relationship.findFirst({
      where: {
        userID,
        recipientID,
        type: 'OUTGOING',
      },
    })) &&
    (await db.relationship.findFirst({
      where: {
        userID: recipientID,
        recipientID: userID,
        type: 'OUTGOING',
      },
    }))
  )
}
