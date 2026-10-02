$ErrorActionPreference = 'Stop'
$port = Get-Random -Minimum 5300 -Maximum 5900
$server = "http://127.0.0.1:$port/"
$vite = Start-Process -FilePath (Get-Command node).Source -ArgumentList @('node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', "$port", '--strictPort') -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -PassThru
try {
$ready = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) { try { Invoke-WebRequest -Uri $server -UseBasicParsing -TimeoutSec 1 | Out-Null; $ready = $true; break } catch { Start-Sleep -Milliseconds 300 } }
if (-not $ready) { throw 'The temporary Vite test server did not start.' }
$sessionOutput = (& npx -y playwriter@latest session new --browser headless | Out-String)
if ($LASTEXITCODE -ne 0 -or $sessionOutput -notmatch 'Session (\d+) created') { throw "Could not start playwriter: $sessionOutput" }
$sessionId = $Matches[1]
$script = @'
const assert = require("assert").strict;
state.page = await context.newPage();
await state.page.goto("__BASE_URL__", { waitUntil: "domcontentloaded" });
await state.page.evaluate(() => localStorage.removeItem("bear-and-burrow-save"));
await state.page.reload({ waitUntil: "domcontentloaded" });
await state.page.getByText("Welcome to Bear Hollow!").waitFor();
console.log("Fresh game:", await snapshot({ page: state.page, search: /Welcome to Bear Hollow|Foraging Basket/ }));
assert.equal(await state.page.getByRole("button", { name: "Foraging Basket, producer" }).count(), 1);
await state.page.locator("[data-testid=board-27]").click();
assert.equal(await state.page.getByRole("button", { name: /Wild Berries, tier 1/ }).count(), 1);
console.log("First production:", await snapshot({ page: state.page, search: /One more tap|Wild Berries/ }));
await state.page.locator("[data-testid=board-27]").click();
assert.equal(await state.page.getByRole("button", { name: /Wild Berries, tier 1/ }).count(), 2);
console.log("Second production:", await snapshot({ page: state.page, search: /Drag one|Wild Berries/ }));
const a = await state.page.locator("[data-testid=board-19]").boundingBox();
const b = await state.page.locator("[data-testid=board-26]").boundingBox();
await state.page.mouse.move(a.x+a.width/2, a.y+a.height/2);
await state.page.mouse.down();
await state.page.mouse.move(b.x+b.width/2, b.y+b.height/2, { steps: 12 });
await state.page.mouse.up();
assert.equal(await state.page.getByRole("button", { name: /Berry Bundle, tier 2/ }).count(), 1);
console.log("Merge:", await snapshot({ page: state.page, search: /Lovely|Berry Bundle/ }));
await state.page.getByRole("button", { name: "Deliver" }).click();
assert.equal(await state.page.locator(".coin-status strong").innerText(), "22");
console.log("Delivery:", await snapshot({ page: state.page, search: /Order delivered|22|coins/ }));
await state.page.locator(".order-card").first().waitFor();
await state.page.reload({ waitUntil: "domcontentloaded" });
assert.equal(await state.page.locator(".coin-status strong").innerText(), "22");
console.log("Reload:", await snapshot({ page: state.page, search: /Bear requests|22|coins/ }));
await state.page.locator("[data-testid=board-27]").click();
console.log("More gathering:", await snapshot({ page: state.page, search: /board slot 20|Foraging Basket/ }));
await state.page.locator("[data-testid=board-19]").click();
console.log("Item selected:", await snapshot({ page: state.page, search: /Store item|Sell/ }));
await state.page.getByRole("button", { name: "Store item" }).click();
assert.match(await state.page.locator("[data-testid=storage-0]").getAttribute("aria-label"), /tier/);
console.log("Storage:", await snapshot({ page: state.page, search: /storage slot 1|Tucked safely/ }));
await state.page.getByRole("button", { name: "Developer tools" }).click();
await state.page.getByRole("button", { name: "+500 coins" }).click();
await state.page.getByRole("button", { name: "Close debug" }).click();
await state.page.getByRole("button", { name: "Bear Hollow", exact: true }).click();
console.log("Bear Hollow:", await snapshot({ page: state.page, search: /Berry path|35 coins/ }));
await state.page.getByRole("button", { name: "35 coins" }).click();
assert.equal(await state.page.locator(".scene-cabin").count(), 1);
console.log("Upgrade:", await snapshot({ page: state.page, search: /Stage 1|Jam stall|cozier/ }));
await state.page.getByRole("button", { name: "Collection", exact: true }).click();
assert.equal(await state.page.getByRole("heading", { name: "Collection Book" }).isVisible(), true);
console.log("Collection:", await snapshot({ page: state.page, search: /Collection Book|Wild Berries|Berry Bundle/ }));
await state.page.getByRole("button", { name: "Board", exact: true }).click();
await state.page.setViewportSize({ width: 390, height: 844 });
assert.equal(await state.page.getByRole("grid", { name: "8 by 8 merge board" }).isVisible(), true);
console.log("Mobile:", await snapshot({ page: state.page, search: /Merge board|Storage/ }));
await state.page.setViewportSize({ width: 1440, height: 900 });
await state.page.getByRole("button", { name: "Open settings" }).click();
console.log("Reset controls:", await snapshot({ page: state.page, search: /Reset game|Settings/ }));
await state.page.getByRole("button", { name: "Reset game" }).click();
console.log("Reset confirmation:", await snapshot({ page: state.page, search: /Reset everything|Start a new Bear Hollow/ }));
await state.page.getByRole("button", { name: "Reset everything" }).click();
assert.equal(await state.page.locator(".coin-status strong").innerText(), "0");
console.log("Playwriter end-to-end flow passed.");
await state.page.close();
'@
$script = $script.Replace('__BASE_URL__', $server)
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($script))
$runner = 'const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor; await new AsyncFunction(Buffer.from(`' + $encoded + '`,`base64`).toString())()'
& npx -y playwriter@latest -s $sessionId --timeout 120000 -e $runner
if ($LASTEXITCODE -ne 0) { throw 'Playwriter end-to-end flow failed.' }
} finally { Stop-Process -Id $vite.Id -Force -ErrorAction SilentlyContinue }
