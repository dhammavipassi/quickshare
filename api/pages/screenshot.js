// Serverless function: HTML → PNG screenshot
// Auth: x-api-key must equal process.env.API_TOKEN

const { screenshotHTML } = require("../../utils/screenshot");

module.exports = async (req, res) => {
  try {
    // Auth check
    const apiKey = req.headers["x-api-key"] || req.headers["X-API-KEY"];
    const token = process.env.API_TOKEN || "";
    if (token && (!apiKey || apiKey !== token)) {
      res.status(401).json({ success: false, error: "unauthorized" });
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ success: false, error: "method not allowed" });
      return;
    }

    // Parse JSON body (Vercel may pass parsed object or raw string)
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (_) { body = {}; }
    }
    body = body || {};

    const html = body.html;
    if (!html || typeof html !== "string" || html.length < 8) {
      res.status(400).json({ success: false, error: "html required" });
      return;
    }

    const viewportWidth = Math.min(parseInt(body.viewportWidth) || 1024, 1920);
    const viewportHeight = Math.min(parseInt(body.viewportHeight) || 800, 2000);
    const scale = Math.min(Math.max(parseFloat(body.scale) || 1, 1), 2);
    const darkMode = !!body.darkMode;
    const waitUntil = body.waitUntil || "networkidle2";

    const buf = await screenshotHTML(html, { viewportWidth, viewportHeight, scale, darkMode, waitUntil });
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).end(buf);
  } catch (e) {
    console.error("[screenshot] error:", e);
    res.status(500).json({ success: false, error: "screenshot failed", detail: String(e?.message || e) });
  }
};

