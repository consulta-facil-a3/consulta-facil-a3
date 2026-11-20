const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const ROOT = path.resolve(__dirname, "..");
const HTML = path.join(ROOT, "relatorio", "relatorio.html");
const OUT = path.join(ROOT, "relatorio", "draft.pdf");
const PROFILE = path.join(os.tmpdir(), "consulta-facil-pdf-" + Date.now());
const PORT = 9334;

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
    await send("Page.navigate", { url: "file:///" + HTML.replace(/\\/g, "/") });
    await sleep(1800);
    await send("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
    await send("Runtime.evaluate", {
      expression: "Promise.all(Array.from(document.images).map(img => img.complete ? true : new Promise(r => { img.onload = img.onerror = r; })))",
      awaitPromise: true
    });

    const metrics = await send("Runtime.evaluate", {
      expression: `Array.from(document.querySelectorAll('.sheet')).map((s, i) => ({
        page: i + 1,
        clientHeight: s.clientHeight,
        scrollHeight: s.scrollHeight,
        offsetHeight: s.offsetHeight,
        top: s.getBoundingClientRect().top + window.scrollY
      }))`,
      returnByValue: true
    });
    console.log(JSON.stringify(metrics.result.value, null, 2));

    const pdf = await send("Page.printToPDF", {
      landscape: false,
      printBackground: true,
      preferCSSPageSize: true,
      scale: 1,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0
    });
    fs.writeFileSync(OUT, Buffer.from(pdf.data, "base64"));
    console.log(OUT);

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
