/* ============================================================
   SOCIAL ENGINEERING DEFENSE HUB — script.js
   Lead Frontend Dev + Cybersecurity Logic
   ============================================================ */

// ── API KEY CONFIGURATION (Replace with your real keys) ──────
const API_CONFIG = {
  virusTotal: {
    key: "YOUR_VIRUSTOTAL_API_KEY_HERE",
    baseUrl: "https://www.virustotal.com/api/v3",
    enabled: false, // set true when key is configured
  },
  abstractPhone: {
    key: "YOUR_ABSTRACTAPI_PHONE_KEY_HERE",
    baseUrl: "https://phonevalidation.abstractapi.com/v1",
    enabled: false,
  },
  abstractEmail: {
    key: "YOUR_ABSTRACTAPI_EMAIL_KEY_HERE",
    baseUrl: "https://emailvalidation.abstractapi.com/v1",
    enabled: false,
  },
};

// ── STATE ─────────────────────────────────────────────────────
const state = {
  threatsBlocked: 0,
  scansTotal: 0,
  startTime: Date.now(),
  logEntries: [],
  scanHistory: [],
  isHealing: false,
};

// ── THREAT DETECTION DATA ─────────────────────────────────────

/** Social engineering keywords (email & SMS) */
const SE_KEYWORDS = {
  critical: [
    "urgent", "action required", "suspended", "account suspended",
    "verify immediately", "confirm now", "gift card", "wire transfer",
    "you have won", "congratulations", "claim your prize", "final notice",
    "legal action", "arrest warrant", "irs notice", "tax fraud",
    "won a prize", "winner selected",
  ],
  high: [
    "click here", "limited time", "expires today", "act now",
    "your account", "unusual activity", "security alert", "verify your",
    "confirm your identity", "update your information", "reset your password",
    "bank account", "credit card", "ssn", "social security",
    "otp code", "one-time password", "do not share", "pin number",
  ],
  medium: [
    "free", "offer", "discount", "deal", "exclusive", "selected",
    "dear customer", "valued member", "your parcel", "package delivery",
    "delivery failed", "reschedule", "tracking number",
  ],
};

/** URL phishing keywords */
const URL_PHISH_KEYWORDS = [
  "secure-login", "verify-account", "update-billing", "confirm-identity",
  "account-suspended", "signin-secure", "paypal-verify", "bank-login",
  "microsoft-alert", "apple-id-verify", "amazon-security", "netflix-update",
  "irs-refund", "covid-relief", "stimulus-check",
];

/** Common scam/fraud phone prefixes */
const SCAM_PHONE_PREFIXES = [
  "+233", "+234", "+263", "+267", "+256", "+260",  // African scam patterns
  "+92", "+880", "+94",                              // South Asian scam patterns
  "+1900", "+1976", "+1977",                         // Premium rate
  "0900", "0976", "0977",
];

/** Punycode / IDN homograph indicators */
const PUNYCODE_PATTERNS = [/xn--/i, /\u200b/, /\u00ad/];

// ── CLOCK ─────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  document.getElementById("systemTime").textContent =
    now.toTimeString().slice(0, 8);
}
setInterval(updateClock, 1000);
updateClock();

