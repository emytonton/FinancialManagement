import { createHmac, timingSafeEqual } from "node:crypto";

// Sessão sem banco: o cookie guarda a data de expiração assinada com HMAC.
// Trocar SESSION_SECRET na Vercel derruba todas as sessões abertas.

export const SESSION_COOKIE = "bolso_session";
export const SESSION_DAYS = 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET ausente ou curto (mínimo 32 caracteres)");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(now = Date.now()) {
  const exp = String(now + SESSION_DAYS * 24 * 60 * 60 * 1000);
  return exp + "." + sign(exp);
}

export function isValidSession(token: string | undefined, now = Date.now()) {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  const expected = Buffer.from(sign(exp));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return false;
  return Number(exp) > now;
}

export function passwordMatches(input: string) {
  const real = process.env.APP_PASSWORD;
  if (!real) throw new Error("APP_PASSWORD não configurada");
  // Compara os hashes para não vazar o tamanho da senha pelo tempo de resposta.
  const a = createHmac("sha256", "pw").update(input).digest();
  const b = createHmac("sha256", "pw").update(real).digest();
  return timingSafeEqual(a, b);
}
