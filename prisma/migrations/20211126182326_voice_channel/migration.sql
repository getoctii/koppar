-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "voiceChannelID" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "voiceRoomID" TEXT,
ALTER COLUMN "state" SET DEFAULT E'ONLINE';

-- CreateTable
CREATE TABLE "VoiceRoom" (
    "id" TEXT NOT NULL,
    "channelID" TEXT NOT NULL,
    "serverID" TEXT NOT NULL,

    CONSTRAINT "VoiceRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VoiceRoom_channelID_key" ON "VoiceRoom"("channelID");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_voiceRoomID_fkey" FOREIGN KEY ("voiceRoomID") REFERENCES "VoiceRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_voiceChannelID_fkey" FOREIGN KEY ("voiceChannelID") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceRoom" ADD CONSTRAINT "VoiceRoom_channelID_fkey" FOREIGN KEY ("channelID") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
