"use strict";

module.exports = function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end(JSON.stringify({error:"Método no permitido."}));
  }
  const storage = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : process.env.APPOINTMENTS_WEBHOOK_URL ? "webhook" : "not_configured";
  res.status(200).end(JSON.stringify({ok:true, storage}));
};
