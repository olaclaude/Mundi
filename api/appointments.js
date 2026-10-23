"use strict";

const crypto = require("node:crypto");

const serviceLabels = {
  extranjeria:"Extranjería y nacionalidad", vehiculos:"Vehículos · DGT",
  fiscal:"Gestión fiscal", laboral:"Laboral y contable",
  certificados:"Certificados digitales", administrativos:"Otros trámites administrativos",
  otro:"Otro trámite / No lo tengo claro"
};
const allowedProfiles = new Set(["Particular", "Autónomo/a", "Empresa"]);
const allowedContact = new Set(["Teléfono", "WhatsApp", "Email"]);
const allowedTimeframes = new Set(["Lo antes posible", "Esta semana", "La próxima semana", "Solo quiero información"]);
const allowedSlots = new Set(["Mañana · 9:30–13:00", "Tarde · 15:30–19:00", "Sin preferencia"]);

function text(value, max) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function responseHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
}
function send(res, status, body) { responseHeaders(res); res.status(status).end(JSON.stringify(body)); }
function reference() {
  const now = new Date();
  const date = [String(now.getFullYear()).slice(-2), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("");
  return `MG-${date}-${crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 5)}`;
}
function validate(payload) {
  const data = {
    service:text(payload.service, 40), profile:text(payload.profile, 30), details:text(payload.details, 500),
    name:text(payload.name, 80), phone:text(payload.phone, 20), email:text(payload.email, 120),
    contactPreference:text(payload.contactPreference, 20), timeframe:text(payload.timeframe, 50), slot:text(payload.slot, 50)
  };
  if (!Object.hasOwn(serviceLabels, data.service)) return {error:"Selecciona un servicio válido."};
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
  return {data};
}
async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32768) throw Object.assign(new Error("Body too large"), {statusCode:413});
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
function databaseRecord(record) {
  return {
    reference:record.reference, created_at:record.createdAt, status:record.status,
    service:record.service, service_label:record.serviceLabel, profile:record.profile,
    details:record.details, name:record.name, phone:record.phone, email:record.email,
    contact_preference:record.contactPreference, timeframe:record.timeframe, slot:record.slot,
    consent_at:record.consentAt, consent_policy:record.consentPolicy
  };
}
async function persist(record) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const webhook = process.env.APPOINTMENTS_WEBHOOK_URL;
  if (supabaseUrl && supabaseKey) {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/appointments`, {
      method:"POST",
      headers:{apikey:supabaseKey, Authorization:`Bearer ${supabaseKey}`, "Content-Type":"application/json", Prefer:"return=minimal"},
      body:JSON.stringify(databaseRecord(record))
    });
    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
    return "supabase";
  }
  if (webhook) {
    const headers = {"Content-Type":"application/json"};
    if (process.env.APPOINTMENTS_WEBHOOK_SECRET) headers.Authorization = `Bearer ${process.env.APPOINTMENTS_WEBHOOK_SECRET}`;
    const response = await fetch(webhook, {method:"POST", headers, body:JSON.stringify(record)});
    if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
    return "webhook";
  }
  return null;
}

module.exports = async function handler(req, res) {
  responseHeaders(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, {error:"Método no permitido."});
  }
  try {
    const payload = await readBody(req);
    if (JSON.stringify(payload).length > 32768) return send(res, 413, {error:"La solicitud es demasiado grande."});
    const {data, error} = validate(payload);
    if (error) return send(res, 400, {error});
    const now = new Date().toISOString();
    const record = {
      reference:reference(), createdAt:now, status:"pending", ...data,
      serviceLabel:serviceLabels[data.service], consentAt:now, consentPolicy:"privacidad-2026-10-23"
    };
    const storage = await persist(record);
    if (!storage) return send(res, 503, {
      error:"La recepción online todavía no está configurada en esta demostración. Puedes enviar la solicitud completa por email.",
      code:"STORAGE_NOT_CONFIGURED", emailFallback:true
    });
    return send(res, 201, {ok:true, reference:record.reference, status:record.status});
  } catch (error) {
    if (error instanceof SyntaxError) return send(res, 400, {error:"El formato de la solicitud no es válido."});
    if (error.statusCode === 413) return send(res, 413, {error:"La solicitud es demasiado grande."});
    console.error("Appointment persistence error:", error.message);
    return send(res, 502, {error:"No hemos podido registrar la solicitud. Inténtalo de nuevo o utiliza la alternativa por email.", emailFallback:true});
  }
};
