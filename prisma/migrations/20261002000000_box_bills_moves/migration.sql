-- AlterTable
ALTER TABLE "Box" ADD COLUMN "forBills" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Bill" ADD COLUMN "fromBox" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "BoxMove" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "boxId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "BoxMove_pkey" PRIMARY KEY ("id")
);

-- A caixinha inicial "Contas de Casa" passa a ser a reserva das contas fixas.
UPDATE "Box" SET "forBills" = true WHERE "id" = 'cx-casa' AND "cardId" IS NULL;
