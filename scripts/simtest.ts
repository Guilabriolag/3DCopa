import { performance } from "node:perf_hooks";
import { buildSquad } from "../src/game/attributes";
import { MatchController, simulateMatch, type MatchSettings, type TeamSetup } from "../src/game/match";

const settings: MatchSettings = {
  stadiumCode: "olimpico",
  weather: "sol",
  timeOfDay: "tarde",
  grass: "normal",
  walls: true,
  halves: 2,
  halfSeconds: 24,
  gk: true,
  spin: 0,
};

function setup(code: string, seed: number, tactic: TeamSetup["tactic"] = "equilibrada"): TeamSetup {
  return { nationCode: code, squad: buildSquad(code, "4-3-3", seed), formation: "4-3-3", tactic };
}

const t0 = performance.now();
const r = simulateMatch({ ...settings, halfSeconds: 22 }, setup("BRA", 3), setup("ARG", 9), 12345);
const t1 = performance.now();
console.log("headless BRA x ARG:", r.home, "x", r.away, "em", (t1 - t0).toFixed(0), "ms");
console.log("  toques:", r.stats.touches, "chutes:", r.stats.shots, "defesas:", r.stats.saves, "traves:", r.stats.posts);

// taxa de gols em 12 partidas de 45s por tempo
const t2 = performance.now();
let goals = 0;
let draws = 0;
const scores: string[] = [];
for (let i = 0; i < 12; i++) {
  const codes = ["FRA", "GER", "ESP", "POR", "ENG", "ITA", "NED", "URU", "JPN", "SEN", "CRO", "MAR"];
  const s = simulateMatch({ ...settings, halfSeconds: 45 }, setup(codes[i], i, "ofensiva"), setup(codes[(i + 6) % 12], i + 5), 4242 + i * 91);
  goals += s.home + s.away;
  if (s.home === s.away) draws++;
  scores.push(`${s.home}-${s.away}`);
}
const t3 = performance.now();
console.log(
  "12 partidas 45s:", (t3 - t2).toFixed(0), "ms · média", ((t3 - t2) / 12).toFixed(0),
  "ms/jogo · gols totais", goals, "· média", (goals / 12).toFixed(2), "· empates", draws,
);
console.log("  placares:", scores.join(" "));

// partida "jogável": bot mira o gol adversário como um humano faria
const ctrl = new MatchController(settings, setup("BRA", 1, "ofensiva"), setup("ESP", 2), 0, 777);
let frames = 0;
const started = performance.now();
let shots = 0;
while (!ctrl.finished && frames < 60 * 600) {
  if (ctrl.phase === "aim") {
    // emula o controle novo: auto-mira na bola + força variada + efeito lateral
    ctrl.autoSelect();
    const id = ctrl.selectedId!;
    const b = ctrl.world.bodies.find((x) => x.id === id)!;
    const dx = ctrl.world.ball.x - b.pos.x;
    const dy = ctrl.world.ball.y - b.pos.y;
    const d = Math.hypot(dx, dy) || 1;
    ctrl.playerShoot({ x: dx / d, y: dy / d }, 0.5 + Math.random() * 0.5, (Math.random() * 2 - 1) * 0.5);
    shots++;
  }
  ctrl.update(1 / 60);
  frames++;
}
console.log(
  "partida jogável:", ctrl.score.join("x"), "· tempo real", (performance.now() - started).toFixed(0), "ms",
  "· petelecos", shots, "· minuto", ctrl.minute.toFixed(1), "· fase", ctrl.phase,
);
console.log("  stats:", JSON.stringify({ ...ctrl.stats, scorers: ctrl.stats.scorers.length }));
const feedText = ctrl.feed.slice(0, 4).map((f) => f.text).join(" | ");
console.log("  narração:", feedText);

