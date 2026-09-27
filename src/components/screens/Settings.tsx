"use client";
import { useRef, useState } from "react";
import { isoToday } from "@/lib/format";
import { emptyData, mockData } from "@/lib/finance";
import type { Data } from "@/lib/types";
import { Button, Card, Confirm, Field, Icon, Input, Money, Notice, Segmented, Toggle } from "../ui";
import { useApp } from "../app/store";
import { PageHead } from "./common";

export function Settings() {
  const app = useApp();
  const { data } = app;
  const s = data.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"wipe" | "fresh" | "demo" | null>(null);
  const [pin, setPin] = useState(s.pin || "");
  const [busy, setBusy] = useState(false);

  const exportJson = (name: string) => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      app.toast("Arquivo gerado: " + name);
    } catch { app.toast("Não foi possível exportar agora"); }
  };

  const doReplace = async (d: Data, okMsg: string) => {
    setBusy(true);
    try { await app.replace(d); app.toast(okMsg); return true; }
    catch (e) { app.toast("Não foi possível salvar: " + (e as Error).message); return false; }
    finally { setBusy(false); }
  };

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      try {
        const d = JSON.parse(String(r.result));
        if (!d || !Array.isArray(d.txs) || !d.settings) throw new Error("formato");
        const ok = await doReplace(d, "Dados importados");
        setImportErr(ok ? null : "O servidor recusou o arquivo. Nada foi alterado.");
      } catch { setImportErr("Esse arquivo não parece um backup do Bolso. Nada foi alterado."); }
    };
    r.readAsText(f);
    e.target.value = "";
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    // Recarga completa para o servidor ler o cookie novo.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  };

  return <>
    <PageHead title="Configurações" sub="Seus dados ficam salvos no servidor e aparecem no celular e no computador" />
    <div className="b-settings">
      <Card title="Planejamento">
        <Field label="Seu nome"><Input value={s.name} maxLength={40} onChange={e => app.setSettings({ name: e.target.value }, { debounce: true })} /></Field>
        <Field label="Quanto guardar/investir por mês" hint="Percentual aplicado sobre tudo que entrou no mês, não sobre um valor fixo.">
          <div className="b-pctpick">
            <input type="range" min={0} max={60} step={5} value={s.savePct} onChange={e => app.setSettings({ savePct: Number(e.target.value) }, { debounce: true })} aria-label="Percentual para guardar" />
            <strong>{s.savePct}%</strong>
          </div>
        </Field>
        <p className="b-muted b-small">Neste mês: {s.savePct}% de <Money value={app.c.receitas} /> = <Money value={app.c.metaGuardar} className="b-strong" />.</p>
      </Card>
      <Card title="Aparência">
        <Field label="Tema">
          <Segmented value={s.theme} onChange={t => app.setSettings({ theme: t })} label="Tema"
            options={[{ value: "light", label: "Claro", icon: "sun" }, { value: "dark", label: "Escuro", icon: "moon" }, { value: "auto", label: "Automático" }]} />
        </Field>
      </Card>
      <Card title="Privacidade">
        <Toggle label="Ocultar valores" hint="Mostra R$ •••••• no lugar dos números. Vale só para este aparelho." checked={app.hide} onChange={v => app.setHide(v)} />
        <Toggle label="Bloquear ao abrir" hint="Pede um PIN de 4 dígitos antes de mostrar os valores." checked={s.lock}
          onChange={v => app.setSettings(v && /^\d{4}$/.test(pin) ? { lock: v, pin } : { lock: v })} />
        {s.lock ? (
          <Field label="PIN" hint={/^\d{4}$/.test(pin) ? "O bloqueio vale na próxima vez que abrir o app." : "Digite 4 números para ativar o bloqueio."}>
            <Input inputMode="numeric" maxLength={4} value={pin} autoComplete="off"
              onChange={e => { const x = e.target.value.replace(/\D/g, "").slice(0, 4); setPin(x); if (x.length === 4) app.setSettings({ pin: x }, { debounce: true }); }} />
          </Field>
        ) : null}
      </Card>
      <Card title="Seus dados">
        {s.demo ? (
          <Notice tone="neutral" icon="info" title="Você está vendo dados de exemplo" action={<Button size="sm" variant="secondary" onClick={() => setConfirm("fresh")}>Começar do zero</Button>}>
            Os valores foram inventados para demonstrar o app.
          </Notice>
        ) : null}
        {importErr ? <Notice tone="negative" title="Importação falhou">{importErr}</Notice> : null}
        <div className="b-list">
          <button type="button" className="b-setrow" onClick={() => exportJson("bolso-dados.json")}>
            <Icon name="download" /><span><strong>Exportar dados</strong><small>Baixa um arquivo .json com tudo</small></span><Icon name="chevR" size={18} />
          </button>
          <button type="button" className="b-setrow" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Icon name="upload" /><span><strong>Importar dados</strong><small>Substitui os dados atuais por um arquivo exportado</small></span><Icon name="chevR" size={18} />
          </button>
          <button type="button" className="b-setrow" onClick={() => exportJson("bolso-backup-" + isoToday() + ".json")}>
            <Icon name="shield" /><span><strong>Fazer backup</strong><small>Mesmo arquivo, com a data no nome</small></span><Icon name="chevR" size={18} />
          </button>
          <button type="button" className="b-setrow" disabled={busy} onClick={() => setConfirm("demo")}>
            <Icon name="refresh" /><span><strong>Restaurar dados de exemplo</strong><small>Substitui seus dados pelos de exemplo. Faça um backup antes.</small></span><Icon name="chevR" size={18} />
          </button>
          <button type="button" className="b-setrow is-danger" disabled={busy} onClick={() => setConfirm("wipe")}>
            <Icon name="trash" /><span><strong>Apagar todos os dados</strong><small>Não dá para desfazer. Faça um backup antes.</small></span><Icon name="chevR" size={18} />
          </button>
          <button type="button" className="b-setrow" onClick={logout}>
            <Icon name="logout" /><span><strong>Sair</strong><small>Encerra a sessão neste aparelho</small></span><Icon name="chevR" size={18} />
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
      </Card>
    </div>
    <Confirm open={!!confirm}
      title={confirm === "wipe" ? "Apagar todos os dados?" : confirm === "fresh" ? "Começar do zero?" : "Restaurar exemplo?"}
      text={confirm === "demo" ? "Seus dados atuais serão substituídos pelos dados de exemplo." : "Todas as transações, receitas, metas, cartões e contas serão apagados. As categorias padrão continuam."}
      confirmLabel={confirm === "demo" ? "Restaurar" : "Apagar tudo"} tone={confirm === "demo" ? "primary" : "danger"}
      onClose={() => setConfirm(null)}
      onConfirm={() => {
        if (confirm === "demo") doReplace({ ...mockData(), settings: { ...mockData().settings, name: s.name || "Emy", theme: s.theme } }, "Dados de exemplo restaurados");
        else doReplace(emptyData(data), "Dados apagados");
      }} />
  </>;
}
