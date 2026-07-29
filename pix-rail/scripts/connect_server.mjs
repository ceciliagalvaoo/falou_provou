// Tiny local server for the one-time "connect your bank" step - see
// pix-rail-agent.md's own note: Open Finance consent must happen on a
// surface the user can see and trust, not silently inside a chat bot, so
// this is a deliberate one-time browser step, not a workaround.
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createConnectToken, getItem, listAccounts, listTransactions } from "./pluggy_client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.argv[2] ? Number(process.argv[2]) : 8791;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", ...CORS });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  if (url.pathname === "/" && req.method === "GET") {
    const html = fs.readFileSync(path.join(__dirname, "..", "connect-page", "index.html"), "utf8");
    res.writeHead(200, { "Content-Type": "text/html", ...CORS });
    res.end(html);
    return;
  }

  if (url.pathname === "/connect-token" && req.method === "GET") {
    try {
      const token = await createConnectToken();
      sendJson(res, 200, { accessToken: token });
    } catch (err) {
      sendJson(res, 500, { error: String(err.message || err) });
    }
    return;
  }

  // Diagnostic endpoints, used once during setup to confirm real
  // endpoint/response shapes before building the verification SOP on top -
  // not part of the product's normal runtime path.
  if (url.pathname === "/debug/item" && req.method === "GET") {
    try {
      const itemId = url.searchParams.get("itemId");
      sendJson(res, 200, await getItem(itemId));
    } catch (err) {
      sendJson(res, 500, { error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === "/debug/accounts" && req.method === "GET") {
    try {
      const itemId = url.searchParams.get("itemId");
      sendJson(res, 200, await listAccounts(itemId));
    } catch (err) {
      sendJson(res, 500, { error: String(err.message || err) });
    }
    return;
  }

  if (url.pathname === "/debug/transactions" && req.method === "GET") {
    try {
      const accountId = url.searchParams.get("accountId");
      sendJson(res, 200, await listTransactions(accountId));
    } catch (err) {
      sendJson(res, 500, { error: String(err.message || err) });
    }
    return;
  }

  sendJson(res, 404, { error: "not found" });
});

server.listen(PORT, () => console.log(`Pix-rail connect server listening on http://localhost:${PORT}`));
