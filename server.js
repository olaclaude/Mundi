"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = __dirname;
const STATIC_ROOT = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const JSONL_FILE = path.join(DATA_DIR, "appointments.jsonl");
const CSV_FILE = path.join(DATA_DIR, "appointments.csv");
const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";
const MAX_BODY = 32 * 1024;

const allowedServices = new Set(["extranjeria", "vehiculos", "fiscal", "laboral", "certificados", "administrativos", "otro"]);
const allowedProfiles = new Set(["Particular", "Autónomo/a", "Empresa"]);
const allowedContact = new Set(["Teléfono", "WhatsApp", "Email"]);
const allowedTimeframes = new Set(["Lo antes posible", "Esta semana", "La próxima semana", "Solo quiero información"]);
const allowedSlots = new Set(["Mañana · 9:30–13:00", "Tarde · 15:30–19:00", "Sin preferencia"]);

const mime = {
  ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8",
  ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8",
  ".svg":"image/svg+xml", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg",
  ".woff2":"font/woff2", ".md":"text/plain; charset=utf-8", ".txt":"text/plain; charset=utf-8"
};

const attempts = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter(time => now - time < 10 * 60 * 1000);
  if (recent.length >= 12) return true;
  recent.push(now);
  attempts.set(ip, recent);
  return false;
}

function securityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors *");
}

function sendJSON(res, status, body) {
  securityHeaders(res);
  res.writeHead(status, {"Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store"});
  res.end(JSON.stringify(body));
}

function text(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validate(payload) {
  const data = {
    service:text(payload.service, 40),
    serviceLabel:text(payload.serviceLabel, 100),
    profile:text(payload.profile, 30),
    details:text(payload.details, 500),
    name:text(payload.name, 80),
    phone:text(payload.phone, 20),
    email:text(payload.email, 120),
    contactPreference:text(payload.contactPreference, 20),
    timeframe:text(payload.timeframe, 50),
    slot:text(payload.slot, 50)
  };
  if (!allowedServices.has(data.service)) return {error:"Selecciona un servicio válido."};
  if (!allowedProfiles.has(data.profile)) return {error:"Selecciona el tipo de cliente."};
  if (data.details.length < 8) return {error:"Añade una breve descripción de la consulta."};
  if (data.name.length < 2) return {error:"Indica un nombre válido."};
  const digits = data.phone.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return {error:"Indica un teléfono válido."};
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return {error:"Indica un email válido."};
  if (!allowedContact.has(data.contactPreference)) return {error:"Indica una forma de contacto válida."};
  if (data.contactPreference === "Email" && !data.email) return {error:"Añade un email para recibir respuesta por esta vía."};
  if (!allowedTimeframes.has(data.timeframe) || !allowedSlots.has(data.slot)) return {error:"Indica una preferencia horaria válida."};
  if (payload.consent !== true) return {error:"Es necesario aceptar la política de privacidad."};
  data.serviceLabel = allowedServices.has(data.service) && data.serviceLabel ? data.serviceLabel : data.service;
  return {data};
}

function reference() {
  const now = new Date();
  const date = [String(now.getFullYear()).slice(-2), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 5);
  return `MG-${date}-${suffix}`;
}

function csvCell(value) {
  let output = String(value ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@]/.test(output)) output = `'${output}`;
  return `"${output.replace(/"/g, '""')}"`;
}

function saveAppointment(data) {
  fs.mkdirSync(DATA_DIR, {recursive:true});
  const record = {
    reference:reference(),
    createdAt:new Date().toISOString(),
    status:"pending",
    ...data
  };
  fs.appendFileSync(JSONL_FILE, `${JSON.stringify(record)}\n`, {encoding:"utf8", mode:0o600});
  if (!fs.existsSync(CSV_FILE)) {
    const header = ["Referencia", "Fecha", "Estado", "Servicio", "Tipo de cliente", "Consulta", "Nombre", "Teléfono", "Email", "Respuesta por", "Disponibilidad", "Franja"];
    fs.writeFileSync(CSV_FILE, `${header.map(csvCell).join(",")}\n`, {encoding:"utf8", mode:0o600});
  }
  const row = [record.reference, record.createdAt, record.status, record.serviceLabel, record.profile, record.details, record.name, record.phone, record.email, record.contactPreference, record.timeframe, record.slot];
  fs.appendFileSync(CSV_FILE, `${row.map(csvCell).join(",")}\n`, {encoding:"utf8", mode:0o600});
  return record;
}

function handleAppointment(req, res) {
  const ip = req.socket.remoteAddress || "unknown";
  if (rateLimited(ip)) return sendJSON(res, 429, {error:"Se han realizado demasiados intentos. Espera unos minutos o contacta por teléfono."});
  let body = "";
  req.setEncoding("utf8");
  req.on("data", chunk => {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_BODY) {
      sendJSON(res, 413, {error:"La solicitud es demasiado grande."});
      req.destroy();
    }
  });
  req.on("end", () => {
    if (res.writableEnded || req.destroyed) return;
    try {
      const payload = JSON.parse(body || "{}");
      const {data, error} = validate(payload);
      if (error) return sendJSON(res, 400, {error});
      const record = saveAppointment(data);
      sendJSON(res, 201, {ok:true, reference:record.reference, status:record.status});
    } catch (error) {
      if (error instanceof SyntaxError) return sendJSON(res, 400, {error:"El formato de la solicitud no es válido."});
      console.error("Appointment save error:", error);
      sendJSON(res, 500, {error:"No hemos podido registrar la solicitud. Inténtalo de nuevo o contacta por teléfono."});
    }
  });
  req.on("error", () => {
    if (!res.writableEnded) sendJSON(res, 400, {error:"No se ha podido leer la solicitud."});
  });
}

function serveStatic(req, res, pathname) {
  let relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  if (!relative || relative.includes("\0")) return sendJSON(res, 400, {error:"Ruta no válida."});
  const file = path.resolve(STATIC_ROOT, relative);
  if (!file.startsWith(`${STATIC_ROOT}${path.sep}`)) return sendJSON(res, 403, {error:"Acceso denegado."});
  const privateFile = relative.startsWith("data/") || relative.startsWith("api/") || ["server.js", "package.json", "package-lock.json", "vercel.json"].includes(relative);
  if (privateFile) return sendJSON(res, 404, {error:"No encontrado."});
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) return sendJSON(res, 404, {error:"No encontrado."});
    securityHeaders(res);
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      "Content-Type":mime[ext] || "application/octet-stream",
      "Content-Length":stat.size,
      "Cache-Control":ext === ".html" ? "no-cache" : "public, max-age=3600"
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, `http://${req.headers.host || "localhost"}`); }
  catch { return sendJSON(res, 400, {error:"URL no válida."}); }
  if (url.pathname === "/api/health" && req.method === "GET") return sendJSON(res, 200, {ok:true});
  if (url.pathname === "/api/appointments") {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return sendJSON(res, 405, {error:"Método no permitido."});
    }
    return handleAppointment(req, res);
  }
  if (!["GET", "HEAD"].includes(req.method)) return sendJSON(res, 405, {error:"Método no permitido."});
  try { serveStatic(req, res, url.pathname); }
  catch { sendJSON(res, 400, {error:"Ruta no válida."}); }
});

server.listen(PORT, HOST, () => {
  console.log(`MundiGest redesign running at http://${HOST}:${PORT}`);
});
