-- CreateTable
CREATE TABLE "Repayment" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "person" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Repayment_pkey" PRIMARY KEY ("id")
);
