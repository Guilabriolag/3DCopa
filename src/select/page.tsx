"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Btn, Chip, Panel, StatBar, cn } from "@/components/ui";
import { NATIONS, getNation } from "@/lib/nations";
import { useGame } from "@/store/game";

export default function SelectPage() {
  const router = useRouter();
  const { home, away, nation, setHome, setAway, setNation, squads } = useGame();
  const [target, setTarget] = useState<"home" | "away">("home");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const sorted = [...NATIONS].sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name));
    if (!term) return sorted;
    return sorted.filter((n) => n.name.toLowerCase().includes(term) || n.code.toLowerCase().includes(term));
  }, [q]);

  function pick(code: string) {
    if (target === "home") {
      setHome(code);
      setNation(code);
      setTarget("away");
    } else {
      setAway(code);
      setTarget("home");
    }
  }

  const h = getNation(home);
  const a = getNation(away);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Chip tone="gold">Escolha sua seleção</Chip>
          <h1 className="mt-2 font-display text-[clamp(32px,6vw,58px)] font-900 uppercase leading-none tracking-[0.04em] text-chalk">
            Seleções <span className="text-gold">32</span>
          </h1>
          <p className="max-w-xl text-[13px] text-dust">
            Cada seleção tem identidade física própria: massa média, deslize, precisão e o formato da borda dos botões.
            O elenco pode ser reescrito no editor — a física acompanha.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTarget("home")}
            className={cn(
              "clip-btn border px-3 py-2 font-display text-[12px] uppercase tracking-[0.16em]",
              target === "home" ? "border-pitch/70 bg-pitch/15 text-pitch" : "border-line bg-ink2 text-dust",
            )}
          >
            ① Mandante
          </button>
          <button
            type="button"
            onClick={() => setTarget("away")}
            className={cn(
              "clip-btn border px-3 py-2 font-display text-[12px] uppercase tracking-[0.16em]",
              target === "away" ? "border-hot/70 bg-hot/15 text-hot" : "border-line bg-ink2 text-dust",
            )}
          >
            ② Visitante
          </button>
        </div>
      </header>

      <Panel pad={false}>
        <div className="flex flex-wrap items-center justify-center gap-4 p-4 sm:gap-8">
          <TeamCard code={home} label="Mandante" accent="#3ddc84" edited={Boolean(squads[home]?.length)} />
          <div className="text-center">
            <div className="font-display text-5xl font-900 uppercase text-dust">×</div>
            <div className="mt-1 font-display text-[10px] uppercase tracking-[0.3em] text-dust">clique para trocar</div>
          </div>
          <TeamCard code={away} label="Visitante" accent="#ff5a4d" edited={Boolean(squads[away]?.length)} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 p-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar seleção…"
            className="clip-btn w-full max-w-xs border border-line bg-ink2 px-3 py-2 font-display text-sm uppercase tracking-[0.14em] text-chalk outline-none placeholder:text-dust/60 focus:border-gold/60 sm:w-auto"
          />
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            <Btn variant="ghost" onClick={() => router.push("/")}>Voltar</Btn>
            <Btn variant="primary" size="lg" onClick={() => router.push("/prematch")}>
              Pré-jogo →
            </Btn>
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((n) => {
          const isHome = n.code === home;
          const isAway = n.code === away;
          const avg = Object.values(n.attrs).reduce((s, v) => s + v, 0) / 6;
          return (
            <button
              key={n.code}
              type="button"
              onClick={() => pick(n.code)}
              className={cn(
                "panel clip-card group p-3 text-left transition hover:-translate-y-0.5",
                isHome && "border-pitch/70 ring-1 ring-pitch/40",
                isAway && "border-hot/70 ring-1 ring-hot/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-3xl leading-none">{n.flag}</span>
                  <span>
                    <span className="block font-display text-lg font-800 uppercase leading-tight tracking-[0.1em] text-chalk">
                      {n.name}
                    </span>
                    <span className="block font-display text-[10px] uppercase tracking-[0.24em] text-dust">
                      {n.code} · {n.formation} · {n.tactic}
                    </span>
                  </span>
                </div>
                <span className="font-display text-[11px] tracking-[0.14em] text-gold">
                  {"★".repeat(n.stars)}
                  <span className="text-line">{"★".repeat(5 - n.stars)}</span>
                </span>
              </div>
              <div
                className="mt-2 h-1 w-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${n.primary}, ${n.secondary})` }}
              />
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                <StatBar label="Ataque" value={n.attrs.attack} tone="hot" compact />
                <StatBar label="Defesa" value={n.attrs.defense} tone="ice" compact />
                <StatBar label="Precisão" value={n.attrs.precision} tone="gold" compact />
                <StatBar label="Força" value={n.attrs.force} tone="pitch" compact />
                <StatBar label="Deslize" value={n.attrs.slide} tone="ice" compact />
                <StatBar label="Controle" value={n.attrs.control} tone="gold" compact />
              </div>
              <p className="mt-2 text-[11px] leading-snug text-dust/85">{n.style}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-display text-[10px] uppercase tracking-[0.2em] text-dust">
                  overall {avg.toFixed(0)}
                </span>
                <span
                  className={cn(
                    "font-display text-[10px] uppercase tracking-[0.2em]",
                    isHome ? "text-pitch" : isAway ? "text-hot" : "text-dust/70 group-hover:text-gold",
                  )}
                >
                  {isHome ? "✓ mandante" : isAway ? "✓ visitante" : "escolher →"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 pb-4">
        <Btn variant="ghost" onClick={() => { setHome(h.code); setAway(a.code); }}>
          Confirmar {h.flag} × {a.flag}
        </Btn>
        <Btn variant="pitch" onClick={() => router.push("/prematch")}>Ir para o pré-jogo</Btn>
        <Btn variant="dark" onClick={() => router.push("/editor")}>Editar elencos</Btn>
      </div>
    </div>
  );
}

function TeamCard({ code, label, accent, edited }: { code: string; label: string; accent: string; edited: boolean }) {
  const n = getNation(code);
  return (
    <div className="min-w-[190px] text-center">
      <div className="font-display text-[10px] uppercase tracking-[0.3em]" style={{ color: accent }}>
        {label}
      </div>
      <div className="mt-1 text-5xl">{n.flag}</div>
      <div className="font-display text-xl font-900 uppercase tracking-[0.12em] text-chalk">{n.name}</div>
      <div className="font-display text-[10px] uppercase tracking-[0.22em] text-dust">
        {n.formation} · {n.tactic}
      </div>
      {edited && (
        <div className="mt-1 inline-block rounded-full border border-gold/50 px-2 py-0.5 font-display text-[9px] uppercase tracking-[0.2em] text-gold">
          elenco editado
        </div>
      )}
    </div>
  );
}
