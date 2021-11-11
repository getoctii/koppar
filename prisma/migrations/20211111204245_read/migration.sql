-- CreateTable
CREATE TABLE "Read" (
    "userID" TEXT NOT NULL,
    "channelID" TEXT NOT NULL,
    "lastReadMessageID" TEXT NOT NULL,

    CONSTRAINT "Read_pkey" PRIMARY KEY ("channelID","userID")
);

-- AddForeignKey
ALTER TABLE "Read" ADD CONSTRAINT "Read_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Read" ADD CONSTRAINT "Read_channelID_fkey" FOREIGN KEY ("channelID") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
