import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 5173);
const ROOT = process.cwd();
const PUBLIC_DIR = resolve(ROOT, "public");
const LESSONS_DIR = resolve(ROOT, "lessons");

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

async function loadLessons() {
  const files = (await readdir(LESSONS_DIR)).filter(
    (file) => /^\d{3}-.+\.json$/.test(file)
  );
  const lessons = await Promise.all(
    files.map(async (file) => {
      const raw = await readFile(join(LESSONS_DIR, file), "utf8");
      return JSON.parse(raw);
    })
  );

  return lessons.sort((a, b) => a.id - b.id);
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const path = normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(PUBLIC_DIR, `.${path}`);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    send(res, 403, "Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    send(res, 200, body, types[extname(filePath)] || "application/octet-stream");
  } catch {
    send(res, 404, "Not found");
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.url?.startsWith("/api/lessons")) {
      const lessons = await loadLessons();
      send(res, 200, JSON.stringify({ lessons }), "application/json; charset=utf-8");
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    send(res, 500, JSON.stringify({ error: error.message }), "application/json; charset=utf-8");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Chinese tutorial app running at http://${HOST}:${PORT}`);
});
