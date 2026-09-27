import "dotenv/config";
import { defineConfig } from "prisma/config";

// Na Vercel com Neon, DATABASE_URL é a conexão com pooler e
// DATABASE_URL_UNPOOLED a direta; migrações precisam da direta.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  },
});
