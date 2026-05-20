import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initSocketServer } from "./lib/socket-server";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  initSocketServer(httpServer);

  // Always bind 0.0.0.0 — Render sets HOSTNAME to an internal name that breaks listen()
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`> ReverseIt ready on port ${port}`);
  });
});
