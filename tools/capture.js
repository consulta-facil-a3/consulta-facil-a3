const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const ROOT = path.resolve(__dirname, "..");
// CAPTURE_OUT muda a pasta de saída; CAPTURE_ALL=1 captura também as telas de apoio (para revisão).
const OUT = process.env.CAPTURE_OUT ? path.resolve(process.env.CAPTURE_OUT) : path.join(ROOT, "capturas");
const PROFILE = path.join(os.tmpdir(), "consulta-facil-edge-" + Date.now());
const PORT = 9333;

fs.mkdirSync(OUT, { recursive: true });

const shots = [
  { name: "01-entrar", query: "?tela=entrar&demo=1" },
  { name: "02-ubs", query: "?tela=ubs" },
  { name: "03-horarios", query: "?tela=horarios&slot=14:20" },
  { name: "04-vaga-ocupada", query: "?tela=vaga-ocupada&slot=14:20" },
  { name: "05-comprovante", query: "?tela=comprovante&slot=16:20" }
];

if (process.env.CAPTURE_ALL === "1") {
  shots.push(
    { name: "90-inicio", query: "?tela=inicio" },
    { name: "91-especialidade", query: "?tela=especialidade" },
    { name: "92-confirmar", query: "?tela=confirmar&slot=16:20" },
    { name: "93-consultas", query: "?tela=consultas" },
    { name: "94-ajuda", query: "?tela=ajuda" },
    { name: "95-agente", query: "?tela=agente" }
  );
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForTarget() {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((item) => item.type === "page");
      if (page && page.webSocketDebuggerUrl) return page;
    } catch (err) {
      // Edge ainda está subindo.
    }
    await sleep(150);
  }
  throw new Error("Não foi possível conectar ao Edge.");
}

async function main() {
  const edge = spawn(EDGE, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "--remote-debugging-address=127.0.0.1",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    "about:blank"
  ], { stdio: "ignore" });

  try {
    const target = await waitForTarget();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    const pending = new Map();
    let nextId = 0;

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const job = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) job.reject(new Error(JSON.stringify(message.error)));
        else job.resolve(message.result);
      }
    };

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 430,
      height: 932,
      deviceScaleFactor: 2,
      mobile: true,
      screenWidth: 430,
      screenHeight: 932
    });

    for (const shot of shots) {
      const url = "file:///" + path.join(ROOT, "prototipo", "index.html").replace(/\\/g, "/") + shot.query;
      await send("Page.navigate", { url });
      await sleep(1300);
      await send("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
      await sleep(250);
      const { data } = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
        fromSurface: true
      });
      const file = path.join(OUT, shot.name + ".png");
      fs.writeFileSync(file, Buffer.from(data, "base64"));
      console.log(file);
    }

    ws.close();
  } finally {
    try { edge.kill(); } catch (err) {}
    await sleep(400);
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (err) {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
