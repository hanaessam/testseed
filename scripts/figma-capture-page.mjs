import { chromium } from "playwright";

const captureId = process.argv[2];
const url = process.argv[3];
const authToken = process.env.TESTSEED_CAPTURE_TOKEN;

if (!captureId || !url) {
  console.error("Usage: TESTSEED_CAPTURE_TOKEN=... node scripts/figma-capture-page.mjs <captureId> <url>");
  process.exit(1);
}

const endpoint = `https://mcp.figma.com/mcp/capture/${captureId}/submit`;

console.error(`[capture] ${url}`);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

if (authToken) {
  await context.addInitScript((token) => {
    const session = {
      token,
      user: { email: "dev@testseed.local" },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    window.localStorage.setItem("testseedSession", JSON.stringify(session));
    window.localStorage.setItem("testseedToken", token);
    window.localStorage.setItem("testseed:theme", JSON.stringify({ mode: "dark", resolved: "dark" }));
    document.documentElement.classList.add("dark");
  }, authToken);
}

const page = await context.newPage();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(8000);

const captureScript = await (
  await page.request.get("https://mcp.figma.com/mcp/html-to-design/capture.js")
).text();

await page.evaluate((script) => {
  const el = document.createElement("script");
  el.textContent = script;
  document.head.appendChild(el);
}, captureScript);

await page.waitForTimeout(3000);

console.error("[capture] submitting");
await page.evaluate(
  async ({ captureId, endpoint }) =>
    window.figma.captureForDesign({ captureId, endpoint, selector: "body" }),
  { captureId, endpoint }
);

console.error("[capture] done");
await browser.close();
