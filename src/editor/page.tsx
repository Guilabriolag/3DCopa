"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Btn, Chip, Field, Panel, Slider, cn } from "@/components/ui";
import {
  FIELD, buildSquad, buttonGeometry, derivePhysics, overall, radiusAtHeight,
  type Athlete, type AthleteAttrs, type Role,
} from "@/game/attributes";
import type { AthleteRow } from "@/db/schema";
import { api } from "@/lib/api";
import { NATIONS, getNation } from "@/lib/nations";
import { useGame } from "@/store/game";

const ButtonPreview = dynamic(() => import("@/components/ButtonPreview"), { ssr: false });

const ROLES: Role[] = ["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"];

const PRESETS: { id: string; label: string; hint: string; attrs: Partial<AthleteAttrs> }[] = [
  { id: "rasteiro", label: "Rasteiro", hint: "borda vertical, contato horizontal", attrs: { edge: 4, height: 42, mass: 52, slide: 78, force: 76, precision: 82, radius: 52 } },
  { id: "aereo", label: "Chute alto", hint: "borda inclinada, componente vertical", attrs: { edge: 92, height: 62, mass: 46, slide: 74, force: 84, precision: 80, radius: 46 } },
  { id: "tanque", label: "Tanque", hint: "massa e raio altos, trava o duelo", attrs: { edge: 18, height: 70, mass: 94, slide: 48, force: 88, precision: 70, radius: 88 } },
  { id: "veloz", label: "Veloz", hint: "leve, deslize extremo, curva fina", attrs: { edge: 44, height: 34, mass: 16, slide: 95, force: 70, precision: 90, radius: 34 } },
  { id: "cobre", label: "Cobrador de efeito", hint: "precisão máxima, Magnus forte", attrs: { edge: 58, height: 50, mass: 40, slide: 86, force: 74, precision: 97, radius: 48 } },
];

