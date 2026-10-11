"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { Btn, Chip, Field, Panel, Segmented, StatBar, cn } from "@/components/ui";
import { buildSquad, derivePhysics, overall, FORMATIONS, TACTICS, type TacticId } from "@/game/attributes";
import { fieldCfgFrom, type MatchSettings } from "@/game/match";
import { getNation } from "@/lib/nations";
import {
  GRASSES, STADIUMS, TIMES, WEATHERS, type GrassQuality, type TimeOfDay, type Weather,
} from "@/lib/stadiums";
import { useGame, type GameMode } from "@/store/game";

export default function PreMatchPage() {
  return (
    <Suspense fallback={<div className="p-8 font-display uppercase tracking-[0.3em] text-dust">Carregando…</div>}>
      <PreMatch />
    </Suspense>
  );
}

function PreMatch() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = (params.get("mode") as GameMode) ?? "quick";
  const { home, away, settings, patchSettings, setPlan, squads, unlocked, nation } = useGame();
  const h = getNation(home);
  const a = getNation(away);

  const squad = useMemo(
    () => squads[home]?.length ? mergeSquad(home, squads[home]) : buildSquad(home, settings.formation ?? h.formation, 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [home, squads, h.formation],
  );
  const star = useMemo(() => [...squad].sort((x, y) => overall(y.attrs) - overall(x.attrs))[0], [squad]);
  const cfg = useMemo(() => fieldCfgFrom({ ...settings, training: mode === "training" } as MatchSettings), [settings, mode]);
  const phys = derivePhysics(star.attrs);
  const effectiveFriction = phys.friction * cfg.grassDamping * (1 - 0.35 * cfg.wetness);
  const slideDistance = phys.maxSpeed / Math.max(0.2, effectiveFriction);
  const formation = settings.formation ?? h.formation;
  const tactic = (settings.tactic ?? h.tactic) as TacticId;

  function start() {
    const base: MatchSettings = {
      ...settings,
      training: mode === "training",
      halves: mode === "training" ? 1 : settings.halves,
      halfSeconds: mode === "training" ? 600 : settings.halfSeconds,
    };
    setPlan({
      mode,
      home,
      away,
      settings: { ...settings, ...base, formation, tactic },
      stage: mode === "training" ? "Treinamento livre" : `${h.flag} ${h.name} × ${a.name} ${a.flag}`,
    });
    router.push("/match");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <header className="panel clip-card flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-4">
          <Side code={home} align="right" />
          <div className="text-center">
            <div className="font-display text-[10px] uppercase tracking-[0.3em] text-dust">Pré-jogo</div>
            <div className="font-display text-3xl font-900 uppercase leading-none text-gold">×</div>
            <div className="font-display text-[10px] uppercase tracking-[0.2em] text-dust">
              {mode === "training" ? "treino" : mode === "cup" ? "copa" : "amistoso"}
            </div>
          </div>
          <Side code={away} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip tone="ice">{STADIUMS.find((s) => s.code === settings.stadiumCode)?.name}</Chip>
          <Chip tone="pitch">{WEATHERS.find((w) => w.id === settings.weather)?.label}</Chip>
          <Chip>{TIMES.find((t) => t.id === settings.timeOfDay)?.label}</Chip>
          <Chip tone="gold">{GRASSES.find((g) => g.id === settings.grass)?.label}</Chip>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Panel title="Estádio" tag="Arena">
            <div className="space-y-2">
              {STADIUMS.map((s) => {
                const locked = !unlocked.includes(s.code);
                return (
                  <button
                    key={s.code}
                    type="button"
                    disabled={locked}
                    onClick={() => patchSettings({ stadiumCode: s.code })}
                    className={cn(
                      "clip-btn flex w-full items-center gap-3 border px-3 py-2 text-left transition",
                      settings.stadiumCode === s.code
                        ? "border-gold/70 bg-gold/10"
                        : "border-line bg-ink2/70 hover:border-ice/50",
                      locked && "cursor-not-allowed opacity-45",
                    )}
                  >
                    <span className="font-display text-lg text-gold">{locked ? "🔒" : "🏟"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[15px] font-800 uppercase tracking-[0.1em] text-chalk">
                        {s.name}
                      </span>
                      <span className="block truncate text-[11px] text-dust">
                        {s.city} · {s.capacity.toLocaleString("pt-BR")} · {s.tier}
                      </span>
                    </span>
                    <span className="font-display text-[10px] uppercase tracking-[0.16em] text-dust">
                      {locked ? `${s.unlockXp} XP` : s.lightRig}
                    </span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="Clima & horário" tag="Atmosfera">
            <div className="space-y-3">
              <Field label="Clima" hint={WEATHERS.find((w) => w.id === settings.weather)?.note}>
                <Segmented
                  options={WEATHERS.map((w) => ({ id: w.id, label: w.label, icon: w.icon }))}
                  value={settings.weather}
                  onChange={(v: Weather) => patchSettings({ weather: v })}
                />
              </Field>
              <Field label="Horário">
                <Segmented
                  options={TIMES.map((t) => ({ id: t.id, label: t.label, icon: t.icon }))}
                  value={settings.timeOfDay}
                  onChange={(v: TimeOfDay) => patchSettings({ timeOfDay: v })}
                />
              </Field>
              <Field label="Gramado" hint={GRASSES.find((g) => g.id === settings.grass)?.label}>
                <Segmented
                  options={GRASSES.map((g) => ({ id: g.id, label: g.label }))}
                  value={settings.grass}
                  onChange={(v: GrassQuality) => patchSettings({ grass: v })}
                />
              </Field>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Formação & tática" tag={h.code}>
            <div className="grid gap-4 sm:grid-cols-[170px_minmax(0,1fr)]">
              <PitchPreview formation={formation} primary={h.primary} secondary={a.primary} />
              <div className="space-y-3">
                <Field label="Formação">
                  <Segmented
                    size="sm"
                    options={Object.keys(FORMATIONS).map((f) => ({ id: f, label: f }))}
                    value={formation}
                    onChange={(v) => patchSettings({ formation: v } as never)}
                  />
                </Field>
                <Field label="Tática" hint={TACTICS[tactic] ? `${TACTICS[tactic].label} · avanço ${(TACTICS[tactic].shift * 100).toFixed(0)}% · pressão ${TACTICS[tactic].press.toFixed(2)}` : undefined}>
                  <Segmented
                    size="sm"
                    options={Object.keys(TACTICS).map((t) => ({ id: t, label: TACTICS[t as TacticId].label }))}
                    value={tactic}
                    onChange={(v) => patchSettings({ tactic: v as TacticId } as never)}
                  />
                </Field>
                <p className="text-[11px] leading-snug text-dust/80">
                  Tática <strong className="text-chalk">não toca na física</strong>: ela só reposiciona os botões e
                  ajusta a agressividade do goleiro. Quem manda na bola continua sendo a massa, o atrito e a borda.
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Regras da mesa" tag="Regras">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tabelão (paredes)" hint={settings.walls ? "A bola rebate: tabela é recurso técnico" : "Sem paredes: lateral e escanteio"}>
                <Segmented
                  options={[{ id: "on", label: "Ligado" }, { id: "off", label: "Desligado" }]}
                  value={settings.walls ? "on" : "off"}
                  onChange={(v) => patchSettings({ walls: v === "on" })}
                />
              </Field>
              <Field label="Goleiro automático">
                <Segmented
                  options={[{ id: "on", label: "Com goleiro" }, { id: "off", label: "Sem goleiro" }]}
                  value={settings.gk ? "on" : "off"}
                  onChange={(v) => patchSettings({ gk: v === "on" })}
                />
              </Field>
              <Field label="Tempos">
                <Segmented
                  options={[{ id: "1", label: "1 tempo" }, { id: "2", label: "2 tempos" }]}
                  value={String(settings.halves)}
                  onChange={(v) => patchSettings({ halves: Number(v) })}
                />
              </Field>
              <Field label="Duração por tempo" hint={`${settings.halfSeconds}s reais ≈ 45 minutos de jogo`}>
                <Segmented
                  options={[
                    { id: "45", label: "Curto 45s" },
                    { id: "75", label: "Normal 75s" },
                    { id: "120", label: "Longo 120s" },
                  ]}
                  value={String(settings.halfSeconds)}
                  onChange={(v) => patchSettings({ halfSeconds: Number(v) })}
                />
              </Field>
              <Field label="Assistência de trajetória">
                <Segmented
                  options={[{ id: "on", label: "Mostrar" }, { id: "off", label: "Esconder" }]}
                  value={settings.showPrediction ? "on" : "off"}
                  onChange={(v) => patchSettings({ showPrediction: v === "on" })}
                />
              </Field>
              <Field label="Qualidade gráfica">
                <Segmented
                  options={[{ id: "alta", label: "Alta" }, { id: "media", label: "Média" }]}
                  value={settings.quality}
                  onChange={(v) => patchSettings({ quality: v as "alta" | "media" })}
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label={`Efeito padrão do peteleco: ${settings.spin.toFixed(1)}`}>
                <input
                  type="range" min={-1} max={1} step={0.1} value={settings.spin}
                  onChange={(e) => patchSettings({ spin: Number(e.target.value) })}
                  className="w-full"
                />
              </Field>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Como a mesa vai responder" tag="Física">
            <div className="space-y-3">
              <div className="border-l-2 border-gold bg-ink2/60 px-3 py-2">
                <div className="font-display text-[10px] uppercase tracking-[0.22em] text-dust">Referência</div>
                <div className="font-display text-lg font-800 uppercase tracking-[0.08em] text-chalk">
                  {star.name} · {star.shirt}
                </div>
                <div className="text-[11px] text-dust">{phys.signature}</div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <StatBar label="Força" value={star.attrs.force} tone="hot" compact />
                <StatBar label="Deslize" value={star.attrs.slide} tone="ice" compact />
                <StatBar label="Precisão" value={star.attrs.precision} tone="gold" compact />
                <StatBar label="Borda" value={star.attrs.edge} tone="pitch" compact />
              </div>
              <Readout rows={[
                ["Massa do botão", `${(phys.massKg * 1000).toFixed(1)} g`],
                ["Raio × altura", `${(phys.radiusM * 1000).toFixed(1)} × ${(phys.heightM * 1000).toFixed(1)} mm`],
                ["Velocidade de saída", `${phys.maxSpeed.toFixed(2)} m/s`],
                ["Atrito na grama", `${effectiveFriction.toFixed(2)} /s`],
                ["Distância até parar", `${(slideDistance * 100).toFixed(0)} cm`],
                ["Ângulo de contato", `${phys.contactSlopeDeg.toFixed(1)}°`],
                ["Índice de elevação", `${(phys.liftIndex * 100).toFixed(0)}%`],
                ["Erro de mira", `±${phys.aimErrorDeg.toFixed(2)}°`],
                ["Umidade da mesa", `${(cfg.wetness * 100).toFixed(0)}%`],
                ["Quique da bola", `${(0.62 * cfg.grassBounce * (1 - 0.35 * cfg.wetness)).toFixed(2)}`],
                ["Restituição da parede", cfg.walls ? cfg.wallRestitution.toFixed(2) : "sem tabelão"],
              ]} />
            </div>
          </Panel>

          <Panel title="Começar" tag="Kick-off">
            <div className="space-y-2">
              <Btn block size="lg" variant="primary" onClick={start}>
                {mode === "training" ? "▶ Iniciar treino" : "▶ Começar partida"}
              </Btn>
              <Btn block variant="ghost" onClick={() => router.push("/select")}>Trocar seleções</Btn>
              <Btn block variant="dark" onClick={() => router.push("/editor")}>Editar {nation === home ? "seu elenco" : "elencos"}</Btn>
              <p className="pt-1 text-[11px] leading-snug text-dust/75">
                Controles: toque no seu botão, arraste na direção do alvo e solte. A distância do arrasto define a
                força; o slider de efeito adiciona curva (Magnus) na bola.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function mergeSquad(code: string, custom: ReturnType<typeof buildSquad>) {
  const base = buildSquad(code, getNation(code).formation, 3);
  return base.map((b) => {
    const c = custom.find((x) => x.id === b.id || x.shirt === b.shirt);
    return c ? { ...c, role: b.role, shirt: b.shirt } : b;
  });
}

function Side({ code, align = "left" }: { code: string; align?: "left" | "right" }) {
  const n = getNation(code);
  return (
    <div className={cn("min-w-[120px]", align === "right" && "text-right")}>
      <div className="text-4xl">{n.flag}</div>
      <div className="font-display text-lg font-900 uppercase leading-tight tracking-[0.1em] text-chalk">{n.name}</div>
      <div className="font-display text-[10px] uppercase tracking-[0.2em] text-gold">{"★".repeat(n.stars)}</div>
    </div>
  );
}

function Readout({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="space-y-1">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-2 border-b border-line/40 pb-1">
          <dt className="font-display text-[10px] uppercase tracking-[0.18em] text-dust">{k}</dt>
          <dd className="font-display text-[13px] font-700 tabular-nums text-pitch">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function PitchPreview({ formation, primary, secondary }: { formation: string; primary: string; secondary: string }) {
  const shape = FORMATIONS[formation] ?? FORMATIONS["4-3-3"];
  return (
    <svg viewBox="0 0 100 62" className="h-auto w-full rounded-[2px] border border-line bg-[#132a1c]">
      <rect x="2" y="2" width="96" height="58" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="0.7" />
      <line x1="50" y1="2" x2="50" y2="60" stroke="rgba(255,255,255,.35)" strokeWidth="0.7" />
      <circle cx="50" cy="31" r="8" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="0.7" />
      <rect x="2" y="16" width="12" height="30" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="0.7" />
      <rect x="86" y="16" width="12" height="30" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="0.7" />
      {shape.map((s, i) => (
        <circle
          key={i}
          cx={2 + s.pos[0] * 96}
          cy={31 + s.pos[1] * 58}
          r={s.role === "GOL" ? 3 : 2.6}
          fill={s.role === "GOL" ? secondary : primary}
          stroke="rgba(0,0,0,.5)"
          strokeWidth="0.5"
        />
      ))}
      {shape.map((s, i) => (
        <circle key={`b${i}`} cx={98 - s.pos[0] * 96} cy={31 - s.pos[1] * 58} r={2.2} fill={secondary} opacity={0.55} />
      ))}
    </svg>
  );
}
