"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Chip, Panel } from "@/components/ui";
import { getNation } from "@/lib/nations";
import { getStadium, type TimeOfDay, type Weather } from "@/lib/stadiums";
import { useCup } from "@/store/cup";
import { useGame } from "@/store/game";

const MenuScene = dynamic(() => import("@/components/MenuScene"), { ssr: false });

const MENU = [
  { href: "/tournament", label: "Copa do Mundo", sub: "32 seleções · grupos · oitavas · final", icon: "🏆", tone: "gold" as const },
  { href: "/select", label: "Partida Rápida", sub: "escolha as duas seleções", icon: "⚡", tone: "pitch" as const },
  { href: "/prematch?mode=training", label: "Treinamento", sub: "relógio parado, posse eterna", icon: "🎯", tone: "ice" as const },
  { href: "/editor", label: "Editor de Atletas", sub: "atributo → geometria → física", icon: "✎", tone: "gold" as const },
  { href: "/lab", label: "Laboratório", sub: "pista de teste + telemetria", icon: "⚗", tone: "pitch" as const },
  { href: "/stadiums", label: "Estádios", sub: "gramado, luz, torcida, clima", icon: "🏟", tone: "ice" as const },
];

export default function Home() {
  const router = useRouter();
  const { settings, nation, home, away, xp, coins, squads } = useGame();
  const cup = useCup((s) => s.cup);
  const [atmos, setAtmos] = useState(0);
  const stadium = getStadium(settings.stadiumCode);
  const nat = getNation(nation);
  const customCount = Object.values(squads).reduce((a, s) => a + s.length, 0);
  const atmosCycles: { weather: Weather; timeOfDay: TimeOfDay }[] = [
    { weather: "sol", timeOfDay: "tarde" },
    { weather: "chuva", timeOfDay: "noite" },
    { weather: "nublado", timeOfDay: "poente" },
    { weather: "chuva-forte", timeOfDay: "noite" },
  ];
  const current = atmosCycles[atmos % atmosCycles.length];

  return (
    <div className="relative min-h-[calc(100vh-56px)]">
      <div className="fixed inset-0 -z-10">
        <MenuScene
          stadiumCode={stadium.code}
          weather={current.weather}
          timeOfDay={current.timeOfDay}
          grass={settings.grass}
          nation={nation}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/78 to-ink/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/70" />
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:py-14">
        <div className="space-y-7">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="gold">Transmissão ao vivo</Chip>
              <Chip tone="pitch">Física real por atleta</Chip>
              <Chip tone="ice">{stadium.name}</Chip>
            </div>
            <h1 className="font-display text-[clamp(44px,9vw,104px)] font-900 uppercase leading-[0.86] tracking-[0.02em] text-chalk text-stroke">
              Copa<span className="text-gold">Button</span>
              <span className="ml-3 align-super font-display text-[0.28em] tracking-[0.4em] text-ice">3D</span>
            </h1>
            <p className="max-w-2xl text-[15px] leading-relaxed text-dust">
              Um simulador de futebol de botão onde <strong className="text-chalk">cada atleta é um objeto físico
              editável</strong>. Nada de número decorativo: força vira impulso, deslize vira atrito, precisão vira
              controle de vetor e a <strong className="text-gold">borda do botão</strong> decide se o chute sai
              rasteiro ou levantado.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() => router.push("/prematch")}
                className="clip-btn sweep relative overflow-hidden border border-yellow-200/40 bg-gold px-7 py-3.5 font-display text-lg font-900 uppercase tracking-[0.2em] text-ink shadow-[0_18px_40px_-20px_rgba(247,212,23,0.95)] transition hover:bg-[#ffe14d]"
              >
                ▶ Jogar agora
              </button>
              <button
                type="button"
                onClick={() => setAtmos((a) => a + 1)}
                className="clip-btn border border-line bg-ink2/80 px-5 py-3.5 font-display text-sm font-700 uppercase tracking-[0.18em] text-chalk transition hover:border-ice/60"
              >
                ☂ Trocar atmosfera
              </button>
            </div>
          </header>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {MENU.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="panel clip-card group relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:border-gold/50"
              >
                <div
                  className="absolute inset-x-0 top-0 h-[2px] opacity-70 transition group-hover:opacity-100"
                  style={{
                    background:
                      m.tone === "gold"
                        ? "linear-gradient(90deg,#f7d417,transparent)"
                        : m.tone === "pitch"
                          ? "linear-gradient(90deg,#3ddc84,transparent)"
                          : "linear-gradient(90deg,#7cc7ff,transparent)",
                  }}
                />
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{m.icon}</span>
                  <span className="min-w-0">
                    <span className="block font-display text-lg font-800 uppercase leading-tight tracking-[0.12em] text-chalk">
                      {m.label}
                    </span>
                    <span className="block text-[12px] leading-snug text-dust">{m.sub}</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <Panel title="A regra do projeto" tag="Núcleo">
            <div className="grid gap-2 sm:grid-cols-4">
              {[
                { t: "Atributo", d: "força · deslize · precisão · borda", c: "#f7d417" },
                { t: "Geometria", d: "raio · altura · chanfro da borda", c: "#7cc7ff" },
                { t: "Física", d: "massa · atrito · impulso · lift", c: "#3ddc84" },
                { t: "Comportamento", d: "rasteiro, aéreo, trava, tabela", c: "#ff5a4d" },
              ].map((s, i) => (
                <div key={s.t} className="relative border-l-2 bg-ink2/60 px-3 py-2" style={{ borderColor: s.c }}>
                  <div className="font-display text-[10px] uppercase tracking-[0.24em] text-dust">
                    Camada {i + 1}
                  </div>
                  <div className="font-display text-base font-800 uppercase tracking-[0.1em] text-chalk">{s.t}</div>
                  <div className="text-[11px] leading-snug text-dust/80">{s.d}</div>
                  {i < 3 && (
                    <span className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-dust sm:block">→</span>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-dust">
              Exemplo: borda quase vertical produz contato horizontal e <span className="text-pitch">chute rasteiro</span>;
              borda inclinada gera componente vertical e <span className="text-gold">bola aérea</span>. Massa alta vence
              o duelo botão×botão; deslize alto mantém a velocidade no gramado molhado.
            </p>
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel title="Sua seleção" tag={`${nat.flag} ${nat.code}`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-display text-xl font-900 uppercase tracking-[0.14em] text-chalk">{nat.name}</span>
                <span className="font-display text-sm tracking-[0.2em] text-gold">
                  {"★".repeat(nat.stars)}<span className="text-line">{"★".repeat(5 - nat.stars)}</span>
                </span>
              </div>
              <p className="text-[12px] leading-snug text-dust">{nat.style}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
                {Object.entries(nat.attrs).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between font-display text-[10px] uppercase tracking-[0.16em] text-dust">
                      <span>{k}</span><span className="text-chalk">{v}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink3">
                      <div className="h-full rounded-full" style={{ width: `${v}%`, background: nat.primary }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <Link href="/select" className="clip-btn flex-1 border border-line bg-ink3 px-3 py-2 text-center font-display text-[12px] uppercase tracking-[0.16em] text-chalk hover:border-gold/60">
                  Trocar
                </Link>
                <Link href="/editor" className="clip-btn flex-1 border border-line bg-ink3 px-3 py-2 text-center font-display text-[12px] uppercase tracking-[0.16em] text-chalk hover:border-gold/60">
                  Editar elenco
                </Link>
              </div>
            </div>
          </Panel>

          <Panel title="Condições da mesa" tag="Pré-jogo">
            <dl className="space-y-1.5 font-display text-[12px] uppercase tracking-[0.12em]">
              {[
                ["Estádio", stadium.name],
                ["Clima", settings.weather.replace("-", " ")],
                ["Horário", settings.timeOfDay],
                ["Gramado", settings.grass],
                ["Tabelão", settings.walls ? "ligado" : "desligado"],
                ["Atletas editados", String(customCount)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2 border-b border-line/40 pb-1">
                  <dt className="text-dust">{k}</dt>
                  <dd className="text-chalk">{v}</dd>
                </div>
              ))}
            </dl>
            <Link href="/prematch" className="clip-btn mt-3 block border border-gold/60 bg-gold/15 px-3 py-2 text-center font-display text-[13px] font-800 uppercase tracking-[0.18em] text-gold">
              Abrir pré-jogo →
            </Link>
          </Panel>

          <Panel title="Copa" tag="Progresso">
            {cup ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between font-display text-[12px] uppercase tracking-[0.16em]">
                  <span className="text-dust">Fase</span>
                  <span className="text-chalk">
                    {cup.phase === "groups" ? "Grupos" : cup.phase === "ko" ? "Mata-mata" : "Encerrada"}
                  </span>
                </div>
                {cup.champion && (
                  <div className="font-display text-lg uppercase tracking-[0.12em] text-gold">
                    🏆 {getNation(cup.champion).flag} {getNation(cup.champion).name}
                  </div>
                )}
                <Link href="/tournament" className="clip-btn block border border-line bg-ink3 px-3 py-2 text-center font-display text-[12px] uppercase tracking-[0.16em] text-chalk hover:border-gold/60">
                  Abrir copa
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[12px] leading-snug text-dust">
                  Nenhuma copa em andamento. 32 seleções, 8 grupos, oitavas, quartas, semi e final — os jogos da CPU
                  são resolvidos pelo <strong className="text-chalk">mesmo motor de física</strong>.
                </p>
                <Link href="/tournament" className="clip-btn block border border-pitch/60 bg-pitch/15 px-3 py-2 text-center font-display text-[13px] font-800 uppercase tracking-[0.18em] text-pitch">
                  Iniciar copa
                </Link>
              </div>
            )}
          </Panel>

          <div className="flex items-center justify-between px-1 font-display text-[11px] uppercase tracking-[0.2em] text-dust">
            <span>◈ {coins} moedas</span>
            <span>✦ {xp} XP</span>
            <span>{home} × {away}</span>
          </div>
          <p className="px-1 text-[11px] leading-snug text-dust/60">
            Dica: em <Link className="text-ice underline" href="/lab">Laboratório</Link> você mede a altura máxima,
            a curva e a transferência de impulso de cada botão antes de levar o elenco para a mesa.
          </p>
        </aside>
      </div>
    </div>
  );
}
