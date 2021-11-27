import { z } from 'zod'

export const createGroup = z.object({
  name: z.string().min(1).max(32),
  permissions: z
    .enum([
      'READ_MESSAGES',
      'SEND_MESSAGES',
      'EMBED_LINKS',
      'MENTION_MEMBERS',
      'MENTION_GROUPS',
      'MENTION_EVERYONE',
      'CREATE_INVITES',
      'KICK_MEMBERS',
      'BAN_MEMBERS',
      'MANAGE_INVITES',
      'MANAGE_MESSAGES',
      'MANAGE_GROUPS',
      'MANAGE_CHANNELS',
      'MANAGE_COMMUNITY',
      'MANAGE_PRODUCTS',
      'ADMINISTRATOR',
      'OWNER',
    ])
    .array()
    .optional(),
})
