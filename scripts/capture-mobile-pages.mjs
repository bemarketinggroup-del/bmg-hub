import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outputDirectory = resolve(process.argv[2] || join(tmpdir(), "bmg-mobile-pages"));
const workDirectory = mkdtempSync(join(tmpdir(), "bmg-mobile-render-"));
mkdirSync(outputDirectory, { recursive: true });
const source = readFileSync(resolve("public/index.html"), "utf8");
const styles = readFileSync(resolve("public/styles.css"), "utf8");

const defaultViews = [
  "dashboardView",
  "personalView",
  "chatView",
  "contentView",
  "clientsView",
  "pedView",
  "clientHealthOverviewView",
  "clientHealthView",
  "graphicsView",
  "graphicsReviewsView",
  "calendarView",
  "teamView",
  "smartView",
  "counterView",
  "settingsView",
  "usersView",
];
const requestedViews = process.argv.slice(3);
const views = requestedViews.length ? requestedViews : defaultViews;

const staticSource = source
  .replace(/<link[^>]+fonts\.googleapis\.com[^>]*>/g, "")
  .replace(/<link[^>]+fonts\.gstatic\.com[^>]*>/g, "")
  .replace('<link rel="stylesheet" href="styles.css">', `<style>${styles}</style>`)
  .replace(/<script src="[^"]+"><\/script>/g, "")
  .replace("</head>", `<style>
    .login-screen { display: none !important; }
    .app-shell.is-hidden { display: block !important; }
    .mobile-visual-label {
      position: fixed; z-index: 1000; right: 4px; bottom: 4px;
      border-radius: 999px; background: #17130f; color: white;
      padding: 4px 7px; font: 700 9px/1 system-ui;
    }
  </style></head>`);

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-background-networking",
  "--disable-component-update",
  "--disable-default-apps",
  "--disable-extensions",
  "--disable-gpu",
  "--no-first-run",
  "--remote-allow-origins=*",
  "--remote-debugging-port=0",
  `--user-data-dir=${join(workDirectory, "profile")}`,
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

const websocketUrl = await new Promise((resolveUrl, rejectUrl) => {
  const timeout = setTimeout(() => rejectUrl(new Error("Chrome DevTools non disponibile")), 20_000);
  chrome.stderr.setEncoding("utf8");
  chrome.stderr.on("data", (chunk) => {
    const match = chunk.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (!match) return;
    clearTimeout(timeout);
    resolveUrl(match[1]);
  });
  chrome.once("error", rejectUrl);
});

const socket = new WebSocket(websocketUrl);
await new Promise((resolveSocket, rejectSocket) => {
  socket.addEventListener("open", resolveSocket, { once: true });
  socket.addEventListener("error", rejectSocket, { once: true });
});

let commandId = 0;
const pendingCommands = new Map();
socket.addEventListener("message", (event) => {
  const payload = JSON.parse(event.data);
  if (!payload.id || !pendingCommands.has(payload.id)) return;
  const { resolve: resolveCommand, reject: rejectCommand } = pendingCommands.get(payload.id);
  pendingCommands.delete(payload.id);
  if (payload.error) rejectCommand(new Error(payload.error.message));
  else resolveCommand(payload.result);
});

function command(method, params = {}, sessionId) {
  commandId += 1;
  const currentId = commandId;
  const payload = { id: commandId, method, params };
  if (sessionId) payload.sessionId = sessionId;
  return new Promise((resolveCommand, rejectCommand) => {
    pendingCommands.set(currentId, { resolve: resolveCommand, reject: rejectCommand });
    socket.send(JSON.stringify(payload));
  });
}

const { targetId } = await command("Target.createTarget", { url: "about:blank" });
const { sessionId } = await command("Target.attachToTarget", { targetId, flatten: true });
await command("Page.enable", {}, sessionId);
await command("Runtime.enable", {}, sessionId);
await command("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
  screenWidth: 390,
  screenHeight: 844,
}, sessionId);

const report = {};

for (const viewId of views) {
  const html = staticSource.replace("</body>", `<span class="mobile-visual-label">${viewId}</span>
    <script>
      document.getElementById("appShell").classList.remove("is-hidden");
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("is-active"));
      document.getElementById(${JSON.stringify(viewId)}).classList.add("is-active");
      document.body.className = ${JSON.stringify(viewId.replace(/View$/, "-view-active").replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).replace(/^-/, ""))};
      document.querySelector(".topbar h1").textContent = ${JSON.stringify(viewId)};
    </script></body>`);
  const htmlPath = join(workDirectory, `${viewId}.html`);
  const screenshotPath = join(outputDirectory, `${viewId}.png`);
  writeFileSync(htmlPath, html);
  await command("Page.navigate", { url: `file://${htmlPath}` }, sessionId);
  await new Promise((resolveFrame) => setTimeout(resolveFrame, 180));
  const metrics = await command("Runtime.evaluate", {
    expression: `(() => {
      const width = document.documentElement.clientWidth;
      const overflowing = [...document.querySelectorAll("body *")]
        .filter((element) => {
          if (element.closest(".sidebar, .ai-context-panel")) return false;
          const clippedByScroller = [...function* ancestors(node) {
            for (let parent = node.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
              yield parent;
            }
          }(element)].some((parent) => {
            const parentStyle = getComputedStyle(parent);
            return ["auto", "scroll", "hidden", "clip"].includes(parentStyle.overflowX);
          });
          if (clippedByScroller) return false;
          const style = getComputedStyle(element);
          if (style.position === "fixed" || style.display === "none") return false;
          const box = element.getBoundingClientRect();
          return box.right > width + 1 || box.left < -1;
        })
        .slice(0, 12)
        .map((element) => ({
          selector: element.id ? "#" + element.id : "." + [...element.classList].join("."),
          left: Math.round(element.getBoundingClientRect().left),
          right: Math.round(element.getBoundingClientRect().right),
        }));
      return { width, scrollWidth: document.documentElement.scrollWidth, overflowing };
    })()`,
    returnByValue: true,
  }, sessionId);
  report[viewId] = metrics.result.value;
  const capture = await command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: true,
  }, sessionId);
  writeFileSync(screenshotPath, Buffer.from(capture.data, "base64"));
}

writeFileSync(join(outputDirectory, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
await command("Browser.close");
const invalidViews = Object.entries(report).filter(([, metrics]) => (
  metrics.scrollWidth !== metrics.width || metrics.overflowing.length > 0
));
if (invalidViews.length) {
  throw new Error(`Overflow mobile rilevato in: ${invalidViews.map(([viewId]) => viewId).join(", ")}`);
}
console.log(`Mobile visual capture completata: ${views.length} pagine in ${outputDirectory}`);
