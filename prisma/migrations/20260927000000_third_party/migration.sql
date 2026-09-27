-- AlterTable
ALTER TABLE "Category" ADD COLUMN "thirdParty" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PersonPayment" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "categoryId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PersonPayment_pkey" PRIMARY KEY ("id")
);
