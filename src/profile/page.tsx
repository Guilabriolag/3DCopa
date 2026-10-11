"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Btn, Chip, Field, Panel, StatBar, cn } from "@/components/ui";
import type { MatchRow } from "@/db/schema";
import { api } from "@/lib/api";
import { getNation } from "@/lib/nations";
import { getStadium } from "@/lib/stadiums";
import { useCup } from "@/store/cup";
import { useGame } from "@/store/game";

export default function ProfilePage() {
  const { profileId, handle, setHandle, coins, xp, unlocked, nation, squads, setProfile, reset } = useGame();
  const cup = useCup((s) => s.cup);
  const [history, setHistory] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    let alive = true;
    (async () => {
      try {
        const r = await api<{ items: MatchRow[] }>(`/api/matches?profileId=${profileId}`);
        if (alive) setHistory(r.items);
      } catch {
        if (alive) setHistory([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [profileId]);

  const customCount = Object.values(squads).reduce((a, s) => a + s.length, 0);
  const wins = history.filter((m) => (m.homeCode === nation ? m.homeScore > m.awayScore : m.awayScore > m.homeScore)).length;
  const goalsFor = history.reduce((a, m) => a + (m.homeCode === nation ? m.homeScore : m.awayScore), 0);

  async function saveProfile() {
    setSaved(false);
    try {
      await api("/api/profile", {
        method: "POST",
        body: JSON.stringify({
          id: profileId, handle, nationCode: nation, coins, xp, unlockedStadiums: unlocked,
        }),
      });
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  const nextLevel = Math.max(100, Math.ceil(xp / 400) * 400);

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Chip tone="gold">Perfil</Chip>
          <h1 className="mt-2 font-display text-[clamp(30px,6vw,54px)] font-900 uppercase leading-none tracking-[0.04em] text-chalk">
            {handle || "Treinador"}
          </h1>
          <p className="text-[13px] text-dust">
            {getNation(nation).flag} {getNation(nation).name} · {history.length} partidas registradas · {customCount} atletas editados
          </p>
        </div>
        <div className="flex gap-2">
          <Chip tone="pitch">◈ {coins} moedas</Chip>
          <Chip tone="ice">✦ {xp} XP</Chip>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Panel title="Histórico de partidas" tag="Banco" pad={false}>
            {loading ? (
              <p className="p-4 font-display text-[12px] uppercase tracking-[0.2em] text-dust">carregando…</p>
            ) : history.length === 0 ? (
              <div className="space-y-3 p-4">
                <p className="text-[13px] text-dust">
                  Nenhuma partida registrada ainda. Jogue uma partida rápida ou comece a copa — cada resultado é
                  gravado no PostgreSQL com as configurações da mesa e as estatísticas do motor.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/prematch" className="clip-btn border border-yellow-200/40 bg-gold px-4 py-2.5 font-display text-[14px] font-700 uppercase tracking-[0.16em] text-ink">
                    Jogar agora
                  </Link>
                  <Link href="/tournament" className="clip-btn border border-line px-4 py-2.5 font-display text-[14px] font-700 uppercase tracking-[0.16em] text-chalk hover:border-ice/60">
                    Iniciar copa
                  </Link>
                </div>
              </div>
            ) : (
              <div className="max-h-[460px] overflow-y-auto scroll-x">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-ink2">
                    <tr className="border-b border-line">
                      {["Quando", "Fase", "Confronto", "Placar", "Mesa"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-display text-[10px] uppercase tracking-[0.16em] text-dust">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((m) => {
                      const mine = m.homeCode === nation || m.awayCode === nation;
                      const won = m.homeCode === nation ? m.homeScore > m.awayScore : m.awayScore > m.homeScore;
                      const st = (m.stats ?? {}) as Record<string, number[]>;
                      return (
                        <tr key={m.id} className={cn("border-b border-line/40", mine && won && "bg-pitch/5")}>
                          <td className="px-3 py-2 font-display text-[11px] uppercase tracking-[0.1em] text-dust">
                            {new Date(m.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                          </td>
                          <td className="px-3 py-2 font-display text-[11px] uppercase tracking-[0.12em] text-gold">{m.stage}</td>
                          <td className="px-3 py-2 font-display text-[13px] uppercase tracking-[0.08em] text-chalk">
                            {getNation(m.homeCode).flag} {m.homeCode} × {m.awayCode} {getNation(m.awayCode).flag}
                          </td>
                          <td className="px-3 py-2 font-display text-[15px] font-900 tabular-nums text-chalk">
                            {m.homeScore}–{m.awayScore}
                          </td>
                          <td className="px-3 py-2 font-display text-[10px] uppercase tracking-[0.12em] text-dust">
                            {getStadium(String((m.settings as Record<string, string>)?.stadiumCode ?? "olimpico")).name}
                            {st.shots ? ` · ${st.shots[0]}/${st.shots[1]} chutes` : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Elencos editados" tag="Física">
            {Object.keys(squads).length === 0 ? (
              <p className="text-[13px] text-dust">
                Nenhum atleta personalizado ainda. Abra o <Link className="text-ice underline" href="/editor">editor</Link> e
                crie, por exemplo, um atacante leve com deslize alto ou um especialista em chute aéreo com borda inclinada.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(squads).map(([code, list]) => (
                  <div key={code} className="border border-line/60 bg-ink2/50 p-2.5">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-display text-[13px] uppercase tracking-[0.12em] text-chalk">
                        {getNation(code).flag} {getNation(code).name}
                      </span>
                      <span className="font-display text-[11px] text-dust">{list.length} atletas</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {list.slice(0, 8).map((a) => (
                        <span key={a.id} className="rounded-full border border-line px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.1em] text-dust">
                          {a.shirt} {a.name.split(" ")[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Progressão" tag="Nível">
            <div className="space-y-3">
              <StatBar label={`XP até o próximo marco (${nextLevel})`} value={(xp / nextLevel) * 100} tone="pitch" />
              <div className="grid grid-cols-2 gap-2">
                <Box label="Vitórias" value={String(wins)} />
                <Box label="Gols pró" value={String(goalsFor)} />
                <Box label="Partidas" value={String(history.length)} />
                <Box label="Arenas" value={`${unlocked.length}/6`} />
              </div>
              {cup && (
                <div className="border-l-2 border-gold bg-ink2/60 px-3 py-2">
                  <div className="font-display text-[10px] uppercase tracking-[0.22em] text-dust">Copa em andamento</div>
                  <div className="font-display text-[14px] uppercase tracking-[0.1em] text-chalk">
                    {cup.phase === "groups" ? "Fase de grupos" : cup.phase === "ko" ? "Mata-mata" : "Encerrada"}
                  </div>
                  {cup.champion && (
                    <div className="font-display text-[13px] uppercase tracking-[0.1em] text-gold">
                      🏆 {getNation(cup.champion).name} campeã
                    </div>
                  )}
                  <Link href="/tournament" className="mt-1 inline-block font-display text-[11px] uppercase tracking-[0.16em] text-ice underline">
                    abrir copa
                  </Link>
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Dados" tag="Conta">
            <div className="space-y-3">
              <Field label="Apelido">
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.slice(0, 18))}
                  className="clip-btn w-full border border-line bg-ink2 px-3 py-2 font-display uppercase tracking-[0.1em] text-chalk outline-none focus:border-gold/60"
                />
              </Field>
              <Field label="Seleção principal">
                <span className="block font-display text-[15px] uppercase tracking-[0.12em] text-chalk">
                  {getNation(nation).flag} {getNation(nation).name}
                </span>
              </Field>
              <Field label="Identificador">
                <span className="block truncate font-mono text-[11px] text-dust">{profileId || "—"}</span>
              </Field>
              <Btn block variant="primary" onClick={saveProfile}>Salvar perfil</Btn>
              {saved && <p className="text-center font-display text-[11px] uppercase tracking-[0.16em] text-pitch">✓ sincronizado</p>}
              <Btn
                block
                variant="danger"
                onClick={() => {
                  if (confirm("Zerar elencos, copa e progresso?")) {
                    reset();
                    useCup.getState().setCup(null);
                  }
                }}
              >
                Zerar progresso
              </Btn>
            </div>
          </Panel>

          <Panel title="Atalhos" tag="Navegar">
            <div className="grid gap-2">
              {[
                ["/", "Menu principal"],
                ["/select", "Seleções"],
                ["/prematch", "Pré-jogo"],
                ["/editor", "Editor de atletas"],
                ["/lab", "Laboratório"],
                ["/stadiums", "Estádios"],
                ["/tournament", "Copa do Mundo"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="clip-btn flex items-center justify-between border border-line bg-ink2/70 px-3 py-2 font-display text-[12px] uppercase tracking-[0.14em] text-dust transition hover:border-gold/60 hover:text-gold"
                >
                  {label} <span>→</span>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line/60 bg-ink2/60 px-3 py-2">
      <div className="font-display text-[10px] uppercase tracking-[0.2em] text-dust">{label}</div>
      <div className="font-display text-2xl font-900 tabular-nums text-chalk">{value}</div>
    </div>
  );
}
