#!/usr/bin/env node
// 『玉結び』制御付き並列アセット生成ランナー（asset-forge / Codex ImageGen）。Seiken-5.0 版を移植。
// 使い方:
//   node forge/gen_runner.mjs                 # 全未生成を優先度順に生成
//   node forge/gen_runner.mjs --max 0         # P0 のみ
//   node forge/gen_runner.mjs --only id1,id2  # 指定IDのみ（再生成は --force）
//   GEN_CONCURRENCY=3 node forge/gen_runner.mjs
// 玉結び拡張:
//   - prompt 中の {MITO} を plan.mito_block（正典設定）で展開
//   - asset.reference があれば --reference を付与（キャラ一貫性ロック）
// 仕様: raw PNG が既にあればスキップ（resumable）。各生成に上限時間（既定600s）。ログは forge/logs/<id>.log。

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, openSync } from "node:fs";
import { dirname, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url)); // .../2D-RPG-Seihin/forge
const GAME = dirname(ROOT);
const CLI = "/Users/yuyafujita/GameDev-v2/tools/pixcel-asset/asset-forge/dist/src/cli/index.js";
const LOGS = join(ROOT, "logs");
const PLAN = join(ROOT, "assets_plan.json");
const CONC = parseInt(process.env.GEN_CONCURRENCY || "3", 10);
const PER_ASSET_TIMEOUT_MS = parseInt(process.env.GEN_TIMEOUT_MS || "600000", 10); // 10 min（複雑キャラシートは420s超あり）
const STAGGER_MS = 5000; // app-server 同時起動による DB ロック回避

const args = process.argv.slice(2);
const getArg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const force = args.includes("--force");
const maxPriority = getArg("--max") !== undefined ? parseInt(getArg("--max"), 10) : Infinity;
const only = getArg("--only") ? new Set(getArg("--only").split(",")) : null;

mkdirSync(LOGS, { recursive: true });
const plan = JSON.parse(readFileSync(PLAN, "utf8"));
const { common_avoid, footer, mito_block } = plan;

let assets = plan.assets.slice();
if (only) assets = assets.filter((a) => only.has(a.id));
assets = assets.filter((a) => (a.priority ?? 99) <= maxPriority);
assets.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

const rawPath = (a) => join(ROOT, "assets", "raw", a.id, "codex-imagegen.png");
const isDone = (a) => existsSync(rawPath(a));

function runOne(a) {
  return new Promise((resolve) => {
    if (!force && isDone(a)) return resolve({ id: a.id, status: "skip", dt: 0 });
    const body = a.prompt.replaceAll("{MITO}", mito_block ?? "");
    const prompt = a.no_footer
      ? `${body}\nAvoid: ${common_avoid}.`
      : `${body}\nAvoid: ${common_avoid}.\n${footer}`;
    const cliArgs = [CLI, "--root", ROOT, "generate",
      "--id", a.id, "--name", a.name, "--preset", a.preset, "--prompt", prompt];
    if (a.reference) {
      const ref = isAbsolute(a.reference) ? a.reference : join(GAME, a.reference);
      if (!existsSync(ref)) return resolve({ id: a.id, status: "NOREF", dt: 0 });
      cliArgs.push("--reference", ref);
    }
    const logFd = openSync(join(LOGS, `${a.id}.log`), "w");
    const t0 = Date.now();
    const child = spawn("node", cliArgs, { cwd: GAME, stdio: ["ignore", logFd, logFd] });
    let killed = false;
    const timer = setTimeout(() => { killed = true; try { child.kill("SIGKILL"); } catch {} }, PER_ASSET_TIMEOUT_MS);
    child.on("exit", (code) => {
      clearTimeout(timer);
      const dt = (Date.now() - t0) / 1000;
      // 注意: validator が exit1 を返しても raw が存在すれば実質成功（背景などは常に errorCount>0）
      const ok = !killed && isDone(a);
      resolve({ id: a.id, status: ok ? (code === 0 ? "ok" : "ok(raw)") : killed ? "TIMEOUT" : `FAIL(${code})`, dt });
    });
    child.on("error", () => { clearTimeout(timer); resolve({ id: a.id, status: "ERR", dt: (Date.now() - t0) / 1000 }); });
  });
}

const pending = assets.filter((a) => force || !isDone(a));
console.log(`[gen] ${assets.length} specced, ${pending.length} to generate, conc=${CONC}, maxP=${maxPriority}`);

const results = [];
let idx = 0, active = 0, doneCount = 0, launched = 0;
async function pump() {
  while (active < CONC && idx < assets.length) {
    const a = assets[idx++];
    active++;
    const delay = (force || !isDone(a)) ? (launched++ % CONC) * STAGGER_MS : 0;
    new Promise((r) => setTimeout(r, delay)).then(() => runOne(a)).then((r) => {
      active--; doneCount++;
      results.push(r);
      console.log(`[gen] ${String(doneCount).padStart(3)}/${assets.length} ${r.id.padEnd(22)} ${r.status.padEnd(10)} ${r.dt.toFixed(1)}s`);
      writeFileSync(join(ROOT, "gen_results.json"), JSON.stringify(results, null, 2));
      pump();
    });
  }
  if (active === 0 && idx >= assets.length) finish();
}
function finish() {
  const ok = results.filter((r) => r.status.startsWith("ok") || r.status === "skip").length;
  const bad = results.filter((r) => !(r.status.startsWith("ok") || r.status === "skip"));
  console.log(`[gen] DONE ok/skip=${ok} bad=${bad.length}`);
  if (bad.length) console.log("[gen] FAILED:", bad.map((b) => `${b.id}:${b.status}`).join(", "));
  writeFileSync(join(ROOT, "gen_results.json"), JSON.stringify(results, null, 2));
}
pump();
