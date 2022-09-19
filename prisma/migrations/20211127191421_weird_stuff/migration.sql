/*
  Warnings:

  - You are about to drop the column `channelID` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `voiceChannelID` on the `Conversation` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_channelID_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_voiceChannelID_fkey";

-- DropIndex
DROP INDEX "Conversation_channelID_key";

-- DropIndex
DROP INDEX "Conversation_voiceChannelID_key";

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "conversationID" TEXT;

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "channelID",
DROP COLUMN "voiceChannelID";

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_conversationID_fkey" FOREIGN KEY ("conversationID") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
