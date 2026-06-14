import { chromium } from "playwright";

const captures = [
  ["7bf8517f-c086-42c1-b427-6349a98abfb6", "http://localhost:3000/login", false],
  ["b6ea7485-23a3-4229-84dd-cb2c0dc6adcd", "http://localhost:3000/dashboard", true],
  ["8b8a75d2-23e7-4489-b372-fe12b3c6f141", "http://localhost:3000/projects", true],
  ["4d3b19db-77dd-4618-9250-1ae7eec13de6", "http://localhost:3000/generate", true],
  ["60e38cae-3e1d-46d0-b50f-ba79ed6e21da", "http://localhost:3000/account", true]
];

async function resolveAuthToken() {
  if (process.env.TESTSEED_CAPTURE_TOKEN) return process.env.TESTSEED_CAPTURE_TOKEN;
  const email = process.env.TESTSEED_CAPTURE_EMAIL;
  const password = process.env.TESTSEED_CAPTURE_PASSWORD;
  if (!email || !password) {
    console.error("Set TESTSEED_CAPTURE_TOKEN or TESTSEED_CAPTURE_EMAIL + TESTSEED_CAPTURE_PASSWORD");
    process.exit(1);
  }
  const res = await fetch("http://localhost:3001/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  return data.token;
}

const authToken = await resolveAuthToken();

const browser = await chromium.launch({ headless: true });

for (const [captureId, url, needsAuth] of captures) {
  const endpoint = `https://mcp.figma.com/mcp/capture/${captureId}/submit`;
  console.error(`[capture] ${url}`);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  if (needsAuth) {
    await context.addInitScript((token) => {
      const session = {
        token,
        user: { email: "capture@local" },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
      window.localStorage.setItem("testseedSession", JSON.stringify(session));
      window.localStorage.setItem("testseedToken", token);
      window.localStorage.setItem("testseed:theme", JSON.stringify({ mode: "dark", resolved: "dark" }));
      document.documentElement.classList.add("dark");
    }, authToken);
  }

  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(10000);

  const captureScript = await (
    await page.request.get("https://mcp.figma.com/mcp/html-to-design/capture.js")
  ).text();
  await page.evaluate((script) => {
    const el = document.createElement("script");
    el.textContent = script;
    document.head.appendChild(el);
  }, captureScript);
  await page.waitForTimeout(3000);

  await page.evaluate(
    async ({ captureId, endpoint }) =>
      window.figma.captureForDesign({ captureId, endpoint, selector: "body" }),
    { captureId, endpoint }
  );

  console.error(`[capture] submitted ${url}`);
  await context.close();
}

await browser.close();
console.error("[capture] all submitted");
