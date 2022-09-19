-- CreateEnum
CREATE TYPE "UserState" AS ENUM ('OFFLINE', 'IDLE', 'DND', 'ONLINE');

-- CreateEnum
CREATE TYPE "UserBadges" AS ENUM ('STAFF');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('FRIEND', 'INCOMING', 'OUTGOING', 'BLOCKED');

-- CreateEnum
CREATE TYPE "UserFlags" AS ENUM ('DEVELOPER', 'DISABLED');

-- CreateEnum
CREATE TYPE "ConversationMemberPermission" AS ENUM ('MEMBER', 'ADMINISTRATOR', 'OWNER');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('DM', 'GROUP');

-- CreateEnum
CREATE TYPE "CommunityFlags" AS ENUM ('OFFICAL', 'DEVELOPER');

-- CreateEnum
CREATE TYPE "GroupPermissions" AS ENUM ('READ_MESSAGES', 'SEND_MESSAGES', 'EMBED_LINKS', 'MENTION_MEMBERS', 'MENTION_GROUPS', 'MENTION_EVERYONE', 'CREATE_INVITES', 'KICK_MEMBERS', 'BAN_MEMBERS', 'MANAGE_INVITES', 'MANAGE_MESSAGES', 'MANAGE_GROUPS', 'MANAGE_CHANNELS', 'MANAGE_COMMUNITY', 'MANAGE_PRODUCTS', 'ADMINISTRATOR', 'OWNER');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('CONVERSATION', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "ChannelPermissions" AS ENUM ('READ_MESSAGES', 'SEND_MESSAGES', 'EMBED_LINKS', 'MENTION_MEMBERS', 'MENTION_GROUPS', 'MENTION_EVERYONE', 'MANAGE_CHANNEL');

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "type" "RelationshipType" NOT NULL,
    "userID" TEXT NOT NULL,
    "recipientID" TEXT NOT NULL,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keychain" (
    "id" TEXT NOT NULL,
    "encryptedKeychain" JSONB NOT NULL,
    "publicKeychain" JSONB NOT NULL,
    "salt" INTEGER[],
    "userID" TEXT NOT NULL,

    CONSTRAINT "Keychain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "discriminator" INTEGER NOT NULL,
    "avatar" TEXT,
    "email" TEXT NOT NULL,
    "status" TEXT,
    "state" "UserState" NOT NULL DEFAULT E'OFFLINE',
    "badges" "UserBadges"[],
    "flags" "UserFlags"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totpCode" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMember" (
    "conversationID" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "permission" "ConversationMemberPermission" NOT NULL,

    CONSTRAINT "ConversationMember_pkey" PRIMARY KEY ("userID","conversationID")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL,
    "channelID" TEXT NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMember" (
    "id" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "communityID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "banner" TEXT,
    "description" TEXT,
    "flags" "CommunityFlags"[],

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "communityID" TEXT NOT NULL,
    "authorID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uses" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "permissions" "GroupPermissions"[],
    "communityID" TEXT NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelOverrides" (
    "channelID" TEXT NOT NULL,
    "groupID" TEXT NOT NULL,
    "allow" "ChannelPermissions"[],
    "deny" "ChannelPermissions"[],

    CONSTRAINT "ChannelOverrides_pkey" PRIMARY KEY ("channelID","groupID")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "type" "ChannelType" NOT NULL,
    "communityID" TEXT,
    "baseAllow" "ChannelPermissions"[],
    "baseDeny" "ChannelPermissions"[],

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "payload" JSONB NOT NULL,
    "channelID" TEXT NOT NULL,
    "authorID" TEXT NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CommunityMemberToGroup" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Keychain_userID_key" ON "Keychain"("userID");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_discriminator_key" ON "User"("username", "discriminator");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_channelID_key" ON "Conversation"("channelID");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");

-- CreateIndex
CREATE UNIQUE INDEX "_CommunityMemberToGroup_AB_unique" ON "_CommunityMemberToGroup"("A", "B");

-- CreateIndex
CREATE INDEX "_CommunityMemberToGroup_B_index" ON "_CommunityMemberToGroup"("B");

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_recipientID_fkey" FOREIGN KEY ("recipientID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keychain" ADD CONSTRAINT "Keychain_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_conversationID_fkey" FOREIGN KEY ("conversationID") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_channelID_fkey" FOREIGN KEY ("channelID") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_communityID_fkey" FOREIGN KEY ("communityID") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_communityID_fkey" FOREIGN KEY ("communityID") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_authorID_fkey" FOREIGN KEY ("authorID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_communityID_fkey" FOREIGN KEY ("communityID") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelOverrides" ADD CONSTRAINT "ChannelOverrides_channelID_fkey" FOREIGN KEY ("channelID") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelOverrides" ADD CONSTRAINT "ChannelOverrides_groupID_fkey" FOREIGN KEY ("groupID") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_communityID_fkey" FOREIGN KEY ("communityID") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_channelID_fkey" FOREIGN KEY ("channelID") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorID_fkey" FOREIGN KEY ("authorID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommunityMemberToGroup" ADD FOREIGN KEY ("A") REFERENCES "CommunityMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommunityMemberToGroup" ADD FOREIGN KEY ("B") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