export default function EditorPage() {
  const router = useRouter();
  const { squads, saveSquad, saveAthlete, profileId, nation } = useGame();
  const [code, setCode] = useState(nation);
  const [shirt, setShirt] = useState<number | null>(null);
  const [draft, setDraft] = useState<Athlete | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const baseSquad = useMemo(() => buildSquad(code, getNation(code).formation, 7), [code]);
  const squad = useMemo(() => {
    const custom = squads[code] ?? [];
    return baseSquad.map((b) => {
      const c = custom.find((x) => x.id === b.id || x.shirt === b.shirt);
      return c ? { ...c, role: b.role, shirt: b.shirt, primary: getNation(code).primary, secondary: getNation(code).secondary } : b;
    });
  }, [baseSquad, squads, code]);

  useEffect(() => {
    if (!profileId) return;
    (async () => {
      try {
        const { items } = await api<{ items: AthleteRow[] }>(`/api/athletes?profileId=${profileId}`);
        const byNation: Record<string, Athlete[]> = {};
        for (const it of items) {
          const a: Athlete = {
            id: it.id, name: it.name, shirt: it.shirt, role: it.role as Role,
            attrs: { force: it.force, slide: it.slide, precision: it.precision, edge: it.edge, height: it.height, mass: it.mass, radius: it.radius },
            primary: it.primary, secondary: it.secondary, material: it.material,
          };
          (byNation[it.nationCode] ||= []).push(a);
        }
        for (const [k, v] of Object.entries(byNation)) {
          const merged = buildSquad(k, getNation(k).formation, 7).map((b) => {
            const c = v.find((x) => x.shirt === b.shirt);
            return c ? { ...c, role: b.role, shirt: b.shirt } : b;
          });
          saveSquad(k, merged);
        }
      } catch (e) {
        console.warn("elenco offline", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  useEffect(() => {
    const target = shirt === null ? 10 : shirt;
    const found = squad.find((a) => a.shirt === target) ?? squad[9] ?? squad[0];
    setDraft(JSON.parse(JSON.stringify(found)) as Athlete);
    setShirt(found.shirt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, squads]);

  if (!draft) return null;
  const phys = derivePhysics(draft.attrs);
  const nationData = getNation(code);

  function patch(p: Partial<AthleteAttrs>) {
    setDraft((d) => (d ? { ...d, attrs: { ...d.attrs, ...p } } : d));
  }

  async function save() {
    if (!draft) return;
    saveAthlete(code, draft);
    setSaved("elenco local");
    if (profileId) {
      try {
        await api("/api/athletes", {
          method: "POST",
          body: JSON.stringify({
            profileId, name: draft.name, shirt: draft.shirt, role: draft.role, nationCode: code,
            ...draft.attrs, material: draft.material, primary: draft.primary, secondary: draft.secondary,
          }),
        });
        setSaved("banco");
      } catch {
        setSaved("somente local (banco offline)");
      }
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Chip tone="gold">Editor</Chip>
          <h1 className="mt-2 font-display text-[clamp(30px,6vw,54px)] font-900 uppercase leading-none tracking-[0.04em] text-chalk">
            Atletas <span className="text-pitch">físicos</span>
          </h1>
          <p className="max-w-2xl text-[13px] text-dust">
            Aqui o número vira geometria e a geometria vira física. Gire o modelo, mexa na borda e veja o vetor de
            contato mudar — é ele que decide se o chute sai rasteiro ou levantado.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={code}
            onChange={(e) => { setCode(e.target.value); setShirt(null); }}
            className="clip-btn border border-line bg-ink2 px-3 py-2 font-display text-sm uppercase tracking-[0.14em] text-chalk outline-none focus:border-gold/60"
          >
            {NATIONS.map((n) => (
              <option key={n.code} value={n.code}>{n.flag} {n.name}</option>
            ))}
          </select>
          <Btn variant="ghost" onClick={() => { saveSquad(code, baseSquad); setShirt(null); }}>Restaurar padrão</Btn>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_360px]">
        <Panel title="Elenco" tag={`${nationData.flag} ${code}`} pad={false}>
          <div className="max-h-[560px] overflow-y-auto scroll-x">
            {squad.map((a) => {
              const p = derivePhysics(a.attrs);
              const active = a.shirt === draft.shirt;
              return (
                <button
                  key={a.shirt}
                  type="button"
                  onClick={() => { setShirt(a.shirt); setDraft(JSON.parse(JSON.stringify(a)) as Athlete); }}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-line/40 px-3 py-2 text-left transition",
                    active ? "bg-gold/10" : "hover:bg-ink3/60",
                  )}
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border font-display text-sm font-900"
                    style={{ borderColor: a.primary, color: a.primary, background: `${a.secondary}33` }}
                  >
                    {a.shirt}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[14px] font-700 uppercase tracking-[0.08em] text-chalk">
                      {a.name}
                    </span>
                    <span className="block font-display text-[10px] uppercase tracking-[0.18em] text-dust">
                      {a.role} · {(p.massKg * 1000).toFixed(1)}g · borda {p.contactSlopeDeg.toFixed(0)}°
                    </span>
                  </span>
                  <span className="font-display text-lg font-900 tabular-nums text-gold">{overall(a.attrs)}</span>
                </button>
              );
            })}
          </div>
          <div className="space-y-2 border-t border-line/70 p-3">
            <div className="font-display text-[10px] uppercase tracking-[0.22em] text-dust">Moldes prontos</div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  title={p.hint}
                  onClick={() => patch(p.attrs)}
                  className="clip-btn border border-line bg-ink2 px-2.5 py-1 font-display text-[11px] uppercase tracking-[0.12em] text-dust transition hover:border-gold/60 hover:text-gold"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Botão 3D" tag="Geometria" pad={false}>
            <div className="relative h-[300px] w-full sm:h-[360px]">
              <ButtonPreview
                attrs={draft.attrs}
                primary={draft.primary}
                secondary={draft.secondary}
                shirt={draft.shirt}
                name={draft.name}
                className="absolute inset-0"
              />
            </div>
            <div className="grid gap-3 border-t border-line/70 p-3 sm:grid-cols-[minmax(0,1fr)_240px]">
              <ContactDiagram attrs={draft.attrs} />
              <div className="space-y-1">
                <div className="font-display text-[10px] uppercase tracking-[0.22em] text-dust">Leitura da borda</div>
                <Readout rows={[
                  ["Ângulo de contato", `${phys.contactSlopeDeg.toFixed(1)}°`],
                  ["Altura de contato", `${(phys.contactHeightM * 1000).toFixed(1)} mm`],
                  ["Elevação (lift)", `${(phys.liftIndex * 100).toFixed(0)}%`],
                  ["Viés de espessura", phys.heightBias.toFixed(2)],
                  ["Raio topo", `${(phys.topRadiusM * 1000).toFixed(1)} mm`],
                ]} />
                <p className="text-[11px] leading-snug text-pitch">{phys.signature}</p>
              </div>
            </div>
          </Panel>

          <Panel title="Propriedades físicas derivadas" tag="Camada 3">
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ["Massa", `${(phys.massKg * 1000).toFixed(2)} g`],
                ["Raio", `${(phys.radiusM * 1000).toFixed(1)} mm`],
                ["Altura", `${(phys.heightM * 1000).toFixed(1)} mm`],
                ["Atrito", `${phys.friction.toFixed(2)} /s`],
                ["Restituição", phys.restitution.toFixed(2)],
                ["Vel. máxima", `${phys.maxSpeed.toFixed(2)} m/s`],
                ["Erro de mira", `±${phys.aimErrorDeg.toFixed(2)}°`],
                ["Autoridade de efeito", phys.curveAuthority.toFixed(2)],
                ["Estabilidade", `${(phys.stability * 100).toFixed(0)}%`],
              ].map(([k, v]) => (
                <div key={k} className="border border-line/60 bg-ink2/60 px-3 py-2">
                  <div className="font-display text-[10px] uppercase tracking-[0.2em] text-dust">{k}</div>
                  <div className="font-display text-lg font-800 tabular-nums text-chalk">{v}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Atributos" tag="Camada 1">
            <div className="space-y-3">
              <Slider label="Força" value={draft.attrs.force} onChange={(v) => patch({ force: v })} tone="hot"
                hint="impulso máximo do peteleco" />
              <Slider label="Deslize" value={draft.attrs.slide} onChange={(v) => patch({ slide: v })} tone="ice"
                hint="menos perda de velocidade na grama" />
              <Slider label="Precisão" value={draft.attrs.precision} onChange={(v) => patch({ precision: v })} tone="gold"
                hint="dispersão do vetor + autoridade de curva" />
              <Slider label="Borda" value={draft.attrs.edge} onChange={(v) => patch({ edge: v })} tone="pitch"
                hint="0 = parede vertical (rasteiro) · 100 = chanfro inclinado (aéreo)" />
              <Slider label="Altura" value={draft.attrs.height} onChange={(v) => patch({ height: v })}
                hint="espessura: define onde a bola é tocada" />
              <Slider label="Massa" value={draft.attrs.mass} onChange={(v) => patch({ mass: v })} tone="hot"
                hint="transferência de impulso e estabilidade" />
              <Slider label="Raio" value={draft.attrs.radius} onChange={(v) => patch({ radius: v })} tone="ice"
                hint="área de contato e alcance da travada" />
            </div>
          </Panel>

          <Panel title="Identidade" tag="Atleta">
            <div className="space-y-3">
              <Field label="Nome">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value.slice(0, 24) })}
                  className="clip-btn w-full border border-line bg-ink2 px-3 py-2 font-display uppercase tracking-[0.1em] text-chalk outline-none focus:border-gold/60"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Camisa">
                  <input
                    type="number" min={1} max={99} value={draft.shirt}
                    onChange={(e) => setDraft({ ...draft, shirt: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })}
                    className="clip-btn w-full border border-line bg-ink2 px-3 py-2 font-display tabular-nums text-chalk outline-none focus:border-gold/60"
                  />
                </Field>
                <Field label="Posição">
                  <select
                    value={draft.role}
                    onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}
                    className="clip-btn w-full border border-line bg-ink2 px-3 py-2 font-display uppercase text-chalk outline-none focus:border-gold/60"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cor do topo">
                  <input
                    type="color" value={draft.primary}
                    onChange={(e) => setDraft({ ...draft, primary: e.target.value })}
                    className="h-9 w-full cursor-pointer border border-line bg-ink2"
                  />
                </Field>
                <Field label="Cor do corpo">
                  <input
                    type="color" value={draft.secondary}
                    onChange={(e) => setDraft({ ...draft, secondary: e.target.value })}
                    className="h-9 w-full cursor-pointer border border-line bg-ink2"
                  />
                </Field>
              </div>
              <div className="flex items-center justify-between border-t border-line/60 pt-3">
                <span className="font-display text-[11px] uppercase tracking-[0.2em] text-dust">Overall</span>
                <span className="font-display text-3xl font-900 tabular-nums text-gold">{overall(draft.attrs)}</span>
              </div>
              <Btn block size="lg" variant="primary" onClick={save}>Salvar atleta</Btn>
              {saved && (
                <p className="text-center font-display text-[11px] uppercase tracking-[0.16em] text-pitch">
                  ✓ salvo em {saved}
                </p>
              )}
              <Btn block variant="ghost" onClick={() => router.push(`/lab?nation=${code}&shirt=${draft.shirt}`)}>
                ⚗ Testar no laboratório
              </Btn>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Readout({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="space-y-0.5">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-2 border-b border-line/40 py-0.5">
          <dt className="font-display text-[10px] uppercase tracking-[0.16em] text-dust">{k}</dt>
          <dd className="font-display text-[12px] font-700 tabular-nums text-chalk">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Corte lateral do botão + bola + vetor de contato: a mecânica assinatura do jogo. */
function ContactDiagram({ attrs }: { attrs: AthleteAttrs }) {
  const g = buttonGeometry(attrs);
  const phys = derivePhysics(attrs);
  const S = 2600;
  const W = 320, H = 130;
  const base = H - 22;
  const cx = 96;
  const half: [number, number][] = [];
  for (let i = 0; i <= 26; i++) {
    const y = (i / 26) * g.heightM;
    half.push([radiusAtHeight(g, y) * S, y * S]);
  }
  const path =
    `M ${cx - half[0][0]} ${base} ` +
    half.map(([r, y]) => `L ${cx - r} ${base - y}`).join(" ") +
    ` L ${cx + half[half.length - 1][0]} ${base - half[half.length - 1][1]} ` +
    [...half].reverse().map(([r, y]) => `L ${cx + r} ${base - y}`).join(" ") +
    " Z";
  const ballR = FIELD.ballRadius * S;
  const ballCx = cx + g.radiusM * S + ballR;
  const ballCy = base - ballR;
  const cy = phys.contactHeightM;
  const contactR = radiusAtHeight(g, cy) * S;
  const contactX = cx + contactR;
  const contactY = base - cy * S;
  const slope = (phys.contactSlopeDeg * Math.PI) / 180;
  const nx = Math.cos(slope) * 46;
  const ny = -Math.sin(slope) * 46;

  return (
    <div className="border border-line/60 bg-ink2/60 p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-display text-[10px] uppercase tracking-[0.22em] text-dust">Corte lateral</span>
        <span className="font-display text-[10px] uppercase tracking-[0.18em] text-ice">
          {phys.liftIndex > 0.5 ? "aéreo" : phys.liftIndex > 0.2 ? "semi-lift" : "rasteiro"}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        <defs>
          <marker id="ah" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <polygon points="0 0, 7 3.5, 0 7" fill="#f7d417" />
          </marker>
        </defs>
        <line x1="0" y1={base} x2={W} y2={base} stroke="#2c3d59" strokeWidth="2" />
        <path d={path} fill={phys.liftIndex > 0.5 ? "#3a2a12" : "#1d2b3f"} stroke="#7cc7ff" strokeWidth="1.4" />
        <circle cx={ballCx} cy={ballCy} r={ballR} fill="#e8ecf1" stroke="#93a2bd" strokeWidth="1" />
        <line x1={contactX} y1={contactY} x2={contactX + nx} y2={contactY + ny} stroke="#f7d417" strokeWidth="2.4" markerEnd="url(#ah)" />
        <circle cx={contactX} cy={contactY} r="3" fill="#ff5a4d" />
        <text x={contactX + nx + 6} y={contactY + ny} fill="#f7d417" fontSize="11" fontFamily="Barlow Condensed, sans-serif">
          {phys.contactSlopeDeg.toFixed(0)}°
        </text>
        <text x="6" y="16" fill="#93a2bd" fontSize="10" fontFamily="Barlow Condensed, sans-serif" letterSpacing="1.6">
          BORDA {attrs.edge}
        </text>
        <text x="6" y={base + 14} fill="#5d6f8c" fontSize="9" fontFamily="Barlow Condensed, sans-serif" letterSpacing="1.4">
          MESA
        </text>
      </svg>
    </div>
  );
}
