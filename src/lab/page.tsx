"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Btn, Chip, Field, Panel, Segmented, cn } from "@/components/ui";
import {
  buildSquad, derivePhysics, type Athlete, type AthleteAttrs,
} from "@/game/attributes";
import type { LabTelemetry } from "@/game/preview";
import { bodyFromAthlete, createWorld, makeFieldCfg, predictShot } from "@/game/physics";
import { GRASSES, WEATHERS, type GrassQuality, type Weather } from "@/lib/stadiums";
import { NATIONS, getNation } from "@/lib/nations";
import { useGame } from "@/store/game";

const LabCanvas = dynamic(() => import("@/components/LabCanvas"), { ssr: false });

const WET: Record<Weather, number> = { sol: 0, nublado: 0.06, chuva: 0.36, "chuva-forte": 0.64 };

const BENCH: { id: string; label: string; attrs: AthleteAttrs }[] = [
  { id: "raso", label: "Borda vertical", attrs: { force: 78, slide: 76, precision: 82, edge: 3, height: 44, mass: 52, radius: 52 } },
  { id: "medio", label: "Borda média", attrs: { force: 80, slide: 78, precision: 86, edge: 45, height: 50, mass: 50, radius: 50 } },
  { id: "aereo", label: "Borda inclinada", attrs: { force: 84, slide: 74, precision: 80, edge: 94, height: 60, mass: 46, radius: 46 } },
  { id: "pesado", label: "Pesado 24 g", attrs: { force: 90, slide: 55, precision: 74, edge: 30, height: 68, mass: 96, radius: 78 } },
  { id: "leve", label: "Leve 6 g", attrs: { force: 66, slide: 95, precision: 88, edge: 50, height: 34, mass: 8, radius: 38 } },
];

function labPrediction(attrs: AthleteAttrs, power: number, angleDeg: number, spin: number, wetness: number, damping: number) {
  const cfg = makeFieldCfg({ length: 1.5, width: 0.7, walls: true, wetness, grassDamping: damping, goalWidth: 0.22 });
  const a: Athlete = {
    id: "lab", name: "LAB", shirt: 10, role: "ATA", attrs,
    primary: "#f7d417", secondary: "#0b3d91", material: "acrilico",
  };
  const body = bodyFromAthlete(a, 0, 0, { x: -0.55, y: 0 });
  const w = createWorld(cfg, [body], { x: -0.38, y: 0 });
  const rad = (angleDeg * Math.PI) / 180;
  const p = predictShot(w, body.id, { x: Math.cos(rad), y: Math.sin(rad) }, power, spin, 220);
  const last = p.points[p.points.length - 1] ?? { x: -0.38, y: 0, z: 0 };
  return {
    ...p,
    distance: Math.hypot(last.x + 0.38, last.y),
    apexCm: (p.apex - 0.011) * 100,
  };
}

export default function LabPage() {
  return (
    <Suspense fallback={<div className="p-8 font-display uppercase tracking-[0.3em] text-dust">abrindo o laboratório…</div>}>
      <Lab />
    </Suspense>
  );
}

