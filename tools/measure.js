const { spawn } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const ROOT = path.resolve(__dirname, "..");
const HTML = path.join(ROOT, "relatorio", "relatorio.html");
const PROFILE = path.join(os.tmpdir(), "consulta-facil-measure-" + Date.now());
const PORT = 9335;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((x) => x.type === "page");
      if (page) return page;
    } catch (e) {}
    await sleep(150);
  }
  throw new Error("sem Edge");
}

(async () => {
  const edge = spawn(EDGE, ["--headless=new","--disable-gpu","--no-first-run","--hide-scrollbars",`--remote-debugging-port=${PORT}`,`--user-data-dir=${PROFILE}`,"about:blank"], {stdio:"ignore"});
  try {
    const t = await target();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0; const pending = new Map();
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); } };
    const send = (method, params={}) => new Promise((resolve,reject) => { const i=++id; pending.set(i,{resolve,reject}); ws.send(JSON.stringify({id:i,method,params})); });
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setEmulatedMedia", { media: "print" });
    await send("Emulation.setDeviceMetricsOverride", { width: 605, height: 934, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", {url:"file:///"+HTML.replace(/\\/g,"/")});
    await sleep(1800);
    await send("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
    await sleep(300);
    const r = await send("Runtime.evaluate", {returnByValue:true, expression:`(() => {
      const px2mm = 25.4 / 96;
      const rep = document.querySelector('.report');
      const top = rep.getBoundingClientRect().top;
      const h2s = [...rep.querySelectorAll('h2')].map(h => ({t:h.innerText.trim().replace(/\\s+/g,' '), mm:+( (h.getBoundingClientRect().top - top) * px2mm ).toFixed(1)}));
      const blocks = [...rep.children].map(el => ({tag:el.tagName.toLowerCase(), cls:el.className, t:(el.innerText||'').trim().replace(/\\s+/g,' ').slice(0,60), mm:+(el.getBoundingClientRect().height*px2mm).toFixed(1)}));
      return {reportMM:+(rep.scrollHeight*px2mm).toFixed(1), h2s, blocks};
    })()`});
    console.log(JSON.stringify(r.result.value, null, 2));
    ws.close();
  } finally {
    try { edge.kill(); } catch(e) {}
    await sleep(300);
    try { fs.rmSync(PROFILE,{recursive:true,force:true}); } catch(e) {}
  }
})();
