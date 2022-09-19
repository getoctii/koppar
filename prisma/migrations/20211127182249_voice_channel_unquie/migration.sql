/*
  Warnings:

  - A unique constraint covering the columns `[voiceChannelID]` on the table `Conversation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Conversation_voiceChannelID_key" ON "Conversation"("voiceChannelID");