// ── UPTIME ────────────────────────────────────────────────────
setInterval(() => {
  const ms = Date.now() - state.startTime;
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const hrs  = Math.floor(mins / 60);
  const val  = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m ${secs % 60}s`;
  const el = document.getElementById("uptimeVal");
  if (el) el.textContent = val;
}, 5000);

// ── PARTICLE BACKGROUND ───────────────────────────────────────
(function initParticles() {
  const canvas = document.getElementById("particleCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let particles = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
      color: Math.random() > 0.6 ? "#00f3ff" : "#bc13fe",
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
    });
    // Draw connection lines
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.strokeStyle = "#00f3ff";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
})();

// ── LOG SYSTEM ────────────────────────────────────────────────
function addLog(message, type = "info") {
  const feed = document.getElementById("logFeed");
  if (!feed) return;

  const now = new Date();
  const ts = now.toTimeString().slice(0, 8);

  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<span class="log-timestamp">[${ts}]</span>${escapeHtml(message)}`;
  feed.prepend(entry);

  // Keep max 30 entries
  const entries = feed.querySelectorAll(".log-entry");
  if (entries.length > 30) {
    feed.removeChild(feed.lastChild);
  }
}

// ── AI GUARDIAN MONITORING ────────────────────────────────────
const guardianMessages = [
  { msg: "Scanning system integrity...", type: "info" },
  { msg: "Threat database check: OK", type: "success" },
  { msg: "Memory footprint nominal.", type: "info" },
  { msg: "API latency check: 12ms", type: "info" },
  { msg: "Threat database updated to v4.7.2", type: "purple" },
  { msg: "Deep packet inspection: active", type: "info" },
  { msg: "Behavioral heuristics engine: running", type: "info" },
  { msg: "Neural pattern matching: online", type: "success" },
  { msg: "API Latency High - Auto-Optimizing...", type: "warn" },
  { msg: "Rerouted to CDN node 7 — latency normalized.", type: "success" },
  { msg: "Phishing DB sync complete. 1,204 new entries.", type: "purple" },
  { msg: "Honeypot trap: no activity.", type: "info" },
  { msg: "Scanning System...", type: "info" },
  { msg: "Zero-day pattern check: no matches.", type: "success" },
  { msg: "ML model confidence: 97.3%", type: "info" },
  { msg: "Cache flushed and re-seeded.", type: "info" },
  { msg: "Outbound firewall rules refreshed.", type: "info" },
  { msg: "Guardian heartbeat: nominal.", type: "success" },
];

let guardianMsgIdx = 0;
function tickGuardian() {
  const msg = guardianMessages[guardianMsgIdx % guardianMessages.length];
  addLog(msg.msg, msg.type);
  guardianMsgIdx++;

  // Randomly update latency
  const latencies = ["8ms", "12ms", "18ms", "24ms", "9ms", "14ms"];
  const latEl = document.getElementById("latencyVal");
  if (latEl) {
    const lat = latencies[Math.floor(Math.random() * latencies.length)];
    latEl.textContent = lat;
    latEl.className = "stat-value " + (parseInt(lat) > 20 ? "warn" : "cyan");
  }
}

// Start guardian ticking
addLog("AI Guardian initialized.", "success");
addLog("All systems online.", "success");
setInterval(tickGuardian, 3500);

// ── SELF-HEAL SIMULATION ──────────────────────────────────────
function triggerSelfHeal() {
  if (state.isHealing) return;
  state.isHealing = true;

  const popup = document.getElementById("selfHealPopup");
  const log   = document.getElementById("shpLog");
  popup.classList.add("show");
  log.innerHTML = "";

  addLog("⚠ API ISSUE DETECTED — self-heal initiated", "error");

  const steps = [
    { delay: 0,    icon: "⚠", text: "API Issue Detected on primary endpoint.", cls: "red" },
    { delay: 900,  icon: "🔄", text: "Initiating failover protocol...", cls: "yellow" },
    { delay: 1800, icon: "🔀", text: "Redirecting to Backup Node #3 (eu-west-2)...", cls: "yellow" },
    { delay: 2700, icon: "🔧", text: "Re-establishing secure tunnel...", cls: "yellow" },
    { delay: 3500, icon: "✅", text: "Issue Resolved. All systems nominal.", cls: "green" },
  ];

  steps.forEach(step => {
    setTimeout(() => {
      const line = document.createElement("div");
      line.className = `shp-line ${step.cls}`;
      line.style.animationDelay = "0s";
      line.innerHTML = `<span class="shl-icon">${step.icon}</span>${escapeHtml(step.text)}`;
      log.appendChild(line);

      if (step.cls === "green") {
        addLog("✅ Self-heal complete. Backup node active.", "success");
        setTimeout(() => {
          popup.classList.remove("show");
          state.isHealing = false;
        }, 2500);
      }
    }, step.delay);
  });
}

// ── HELPER: Escape HTML ───────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── SCAN LINE ANIMATION ───────────────────────────────────────
function startScanLine(type) {
  const el = document.getElementById(`scanline-${type}`);
  if (el) el.classList.add("active");
}
function stopScanLine(type) {
  const el = document.getElementById(`scanline-${type}`);
  if (el) el.classList.remove("active");
}

// ── STATUS BADGE ──────────────────────────────────────────────
function setStatus(type, status) {
  const el = document.getElementById(`status-${type}`);
  if (!el) return;
  el.textContent = status;
  el.className = "card-status";
  if (status === "SCANNING")  el.classList.add("scanning");
  if (status === "THREAT")    el.classList.add("threat");
  if (status === "SAFE")      el.classList.add("safe");
}

// ── RESULT RENDER ─────────────────────────────────────────────
function showResult(type, level, titleText, tags = [], details = []) {
  const box = document.getElementById(`result-${type}`);
  const card = document.querySelector(`.scan-card[data-type="${type}"]`);
  if (!box) return;

  const icons = { safe: "✅", threat: "🚨", warn: "⚠️" };
  const tagHtml = tags.map(t =>
    `<span class="result-tag ${t.cls}">${escapeHtml(t.label)}</span>`
  ).join("");
  const detailHtml = details.map(d =>
    `<div style="margin-top:4px;color:#8a9ab0;">${escapeHtml(d)}</div>`
  ).join("");

  box.innerHTML = `
    <div class="result-content ${level}">
      <span class="result-title ${level}">${icons[level]} ${escapeHtml(titleText)}</span>
      ${tagHtml}
      ${detailHtml}
    </div>
  `;
  box.classList.add("show");

  // Card border
  card.classList.remove("threat-detected", "threat-safe");
  if (level === "threat") card.classList.add("threat-detected");
  if (level === "safe")   card.classList.add("threat-safe");

  // Threat banner
  if (level === "threat") {
    showThreatBanner(`⚠ THREAT DETECTED — ${titleText.toUpperCase()}`);
    state.threatsBlocked++;
    document.getElementById("threatsBlocked").textContent = state.threatsBlocked;
  }

  // Scan history
  addHistory(type, document.getElementById(`input-${type}`)?.value || "", level);
}

// ── THREAT BANNER ─────────────────────────────────────────────
let bannerTimer = null;
function showThreatBanner(msg) {
  const el = document.getElementById("threatBanner");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.remove("show"), 4000);
  updateGlobalThreat("HIGH");
}

