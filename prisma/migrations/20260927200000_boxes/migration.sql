-- AlterTable
ALTER TABLE "CardPayment" ADD COLUMN "fromBox" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Box" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "cardId" TEXT,

    CONSTRAINT "Box_pkey" PRIMARY KEY ("id")
);

-- Caixinhas iniciais. As dos cartões se ligam ao cartão pelo nome, se ele existir.
INSERT INTO "Box" ("id", "name", "icon", "amount", "cardId") VALUES
    ('cx-nubank', 'Cartão Nubank', 'card', 0, (SELECT "id" FROM "Card" WHERE "name" ILIKE '%nubank%' ORDER BY "seq" LIMIT 1)),
    ('cx-mp', 'Cartão Mercado Pago', 'card', 0, (SELECT "id" FROM "Card" WHERE "name" ILIKE '%mercado%' ORDER BY "seq" LIMIT 1)),
    ('cx-casa', 'Contas de Casa', 'house', 0, NULL),
    ('cx-reserva', 'Reserva', 'shield', 0, NULL),
    ('cx-academia', 'Academia', 'heart', 0, NULL)
ON CONFLICT ("id") DO NOTHING;
