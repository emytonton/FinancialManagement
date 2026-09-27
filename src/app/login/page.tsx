"use client";
import { useState } from "react";
import { Button, Field, Icon, Input } from "@/components/ui";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      // Recarga completa para o servidor ler o cookie novo.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (res.ok) { window.location.href = "/"; return; }
      const json = await res.json().catch(() => null);
      setError(json?.error || "Não foi possível entrar");
      setPassword("");
    } catch {
      setError("Sem conexão com o servidor");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="b-app b-login">
      <form className="b-login-box" onSubmit={submit}>
        <div className="b-logo"><span className="b-logo-mark" aria-hidden="true" /><span>Bolso</span></div>
        <p>Digite sua senha para ver suas finanças.</p>
        <Field label="Senha" error={error}>
          <Input type="password" autoComplete="current-password" autoFocus value={password} onChange={e => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </Button>
        <p className="b-muted b-small" style={{ display: "flex", gap: 6, alignItems: "center" }}><Icon name="lock" size={14} />Sua sessão dura 30 dias neste aparelho.</p>
      </form>
    </div>
  );
}
