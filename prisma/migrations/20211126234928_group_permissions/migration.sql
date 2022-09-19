-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "position" INTEGER;

-- AlterTable
ALTER TABLE "Community" ADD COLUMN     "basePermissions" "GroupPermissions"[];

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "position" INTEGER;
