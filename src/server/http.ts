import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SESSION_COOKIE, isValidSession } from "./session";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireSession() {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) throw new HttpError(401, "Sessão expirada");
}

// Envolve cada rota: confere a sessão, transforma erros em respostas JSON.
export function api<A extends unknown[]>(fn: (req: Request, ...rest: A) => Promise<unknown>, opts: { auth?: boolean } = {}) {
  return async (req: Request, ...rest: A) => {
    try {
      if (opts.auth !== false) await requireSession();
      const out = await fn(req, ...rest);
      return out instanceof Response ? out : NextResponse.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: "Dados inválidos", issues: e.issues }, { status: 400 });
      if (e instanceof SyntaxError) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
      console.error(e);
      return NextResponse.json({ error: "Erro no servidor" }, { status: 500 });
    }
  };
}