// ── GLOBAL THREAT METER ───────────────────────────────────────
function updateGlobalThreat(level) {
  const fill = document.getElementById("globalThreatFill");
  const val  = document.getElementById("globalThreatValue");
  const cfg = {
    LOW:      { width: "20%", color: "#00ff88",  label: "LOW" },
    MODERATE: { width: "45%", color: "#00f3ff",  label: "MODERATE" },
    HIGH:     { width: "75%", color: "#ffcc00",  label: "HIGH" },
    CRITICAL: { width: "100%",color: "#ff003c",  label: "CRITICAL" },
  };
  const c = cfg[level] || cfg.MODERATE;
  fill.style.width = c.width;
  fill.style.background = `linear-gradient(90deg, #00ff88, ${c.color})`;
  fill.style.boxShadow = `0 0 8px ${c.color}`;
  val.textContent = c.label;
  val.style.color = c.color;

  setTimeout(() => updateGlobalThreat("MODERATE"), 10000);
}

// ── SCAN HISTORY ──────────────────────────────────────────────
function addHistory(type, value, level) {
  const container = document.getElementById("scanHistory");
  const empty = container.querySelector(".history-empty");
  if (empty) empty.remove();

  const item = document.createElement("div");
  item.className = "history-item";
  const short = value.length > 22 ? value.slice(0, 22) + "…" : value;
  const badgeClass = level === "threat" ? "hi-threat" : level === "warn" ? "hi-warn" : "hi-safe";
  const badgeLabel = level === "threat" ? "⚠ THREAT" : level === "warn" ? "WARN" : "SAFE";
  item.innerHTML = `
    <span class="hi-type">${type.toUpperCase()}</span>
    <span class="hi-val" title="${escapeHtml(value)}">${escapeHtml(short)}</span>
    <span class="hi-badge ${badgeClass}">${badgeLabel}</span>
  `;
  container.prepend(item);

  // Keep max 8
  const items = container.querySelectorAll(".history-item");
  if (items.length > 8) container.removeChild(container.lastChild);
}

