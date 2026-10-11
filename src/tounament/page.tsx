"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Btn, Chip, Panel, cn } from "@/components/ui";
import { getNation } from "@/lib/nations";
import { api } from "@/lib/api";
import {
  autoSimulate, createCup, cupProgress, currentRound, nextMatch, standings, type Cup,
} from "@/lib/tournament";
import { useCup } from "@/store/cup";
import { useGame } from "@/store/game";

const STAGE_LABEL: Record<string, string> = {
  oitavas: "Oitavas de final",
  quartas: "Quartas de final",
  semi: "Semifinal",
  terceiro: "Disputa do 3º lugar",
  final: "FINAL",
};

export default function TournamentPage() {
  const router = useRouter();
  const { nation, settings, squads, profileId, setCupId, cupId, patchSettings } = useGame();
  const { cup, setCup } = useCup();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [tab, setTab] = useState<"grupos" | "mata">("grupos");

  const nm = useMemo(() => (cup ? nextMatch(cup) : null), [cup]);
  const prog = cup ? cupProgress(cup) : null;

  useEffect(() => {
    if (!cup && cupId && profileId) {
      api<{ item: { groups: unknown; bracket: unknown; stage: string; userNation: string; champion: string | null; stadiumCode: string; seed?: number } }>(
        `/api/tournaments/${cupId}`,
      )
        .then((r) => {
          const item = r.item;
          setCup({
            version: 1,
            userNation: item.userNation,
            seed: 20260611,
            phase: (item.stage as Cup["phase"]) ?? "groups",
            groups: (item.groups as Cup["groups"]) ?? [],
            ko: (item.bracket as Cup["ko"]) ?? [],
            champion: item.champion ?? null,
            third: null,
            stadiumCode: item.stadiumCode ?? "copa",
          });
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cupId, profileId]);

  async function startCup() {
    const seed = Math.floor(Math.random() * 1e6) + 7;
    const stadiumCode = settings.stadiumCode === "vila" ? "olimpico" : settings.stadiumCode;
    const c = createCup(nation, seed, stadiumCode);
    setCup(c);
    if (profileId) {
      try {
        const r = await api<{ item: { id: string } }>("/api/tournaments", {
          method: "POST",
          body: JSON.stringify({
            profileId, name: "Copa Button 3D", userNation: nation, stage: "groups",
            groups: c.groups, bracket: c.ko, stadiumCode, settings,
          }),
        });
        setCupId(r.item.id);
      } catch {
        setCupId(null);
      }
    }
  }

  async function persist(c: Cup) {
    setCup({ ...c });
    if (!cupId) return;
    try {
      await api(`/api/tournaments/${cupId}`, {
        method: "PATCH",
        body: JSON.stringify({
          stage: c.phase, status: c.phase === "done" ? "finished" : "active",
          champion: c.champion, groups: c.groups, bracket: c.ko,
        }),
      });
    } catch {
      /* offline: o estado local continua válido */
    }
  }

  async function simulate() {
    if (!cup || busy) return;
    setBusy(true);
    setProgress({ done: 0, total: 1, label: "preparando mesa…" });
    const copy: Cup = JSON.parse(JSON.stringify(cup));
    try {
      await autoSimulate(copy, { ...settings, stadiumCode: cup.stadiumCode }, squads, (done, total, label) =>
        setProgress({ done, total, label }),
      );
    } finally {
      setBusy(false);
      setProgress(null);
      await persist(copy);
      const after = nextMatch(copy);
      if (after && !after.byUser) setTab(after.kind === "ko" ? "mata" : "grupos");
    }
  }

  function play() {
    if (!cup || !nm) return;
    const stage = nm.kind === "group" ? `Grupo ${nm.stage?.replace("Grupo ", "")} · ${currentRound(cup) + 1}ª rodada` : STAGE_LABEL[nm.stage ?? ""] ?? nm.stage;
    useGame.setState({
      plan: {
        mode: "cup",
        home: nm.home,
        away: nm.away,
        settings: { ...settings, stadiumCode: cup.stadiumCode },
        stage: stage ?? "Copa",
        cupGroup: nm.kind === "group" ? cup.groups[nm.gi!].name : undefined,
        cupRound: nm.ri,
        cupFixture: nm.fi,
        koId: nm.koId,
      },
    });
    router.push("/match");
  }

  if (!cup) {
    const n = getNation(nation);
    return (
      <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
        <div className="panel clip-card space-y-4 p-6 text-center">
          <Chip tone="gold">Copa do Mundo</Chip>
          <h1 className="font-display text-[clamp(38px,8vw,76px)] font-900 uppercase leading-none tracking-[0.04em] text-chalk">
            Copa <span className="text-gold">Button</span> 3D
          </h1>
          <p className="mx-auto max-w-xl text-[14px] leading-relaxed text-dust">
            32 seleções, 8 grupos, oitavas, quartas, semifinais e final. As partidas da CPU são resolvidas pelo
            <strong className="text-chalk"> mesmo motor de física</strong> do jogo — massa, atrito, borda e efeito
            decidem o resultado, sem dado escondido.
          </p>
          <div className="mx-auto flex max-w-md flex-col gap-2 text-left">
            {["Fase de grupos — 3 rodadas, 48 partidas", "Oitavas · Quartas · Semifinais", "Disputa de 3º lugar e FINAL", "Pênaltis decidem empate no mata-mata"].map((t) => (
              <div key={t} className="flex items-center gap-2 border-l-2 border-gold/70 bg-ink2/60 px-3 py-2 font-display text-[12px] uppercase tracking-[0.14em] text-dust">
                <span className="text-gold">▸</span> {t}
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="text-5xl">{n.flag}</div>
            <div className="font-display text-xl font-900 uppercase tracking-[0.16em] text-chalk">
              Você com {n.name}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Btn variant="ghost" onClick={() => router.push("/select")}>Trocar seleção</Btn>
              <Btn size="lg" onClick={startCup}>🏆 Iniciar copa</Btn>
            </div>
          </div>
        </div>
        <Panel title="Estádio da copa" tag="Arena">
          <div className="flex flex-wrap gap-2">
            {["olimpico", "maracana", "deserto", "norte", "costa"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => patchSettings({ stadiumCode: s })}
                className={cn(
                  "clip-btn border px-3 py-2 font-display text-[12px] uppercase tracking-[0.14em]",
                  settings.stadiumCode === s ? "border-gold/70 bg-gold/15 text-gold" : "border-line bg-ink2 text-dust",
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-dust/70">
            Estádios bloqueados no seu perfil não entram na lista — desbloqueie em Estádios.
          </p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <header className="panel clip-card flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <Chip tone="gold">
            {cup.phase === "groups" ? "Fase de grupos" : cup.phase === "ko" ? "Mata-mata" : "Encerrada"}
          </Chip>
          <h1 className="mt-1 font-display text-[clamp(28px,5vw,46px)] font-900 uppercase leading-none tracking-[0.04em] text-chalk">
            Copa <span className="text-gold">Button</span>
          </h1>
          <div className="mt-1 font-display text-[11px] uppercase tracking-[0.2em] text-dust">
            {getNation(cup.userNation).flag} sua seleção · {prog?.played}/{prog?.total} partidas · {prog?.pct}%
          </div>
          <div className="mt-2 h-1.5 w-56 overflow-hidden rounded-full bg-ink3">
            <div className="h-full rounded-full bg-gradient-to-r from-pitch to-gold transition-[width]" style={{ width: `${prog?.pct ?? 0}%` }} />
          </div>
        </div>
        {cup.champion ? (
          <div className="text-center">
            <div className="text-5xl">{getNation(cup.champion).flag}</div>
            <div className="font-display text-2xl font-900 uppercase tracking-[0.14em] text-gold">
              {getNation(cup.champion).name}
            </div>
            <div className="font-display text-[11px] uppercase tracking-[0.3em] text-dust">campeã</div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={() => setTab(tab === "grupos" ? "mata" : "grupos")}>
              {tab === "grupos" ? "Ver mata-mata" : "Ver grupos"}
            </Btn>
            <Btn variant="dark" onClick={simulate} disabled={busy}>
              {busy ? `Simulando ${progress?.done ?? 0}/${progress?.total ?? 0}` : "⚙ Simular rodada"}
            </Btn>
            <Btn
              variant="primary"
              size="lg"
              onClick={play}
              disabled={!nm || !nm.byUser || busy}
            >
              {nm?.byUser ? "▶ Jogar partida" : "Sem jogo seu"}
            </Btn>
          </div>
        )}
      </header>

      {progress && (
        <div className="panel clip-btn flex items-center gap-3 px-4 py-2">
          <span className="font-display text-[11px] uppercase tracking-[0.2em] text-dust">motor de física</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink3">
            <div className="h-full rounded-full bg-pitch transition-[width]" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
          </div>
          <span className="font-display text-[11px] uppercase tracking-[0.14em] text-chalk">{progress.label}</span>
        </div>
      )}

      {nm && (
        <Panel title="Próxima partida" tag={nm.stage ?? ""}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <TeamSide code={nm.home} highlight={nm.home === cup.userNation} />
              <span className="font-display text-3xl font-900 text-dust">×</span>
              <TeamSide code={nm.away} highlight={nm.away === cup.userNation} />
            </div>
            <div className="flex flex-wrap gap-2">
              {nm.byUser ? (
                <Btn variant="primary" onClick={play} disabled={busy}>▶ Jogar na mesa</Btn>
              ) : (
                <Chip tone="ice">partida da CPU</Chip>
              )}
              <Btn variant="ghost" onClick={simulate} disabled={busy}>Simular</Btn>
            </div>
          </div>
        </Panel>
      )}

      {tab === "grupos" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cup.groups.map((g, gi) => {
            const table = standings(g);
            return (
              <Panel key={g.name} title={`Grupo ${g.name}`} tag={String(gi + 1)} pad={false}>
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-line/70">
                      {["", "Sel", "P", "J", "SG"].map((h) => (
                        <th key={h} className="px-2 py-1 text-left font-display text-[9px] uppercase tracking-[0.14em] text-dust">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.map((s, i) => (
                      <tr key={s.code} className={cn("border-b border-line/30", i < 2 && "bg-pitch/5")}>
                        <td className="px-2 py-1 font-display text-[11px] text-dust">{i + 1}</td>
                        <td className="px-2 py-1">
                          <span className="font-display uppercase tracking-[0.08em] text-chalk">
                            {getNation(s.code).flag} {s.code}
                          </span>
                          {s.code === cup.userNation && <span className="ml-1 text-gold">●</span>}
                        </td>
                        <td className="px-2 py-1 font-display font-800 tabular-nums text-gold">{s.pts}</td>
                        <td className="px-2 py-1 tabular-nums text-dust">{s.pld}</td>
                        <td className="px-2 py-1 tabular-nums text-dust">{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="space-y-1 p-2">
                  {g.rounds.map((r, ri) => (
                    <div key={ri} className="space-y-0.5">
                      {r.map((f, fi) => (
                        <div
                          key={fi}
                          className={cn(
                            "flex items-center justify-between gap-2 px-2 py-0.5 font-display text-[11px] uppercase tracking-[0.08em]",
                            f.home === cup.userNation || f.away === cup.userNation ? "text-gold" : "text-dust",
                          )}
                        >
                          <span className="truncate">{f.home} × {f.away}</span>
                          <span className="tabular-nums text-chalk">
                            {f.played ? `${f.hs}–${f.as}` : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-4">
          {(["oitavas", "quartas", "semi", "final"] as const).map((stage) => {
            const list = cup.ko.filter((k) => k.stage === stage);
            const extra = stage === "final" ? cup.ko.filter((k) => k.stage === "terceiro") : [];
            return (
              <Panel key={stage} title={STAGE_LABEL[stage]} tag={String(list.length)} pad={false}>
                <div className="space-y-2 p-3">
                  {[...list, ...extra].map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "border px-2.5 py-1.5",
                        m.played ? "border-line bg-ink2/70" : "border-gold/30 bg-gold/5",
                      )}
                    >
                      <Row code={m.home} score={m.hs} pens={m.pens?.[0] ?? null} user={cup.userNation} winner={m.played} />
                      <Row code={m.away} score={m.as} pens={m.pens?.[1] ?? null} user={cup.userNation} winner={m.played} />
                      {m.stage === "terceiro" && (
                        <div className="mt-1 font-display text-[9px] uppercase tracking-[0.2em] text-dust">3º lugar</div>
                      )}
                    </div>
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pb-6">
        <Btn variant="ghost" onClick={() => router.push("/prematch")}>Pré-jogo</Btn>
        <Btn variant="danger" onClick={() => { setCup(null); setCupId(null); }}>Reiniciar copa</Btn>
      </div>
    </div>
  );
}

function Row({ code, score, pens, user, winner }: { code: string | null; score: number | null; pens: number | null; user: string; winner: boolean }) {
  if (!code) return <div className="font-display text-[11px] uppercase tracking-[0.14em] text-dust/60">a definir</div>;
  const n = getNation(code);
  return (
    <div className={cn("flex items-center justify-between gap-2 py-0.5", code === user && "text-gold")}>
      <span className="truncate font-display text-[12px] uppercase tracking-[0.08em] text-chalk">
        {n.flag} {code}
      </span>
      <span className="tabular-nums font-display text-[12px] text-chalk">
        {winner && score !== null ? score : "—"}
        {pens !== null && score !== null && <span className="ml-1 text-[10px] text-ice">({pens})</span>}
      </span>
    </div>
  );
}

function TeamSide({ code, highlight }: { code: string; highlight: boolean }) {
  const n = getNation(code);
  return (
    <div className={cn("text-center", highlight && "text-gold")}>
      <div className="text-4xl">{n.flag}</div>
      <div className={cn("font-display text-base font-800 uppercase tracking-[0.12em]", highlight ? "text-gold" : "text-chalk")}>
        {n.name}
      </div>
      <div className="font-display text-[10px] uppercase tracking-[0.2em] text-dust">{n.formation}</div>
    </div>
  );
}