function Lab() {
  const params = useSearchParams();
  const { squads, nation } = useGame();
  const [code, setCode] = useState(params.get("nation") ?? nation);
  const [shirt, setShirt] = useState(Number(params.get("shirt") ?? 10));
  const [power, setPower] = useState(72);
  const [angle, setAngle] = useState(0);
  const [spin, setSpin] = useState(0);
  const [grass, setGrass] = useState<GrassQuality>("normal");
  const [weather, setWeather] = useState<Weather>("sol");
  const [kickToken, setKickToken] = useState(0);
  const [tele, setTele] = useState<LabTelemetry | null>(null);
  const [benchId, setBenchId] = useState<string | null>(null);

  const squad = useMemo(() => {
    const base = buildSquad(code, getNation(code).formation, 7);
    const custom = squads[code] ?? [];
    return base.map((b) => {
      const c = custom.find((x) => x.id === b.id || x.shirt === b.shirt);
      return c ? { ...c, role: b.role, shirt: b.shirt } : b;
    });
  }, [code, squads]);

  const athlete = useMemo(() => {
    if (benchId) {
      const b = BENCH.find((x) => x.id === benchId)!;
      return {
        id: `bench-${b.id}`, name: b.label, shirt: 99, role: "ATA" as const,
        attrs: b.attrs, primary: "#f7d417", secondary: "#123055", material: "acrilico",
      } as Athlete;
    }
    return squad.find((a) => a.shirt === shirt) ?? squad[9] ?? squad[0];
  }, [benchId, squad, shirt]);

  useEffect(() => {
    setBenchId(null);
  }, [code, shirt]);

  const damping = GRASSES.find((g) => g.id === grass)?.damping ?? 1;
  const wetness = WET[weather];
  const phys = derivePhysics(athlete.attrs);
  const p = power / 100;
  const forecast = useMemo(
    () => labPrediction(athlete.attrs, p, angle, spin, wetness, damping),
    [athlete.attrs, p, angle, spin, wetness, damping],
  );
  const benchRows = useMemo(
    () => BENCH.map((b) => ({ b, phys: derivePhysics(b.attrs), pred: labPrediction(b.attrs, p, angle, spin, wetness, damping) })),
    [p, angle, spin, wetness, damping],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Chip tone="pitch">Laboratório de física</Chip>
          <h1 className="mt-2 font-display text-[clamp(30px,6vw,54px)] font-900 uppercase leading-none tracking-[0.04em] text-chalk">
            Pista de <span className="text-ice">teste</span>
          </h1>
          <p className="max-w-2xl text-[13px] text-dust">
            Mesma física da partida, em escala reduzida. Meça velocidade de saída, altura máxima, distância, curva e a
            transferência de impulso do botão para a bola — e aprenda o seu elenco pelo corpo, não pelo número.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={code}
            onChange={(e) => { setCode(e.target.value); setBenchId(null); }}
            className="clip-btn border border-line bg-ink2 px-3 py-2 font-display text-sm uppercase tracking-[0.14em] text-chalk outline-none focus:border-gold/60"
          >
            {NATIONS.map((n) => <option key={n.code} value={n.code}>{n.flag} {n.name}</option>)}
          </select>
          <select
            value={String(athlete.shirt)}
            disabled={Boolean(benchId)}
            onChange={(e) => { setShirt(Number(e.target.value)); setBenchId(null); }}
            className="clip-btn border border-line bg-ink2 px-3 py-2 font-display text-sm uppercase tracking-[0.14em] text-chalk outline-none focus:border-gold/60 disabled:opacity-40"
          >
            {squad.map((a) => <option key={a.shirt} value={a.shirt}>#{a.shirt} {a.name}</option>)}
          </select>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-4">
          <Panel title={`Pista · ${athlete.name}`} tag={benchId ? "molde" : `#${athlete.shirt}`} pad={false}>
            <div className="relative h-[320px] w-full sm:h-[420px]">
              <LabCanvas
                attrs={athlete.attrs}
                primary={athlete.primary}
                secondary={athlete.secondary}
                wetness={wetness}
                grassDamping={damping}
                power={p}
                angle={angle}
                spin={spin}
                kickToken={kickToken}
                onTelemetry={setTele}
              />
              <div className="pointer-events-none absolute right-3 top-3 space-y-1 text-right">
                <div className="hud-chip clip-tag px-2.5 py-1 font-display text-[11px] uppercase tracking-[0.16em] text-gold">
                  {tele?.running ? "simulando…" : "parado"}
                </div>
                <div className="hud-chip clip-tag px-2.5 py-1 font-display text-[11px] uppercase tracking-[0.16em] text-chalk">
                  {tele?.ballSpeed.toFixed(2) ?? "0.00"} m/s
                </div>
              </div>
            </div>
            <div className="grid gap-3 border-t border-line/70 p-3 sm:grid-cols-4">
              <Metric label="Vel. da bola" value={`${(tele?.ballSpeed ?? forecast.impactSpeed).toFixed(2)} m/s`} tone="text-gold" />
              <Metric label="Altura máx." value={`${((tele?.apex ?? forecast.apex - 0.011) * 100).toFixed(1)} cm`} tone="text-ice" />
              <Metric label="Distância" value={`${((tele?.distance ?? forecast.distance) * 100).toFixed(0)} cm`} tone="text-pitch" />
              <Metric label="Curva" value={`${((tele?.curve ?? forecast.curve) * 100).toFixed(1)} cm`} tone="text-hot" />
            </div>
          </Panel>

          <Panel title="Bancada comparativa" tag="Mesma força, botões diferentes">
            <div className="overflow-x-auto scroll-x">
              <table className="w-full min-w-[620px] border-collapse">
                <thead>
                  <tr className="border-b border-line">
                    {["Botão", "Borda", "Contato", "Lift", "Massa", "V. bola", "Altura", "Distância", "Curva"].map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-display text-[10px] uppercase tracking-[0.16em] text-dust">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {benchRows.map(({ b, phys: pp, pred }) => (
                    <tr
                      key={b.id}
                      onClick={() => setBenchId(b.id)}
                      className={cn(
                        "cursor-pointer border-b border-line/40 transition hover:bg-ink3/60",
                        benchId === b.id && "bg-gold/10",
                      )}
                    >
                      <td className="px-2 py-1.5 font-display text-[13px] uppercase tracking-[0.08em] text-chalk">{b.label}</td>
                      <td className="px-2 py-1.5 tabular-nums text-dust">{b.attrs.edge}</td>
                      <td className="px-2 py-1.5 tabular-nums text-ice">{pp.contactSlopeDeg.toFixed(0)}°</td>
                      <td className="px-2 py-1.5 tabular-nums text-gold">{(pp.liftIndex * 100).toFixed(0)}%</td>
                      <td className="px-2 py-1.5 tabular-nums text-dust">{(pp.massKg * 1000).toFixed(1)}g</td>
                      <td className="px-2 py-1.5 tabular-nums text-chalk">{pred.impactSpeed.toFixed(2)}</td>
                      <td className="px-2 py-1.5 tabular-nums text-chalk">{pred.apexCm.toFixed(1)} cm</td>
                      <td className="px-2 py-1.5 tabular-nums text-chalk">{(pred.distance * 100).toFixed(0)} cm</td>
                      <td className="px-2 py-1.5 tabular-nums text-hot">{(pred.curve * 100).toFixed(1)} cm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-dust/80">
              Clique numa linha para carregar o molde na pista. Todos os chutes usam a mesma força e o mesmo efeito —
              a diferença que você vê é <strong className="text-chalk">só geometria e massa</strong>.
            </p>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Controles" tag="Disparo">
            <div className="space-y-4">
              <Field label={`Força · ${power}%`} hint={`velocidade de saída do botão: ${(phys.maxSpeed * p).toFixed(2)} m/s`}>
                <input type="range" min={5} max={100} value={power} onChange={(e) => setPower(Number(e.target.value))} className="w-full" />
              </Field>
              <Field label={`Ângulo · ${angle}°`}>
                <input type="range" min={-45} max={45} value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="w-full" />
              </Field>
              <Field label={`Efeito · ${spin > 0 ? "+" : ""}${spin.toFixed(1)}`} hint="curva Magnus aplicada à bola">
                <input type="range" min={-1} max={1} step={0.1} value={spin} onChange={(e) => setSpin(Number(e.target.value))} className="w-full" />
              </Field>
              <Field label="Gramado">
                <Segmented size="sm" options={GRASSES.map((g) => ({ id: g.id, label: g.label }))} value={grass} onChange={setGrass} />
              </Field>
              <Field label="Clima">
                <Segmented size="sm" options={WEATHERS.map((w) => ({ id: w.id, label: w.label, icon: w.icon }))} value={weather} onChange={setWeather} />
              </Field>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Btn block size="lg" variant="pitch" onClick={() => setKickToken((k) => k + 1)}>▶ Chutar</Btn>
                <Btn block variant="ghost" onClick={() => { setPower(72); setAngle(0); setSpin(0); setGrass("normal"); setWeather("sol"); }}>
                  Zerar
                </Btn>
              </div>
            </div>
          </Panel>

          <Panel title="Telemetria" tag="Medido">
            <div className="space-y-1">
              {[
                ["Transferência botão→bola", `${(tele?.transfer ?? (forecast.impactSpeed / Math.max(0.01, phys.maxSpeed * p))).toFixed(2)}×`],
                ["Chutes disparados", String(tele?.shots ?? 0)],
                ["Alvo atingido", tele?.hitTarget ? "SIM" : forecast.goal ? "previsto" : "não"],
                ["Bola ainda rolando", tele?.running ? "sim" : "não"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2 border-b border-line/40 py-1">
                  <span className="font-display text-[10px] uppercase tracking-[0.16em] text-dust">{k}</span>
                  <span className="font-display text-[13px] font-700 tabular-nums text-chalk">{v}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-dust/80">{phys.signature}</p>
          </Panel>

          <Panel title="O que muda aqui" tag="Leitura">
            <ul className="space-y-1.5 text-[12px] leading-snug text-dust">
              <li><span className="text-gold">Força</span> define a velocidade de saída do botão — e o impulso transferido à bola.</li>
              <li><span className="text-ice">Deslize</span> reduz o atrito: o botão percorre mais mesa antes de parar.</li>
              <li><span className="text-pitch">Borda</span> inclina a normal de contato: quanto maior o ângulo, mais a bola sobe.</li>
              <li><span className="text-hot">Massa</span> aumenta a transferência de impulso, mas reduz a aceleração do peteleco.</li>
              <li><span className="text-chalk">Chuva</span> corta atrito e efeito: a bola corre mais e curva menos.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="border-l-2 border-line bg-ink2/50 px-3 py-2">
      <div className="font-display text-[10px] uppercase tracking-[0.2em] text-dust">{label}</div>
      <div className={cn("font-display text-xl font-900 tabular-nums", tone)}>{value}</div>
    </div>
  );
}