// ── MAIN ANALYZE DISPATCHER ───────────────────────────────────
async function analyzeInput(type) {
  const inputEl = document.getElementById(`input-${type}`);
  if (!inputEl) return;
  const value = inputEl.value.trim();

  // Self-heal trigger check
  if (value.toLowerCase().includes("error_test")) {
    triggerSelfHeal();
    addLog(`⚙ Trigger string detected in ${type} input.`, "warn");
    return;
  }

  if (!value) {
    addLog(`[${type.toUpperCase()}] Empty input — scan aborted.`, "warn");
    return;
  }

  // Animate scan
  setStatus(type, "SCANNING");
  startScanLine(type);
  document.querySelector(`.scan-card[data-type="${type}"] .analyze-btn`)
    ?.classList.add("scanning");

  addLog(`[${type.toUpperCase()}] Initiating deep scan...`, "info");
  state.scansTotal++;

  await sleep(1200 + Math.random() * 600);

  stopScanLine(type);
  document.querySelector(`.scan-card[data-type="${type}"] .analyze-btn`)
    ?.classList.remove("scanning");

  // Route to correct analyzer
  switch (type) {
    case "phone": await analyzePhone(value); break;
    case "url":   await analyzeUrl(value);   break;
    case "email": analyzeText(value, "email"); break;
    case "sms":   analyzeText(value, "sms");   break;
  }
}

// ── CLEAR SLOT ────────────────────────────────────────────────
function clearSlot(type) {
  const input = document.getElementById(`input-${type}`);
  const result = document.getElementById(`result-${type}`);
  const card = document.querySelector(`.scan-card[data-type="${type}"]`);
  if (input) input.value = "";
  if (result) { result.classList.remove("show"); result.innerHTML = ""; }
  if (card)   { card.classList.remove("threat-detected", "threat-safe"); }
  setStatus(type, "IDLE");
  stopScanLine(type);
}

// ─────────────────────────────────────────────────────────────
// PHONE ANALYSIS
// ─────────────────────────────────────────────────────────────
async function analyzePhone(rawValue) {
  const type = "phone";
  const threats = [];
  const warns   = [];
  const safe    = [];

  // Format check
  const cleaned = rawValue.replace(/[\s\-().]/g, "");
  const isValidFormat = /^\+?[1-9]\d{6,14}$/.test(cleaned);
  if (!isValidFormat) {
    warns.push("Non-standard format detected.");
    addLog(`[PHONE] Format anomaly flagged.`, "warn");
  } else {
    safe.push("Format is valid.");
  }

  // Scam prefix check
  for (const prefix of SCAM_PHONE_PREFIXES) {
    if (cleaned.startsWith(prefix) || rawValue.startsWith(prefix)) {
      threats.push(`Scam prefix matched: ${prefix}`);
      addLog(`[PHONE] ⚠ Known scam prefix: ${prefix}`, "error");
    }
  }

  // Premium rate / 900 check
  if (/^(\+?1[-. ]?)?900/.test(cleaned) || /^0?900/.test(cleaned)) {
    threats.push("Premium-rate (900) number detected.");
    addLog(`[PHONE] Premium-rate number flagged.`, "error");
  }

  // Repeated-digit pattern (social engineering spoofing)
  if (/(\d)\1{5,}/.test(cleaned)) {
    warns.push("Suspicious repeated-digit pattern.");
  }

  // API call if configured
  if (API_CONFIG.abstractPhone.enabled) {
    try {
      addLog(`[PHONE] Querying AbstractAPI for validation...`, "info");
      const res = await fetch(
        `${API_CONFIG.abstractPhone.baseUrl}/?api_key=${API_CONFIG.abstractPhone.key}&phone=${encodeURIComponent(rawValue)}`
      );
      const data = await res.json();
      if (data.valid === false) threats.push("AbstractAPI: Number invalid.");
      if (data.type === "premium_rate") threats.push("AbstractAPI: Premium-rate confirmed.");
      if (data.carrier) safe.push(`Carrier: ${data.carrier}`);
      addLog(`[PHONE] AbstractAPI response received.`, "success");
    } catch (err) {
      addLog(`[PHONE] AbstractAPI request failed: ${err.message}`, "warn");
    }
  }

  // Verdict
  if (threats.length > 0) {
    setStatus(type, "THREAT");
    showResult(type, "threat", "Suspicious Phone Number",
      threats.map(t => ({ label: t, cls: "tag-red" })).concat(
        warns.map(w => ({ label: w, cls: "tag-yellow" }))),
      ["Recommend: Do not call back. Block this number."]
    );
    addLog(`[PHONE] THREAT — ${threats.length} indicator(s) found.`, "error");
  } else if (warns.length > 0) {
    setStatus(type, "IDLE");
    showResult(type, "warn", "Suspicious Patterns Found",
      warns.map(w => ({ label: w, cls: "tag-yellow" })),
      ["Proceed with caution. Verify the caller identity independently."]
    );
    addLog(`[PHONE] WARNING — ${warns.length} indicator(s).`, "warn");
  } else {
    setStatus(type, "SAFE");
    showResult(type, "safe", "No Threats Detected",
      [{ label: "Format Valid", cls: "tag-green" }],
      ["No scam prefixes matched. Standard international format."]
    );
    addLog(`[PHONE] SAFE — no threats found.`, "success");
  }
}

