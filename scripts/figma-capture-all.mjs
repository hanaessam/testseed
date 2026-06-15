import { chromium } from "playwright";

const captures = [
  ["96962884-5a7d-4259-a18d-f1eedf4346af", "http://localhost:3000/dashboard"],
  ["6aaeaa35-e810-4fb6-b6d9-3c4eab41e89a", "http://localhost:3000/projects"],
  ["50754e74-5e8c-48d5-8e8d-baec0fe49554", "http://localhost:3000/generate"],
  ["f1c790b9-2e3b-40af-b372-70176cb7ac2e", "http://localhost:3000/account"]
];

const browser = await chromium.launch({ headless: true });

for (const [captureId, url] of captures) {
  const endpoint = `https://mcp.figma.com/mcp/capture/${captureId}/submit`;
  console.error(`[capture] ${url}`);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  const captureScript = await (
    await page.request.get("https://mcp.figma.com/mcp/html-to-design/capture.js")
  ).text();
  await page.evaluate((script) => {
    const el = document.createElement("script");
    el.textContent = script;
    document.head.appendChild(el);
  }, captureScript);
  await page.waitForTimeout(3000);
  const result = await page.evaluate(
    async ({ captureId, endpoint }) =>
      window.figma.captureForDesign({ captureId, endpoint, selector: "body" }),
    { captureId, endpoint }
  );
  console.log(JSON.stringify({ url, result }));
  await page.close();
}

await browser.close();
console.error("[capture] all done");
