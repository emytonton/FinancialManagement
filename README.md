# Bolso

App pessoal de finanças que responde uma pergunta em poucos segundos: **quanto eu ainda posso gastar?**

Front e back no mesmo projeto Next.js, dados num Postgres (Neon), acesso protegido por senha. Feito para uso próprio, no computador e no celular.

## Stack

- **Next.js 16** (App Router): telas em React e API em Route Handlers (`src/app/api`)
- **Prisma 7** + **PostgreSQL** (Neon em produção, PGlite no desenvolvimento)
- **Zod** para validar tudo que chega na API
- Design system Bolso (tokens em `src/app/tokens.css`, componentes em `src/components`)

## Como o "livre para gastar" é calculado

```
Em conta agora        = saldo do dia 1º + entradas do mês − saídas já pagas
− Faturas dos cartões = compras no cartão neste mês + parcelas do mês
− Fatura anterior     = o que ainda não foi pago da fatura que vence neste mês
− Contas a vencer     = contas fixas pendentes ou atrasadas
− Reembolsos          = sua parte em compras que outra pessoa pagou
− Falta guardar       = (% de guardar × entradas do mês) − o que já foi guardado
= Livre para gastar   → dividido pelos dias restantes = "R$ por dia"
```

Toda essa conta fica em `src/lib/finance.ts` (funções puras, sem banco).

## Gastos de outras pessoas no seu cartão

Uma categoria marcada como **Gasto de outra pessoa** (ex.: Mãe, Pai) fica fora de gastos, orçamento, gráficos e insights. Em **Cartões**, a seção "Quanto cobrar" mostra quanto cada pessoa gastou no mês e o botão **Recebi** registra o que ela te devolveu (esse dinheiro entra na conta, mas não conta como receita).

No "livre para gastar", da fatura só sai a sua parte enquanto a pessoa não te paga. Quando ela paga, o dinheiro dela fica reservado para a fatura. Se você pagar a fatura inteira antes de receber, o livre cai pelo valor dela e volta quando você marcar Recebi.

## Rodando localmente

Precisa de Node 20+.

```bash
npm install
cp .env.example .env        # e preencha APP_PASSWORD e SESSION_SECRET
npm run db:local            # sobe um Postgres local (PGlite) na porta 5433; deixe rodando
npx prisma migrate deploy   # em outro terminal: cria as tabelas
npm run dev                 # http://localhost:3000
```

Para gerar o `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

No primeiro acesso o banco é criado vazio, só com as categorias padrão. Para explorar com dados inventados: Configurações → Restaurar dados de exemplo.

## Deploy na Vercel

1. Em [vercel.com/new](https://vercel.com/new), importe este repositório. O framework é detectado como Next.js; não mude os comandos.
2. Antes do primeiro deploy (ou logo depois, se ele falhar por falta de banco), vá em **Storage → Create Database → Neon** e conecte ao projeto. Escolha a região **São Paulo** (`sa-east-1`) para ficar perto das funções, que o `vercel.json` já coloca em `gru1`. A integração cria `DATABASE_URL` e `DATABASE_URL_UNPOOLED` sozinha.
3. Em **Settings → Environment Variables**, adicione:
   - `APP_PASSWORD`: a senha de acesso ao app (use uma longa)
   - `SESSION_SECRET`: gerado com o comando acima
4. Faça um novo deploy (**Deployments → Redeploy**). O build roda `prisma migrate deploy` e cria as tabelas no Neon.
5. No celular, abra o endereço, entre com a senha e use "Adicionar à tela de início" para abrir como app.

Trocar o `SESSION_SECRET` desconecta todos os aparelhos. Trocar o `APP_PASSWORD` não derruba sessões já abertas; para isso troque também o `SESSION_SECRET`.

## Estrutura

```
prisma/
  schema.prisma              tabelas (uma por tipo de lançamento)
  migrations/                SQL aplicado no deploy
src/
  proxy.ts                   barra quem não está logado
  app/
    (app)/                   telas: Início, Transações, Cartões, Orçamento, Metas, Calendário, Receitas, Configurações
    login/                   tela de senha
    api/
      auth/login, logout     sessão por cookie assinado (30 dias)
      data                   GET tudo · PUT substitui tudo (importar, exemplo, apagar)
      [collection]/[id]      PUT cria/atualiza · DELETE apaga um item
      settings               PATCH configurações
      carry/[month]          PUT saldo do dia 1º
  server/                    banco, sessão, validação (só roda no servidor)
  lib/                       cálculo financeiro e formatação (roda nos dois lados)
  components/
    ui.tsx, finance-ui.tsx   componentes do design system
    app/                     estado, sincronização com a API, formulários, moldura
    screens/                 uma tela por arquivo
```

Coleções aceitas em `/api/[collection]/[id]`: `categories`, `sources`, `incomes`, `txs`, `bills`, `cards`, `cardPayments`, `installments`, `goals`, `contributions`.

## Privacidade

- O repositório é público: nada de senha ou dado real no código. Tudo sensível fica nas variáveis de ambiente.
- O app não é indexado por buscadores (`robots: noindex`).
- "Ocultar valores" vale por aparelho. "Bloquear ao abrir" (PIN) é uma trava visual na tela; a proteção de verdade é a senha de login.
- Configurações → Exportar/Fazer backup baixa um `.json` com tudo; Importar aceita o mesmo arquivo.
