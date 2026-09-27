import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/server/http";
import { SESSION_COOKIE, SESSION_DAYS, createSessionToken, passwordMatches } from "@/server/session";

const body = z.object({ password: z.string().max(200) });

export const POST = api(async req => {
  const { password } = body.parse(await req.json());
  if (!passwordMatches(password)) {
    // Atraso fixo deixa chute de senha lento demais para valer a pena.
    await new Promise(r => setTimeout(r, 800));
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return res;
}, { auth: false });