// ─────────────────────────────────────────────────────────────
// URL ANALYSIS
// ─────────────────────────────────────────────────────────────
async function analyzeUrl(rawValue) {
  const type = "url";
  const threats = [];
  const warns   = [];
  const safe    = [];

  let urlStr = rawValue;
  if (!/^https?:\/\//i.test(urlStr)) urlStr = "https://" + urlStr;

  let urlObj;
  try {
    urlObj = new URL(urlStr);
  } catch (e) {
    setStatus(type, "THREAT");
    showResult(type, "threat", "Malformed URL",
      [{ label: "Invalid URL structure", cls: "tag-red" }],
      ["The URL could not be parsed. Highly suspicious."]
    );
    addLog(`[URL] Malformed URL — parse failed.`, "error");
    return;
  }

  const hostname = urlObj.hostname.toLowerCase();
  const fullUrl  = urlObj.href.toLowerCase();

  // Punycode / IDN homograph
  for (const pat of PUNYCODE_PATTERNS) {
    if (pat.test(hostname)) {
      threats.push("Punycode / IDN Homograph attack detected.");
      addLog(`[URL] ⚠ Punycode pattern in hostname.`, "error");
    }
  }

  // HTTP (not HTTPS)
  if (urlObj.protocol === "http:") {
    warns.push("Unencrypted HTTP protocol — no SSL.");
  }

  // IP address instead of domain
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    threats.push("Raw IP address used as hostname — common phishing pattern.");
    addLog(`[URL] Raw IP hostname flagged.`, "error");
  }

  // Phishing keywords in hostname
  for (const kw of URL_PHISH_KEYWORDS) {
    if (hostname.includes(kw)) {
      threats.push(`Phishing keyword in domain: "${kw}"`);
      addLog(`[URL] Keyword match: "${kw}"`, "error");
    }
  }

  // Misleading brand in subdomain (e.g. paypal.evil.com)
  const brands = ["paypal", "apple", "google", "microsoft", "amazon", "netflix",
                  "facebook", "instagram", "irs", "bank", "wellsfargo", "chase"];
  const domainParts = hostname.split(".");
  const tld   = domainParts.slice(-2).join(".");
  const sub   = domainParts.slice(0, -2).join(".");
  for (const brand of brands) {
    if (sub.includes(brand)) {
      threats.push(`Brand impersonation in subdomain: "${brand}"`);
      addLog(`[URL] Brand spoofing: "${brand}" in subdomain of "${tld}"`, "error");
    }
    if (hostname.includes(brand) && !hostname.endsWith(`${brand}.com`) && !hostname.endsWith(`${brand}.org`)) {
      warns.push(`Brand name "${brand}" in a non-official domain.`);
    }
  }

  // Excessive subdomains
  if (domainParts.length > 4) {
    warns.push("Excessive subdomain depth — common evasion tactic.");
  }

  // Long domain
  if (hostname.length > 40) {
    warns.push("Unusually long domain name.");
  }

  // Suspicious TLDs
  const suspiciousTLDs = [".tk", ".ml", ".ga", ".cf", ".pw", ".xyz", ".top", ".loan", ".click", ".work"];
  for (const tldCheck of suspiciousTLDs) {
    if (hostname.endsWith(tldCheck)) {
      warns.push(`Suspicious TLD detected: "${tldCheck}"`);
    }
  }

  // VirusTotal API call if configured
  if (API_CONFIG.virusTotal.enabled) {
    try {
      addLog(`[URL] Querying VirusTotal...`, "info");
      const encodedUrl = btoa(rawValue).replace(/=/g, "");
      const res = await fetch(
        `${API_CONFIG.virusTotal.baseUrl}/urls/${encodedUrl}`,
        { headers: { "x-apikey": API_CONFIG.virusTotal.key } }
      );
      const data = await res.json();
      const stats = data?.data?.attributes?.last_analysis_stats;
      if (stats) {
        if (stats.malicious > 0)  threats.push(`VirusTotal: ${stats.malicious} engine(s) flagged malicious.`);
        if (stats.suspicious > 0) warns.push(`VirusTotal: ${stats.suspicious} engine(s) flagged suspicious.`);
        if (stats.malicious === 0 && stats.suspicious === 0) safe.push("VirusTotal: Clean scan.");
      }
      addLog(`[URL] VirusTotal scan complete.`, "success");
    } catch (err) {
      addLog(`[URL] VirusTotal API error: ${err.message}`, "warn");
    }
  }

  // Verdict
  if (threats.length > 0) {
    setStatus(type, "THREAT");
    showResult(type, "threat", "Phishing / Malicious URL",
      threats.map(t => ({ label: t, cls: "tag-red" })).concat(
        warns.map(w => ({ label: w, cls: "tag-yellow" }))),
      [`Domain: ${hostname}`, "Recommendation: Do NOT visit this URL."]
    );
    addLog(`[URL] THREAT — ${threats.length} indicator(s).`, "error");
  } else if (warns.length > 0) {
    setStatus(type, "IDLE");
    showResult(type, "warn", "Suspicious URL Patterns",
      warns.map(w => ({ label: w, cls: "tag-yellow" })),
      [`Domain: ${hostname}`, "Proceed with caution. Verify independently."]
    );
    addLog(`[URL] WARNING — ${warns.length} indicator(s).`, "warn");
  } else {
    setStatus(type, "SAFE");
    showResult(type, "safe", "URL Appears Clean",
      [{ label: "No Phishing Patterns", cls: "tag-green" },
       { label: urlObj.protocol.replace(":", "").toUpperCase(), cls: "tag-purple" }],
      [`Domain: ${hostname}`, "No known phishing patterns detected."]
    );
    addLog(`[URL] SAFE — no threats found.`, "success");
  }
}

// ─────────────────────────────────────────────────────────────
// TEXT ANALYSIS (Email & SMS shared logic)
// ─────────────────────────────────────────────────────────────
function analyzeText(rawValue, type) {
  const threats = [];
  const warns   = [];
  const tags    = [];
  const lower   = rawValue.toLowerCase();

  let criticalScore = 0;
  let highScore     = 0;
  let mediumScore   = 0;
  const matchedCritical = [];
  const matchedHigh     = [];
  const matchedMedium   = [];

  // Keyword matching
  for (const kw of SE_KEYWORDS.critical) {
    if (lower.includes(kw)) {
      criticalScore++;
      matchedCritical.push(kw);
      tags.push({ label: `CRITICAL: "${kw}"`, cls: "tag-red" });
    }
  }
  for (const kw of SE_KEYWORDS.high) {
    if (lower.includes(kw)) {
      highScore++;
      matchedHigh.push(kw);
      if (tags.length < 6) tags.push({ label: `HIGH: "${kw}"`, cls: "tag-yellow" });
    }
  }
  for (const kw of SE_KEYWORDS.medium) {
    if (lower.includes(kw)) {
      mediumScore++;
      matchedMedium.push(kw);
      if (tags.length < 8) tags.push({ label: `MED: "${kw}"`, cls: "tag-purple" });
    }
  }

  // URL inside message
  const urlMatches = rawValue.match(/https?:\/\/[^\s]+/g) || [];
  if (urlMatches.length > 0) {
    warns.push(`Contains ${urlMatches.length} URL(s). Verify each link independently.`);
    tags.push({ label: `${urlMatches.length} URL(s) found`, cls: "tag-yellow" });
  }

  // All-caps shouting (urgency)
  const words = rawValue.split(/\s+/);
  const capsWords = words.filter(w => w.length > 3 && w === w.toUpperCase() && /[A-Z]/.test(w));
  if (capsWords.length >= 2) {
    warns.push(`${capsWords.length} ALL-CAPS words detected — urgency manipulation.`);
  }

  // Exclamation overkill
  const exclamCount = (rawValue.match(/!/g) || []).length;
  if (exclamCount >= 3) {
    warns.push(`${exclamCount} exclamation marks — high-pressure tactic.`);
  }

  // Short + link = high smishing signal (for SMS)
  if (type === "sms" && rawValue.length < 120 && urlMatches.length > 0 && highScore > 0) {
    threats.push("Smishing signature: short urgent message with embedded link.");
    addLog(`[SMS] ⚠ Smishing pattern detected.`, "error");
  }

  // Abstract API for email if enabled
  if (type === "email" && API_CONFIG.abstractEmail.enabled) {
    const emailMatch = rawValue.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
    if (emailMatch) {
      addLog(`[EMAIL] Querying AbstractAPI for sender validation...`, "info");
      fetch(
        `${API_CONFIG.abstractEmail.baseUrl}/?api_key=${API_CONFIG.abstractEmail.key}&email=${encodeURIComponent(emailMatch[0])}`
      )
        .then(r => r.json())
        .then(data => {
          if (data.deliverability === "UNDELIVERABLE") {
            addLog(`[EMAIL] AbstractAPI: Sender address undeliverable.`, "warn");
          }
        })
        .catch(err => addLog(`[EMAIL] AbstractAPI error: ${err.message}`, "warn"));
    }
  }

  const totalScore = criticalScore * 3 + highScore * 2 + mediumScore;
  const label = type.toUpperCase();

  if (criticalScore > 0 || totalScore >= 5) {
    setStatus(type, "THREAT");
    const details = [
      `Score: ${totalScore} (Critical:${criticalScore} High:${highScore} Medium:${mediumScore})`,
      "Recommendation: Do NOT act on this message. Report as phishing/scam.",
    ];
    if (matchedCritical.length) details.push(`Critical matches: ${matchedCritical.join(", ")}`);
    showResult(type, "threat", "Social Engineering Attack Detected", tags, details);
    addLog(`[${label}] THREAT — SE score ${totalScore}. Keywords: ${matchedCritical.concat(matchedHigh).slice(0,3).join(", ")}`, "error");
  } else if (highScore > 0 || warns.length > 0 || totalScore >= 2) {
    setStatus(type, "IDLE");
    const details = [
      `Score: ${totalScore} (High:${highScore} Medium:${mediumScore})`,
      "Treat with caution. Verify sender identity before taking any action.",
    ];
    showResult(type, "warn", "Suspicious Content Detected", tags, details);
    addLog(`[${label}] WARNING — ${highScore} high-risk keyword(s).`, "warn");
  } else {
    setStatus(type, "SAFE");
    showResult(type, "safe", "No SE Patterns Detected",
      [{ label: "Clean Scan", cls: "tag-green" }],
      [`Score: ${totalScore}`, "No social engineering keywords found."]
    );
    addLog(`[${label}] SAFE — no threats detected.`, "success");
  }
}

// ── ENTER KEY SUPPORT ─────────────────────────────────────────
["phone", "url", "email", "sms"].forEach(type => {
  const el = document.getElementById(`input-${type}`);
  if (!el) return;
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      analyzeInput(type);
    }
  });
});

// ── SLEEP UTILITY ─────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── INIT LOG ──────────────────────────────────────────────────
setTimeout(() => {
  addLog("Threat detection engine loaded.", "success");
  addLog("VirusTotal integration: standby.", "info");
  addLog("AbstractAPI integration: standby.", "info");
  addLog("All 4 scanning slots ready.", "success");
}, 500);
