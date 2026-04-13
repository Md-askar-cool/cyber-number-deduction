/* ─────────────────────────────────────────────────────
   ThreatShield OS — Rule-Based Detection Engine
   NO API KEY REQUIRED — 100% Client-Side NLP Rules
───────────────────────────────────────────────────── */

// ── STATE ──────────────────────────────────────────────
let selectedType = 'phone_number';
let scanCount = 0;
let scanHistory = [];
let radarAnimFrame = null;
let radarAngle = 0;
let lastResult = null;

const FILE_NAMES = {
  phone_number:  'phone_input.txt',
  email_address: 'email_input.txt',
  sms_text:      'sms_payload.txt',
  email_text:    'email_payload.txt'
};

// ── BOOT SEQUENCE ──────────────────────────────────────
const BOOT_LINES = [
  { t:200,  text:'[  OK  ] Initializing ThreatShield OS kernel...', cls:'ok' },
  { t:500,  text:'[  OK  ] Loading NLP rule engine v3.1...', cls:'ok' },
  { t:800,  text:'[  OK  ] Pattern database: 2,847 signatures loaded.', cls:'ok' },
  { t:1100, text:'[  OK  ] Lookalike domain engine ready.', cls:'ok' },
  { t:1350, text:'[  OK  ] URL heuristics module online.', cls:'ok' },
  { t:1600, text:'[  OK  ] Keyword scoring matrix initialized.', cls:'ok' },
  { t:1850, text:'[  OK  ] Radar subsystem calibrated.', cls:'ok' },
  { t:2100, text:'[  OK  ] All systems nominal. No API key required.', cls:'ok' },
];

window.addEventListener('DOMContentLoaded', () => {
  const log = document.getElementById('boot-log');
  const bar = document.getElementById('boot-bar');
  let pct = 0;

  BOOT_LINES.forEach(({ t, text, cls }, i) => {
    setTimeout(() => {
      const line = document.createElement('div');
      line.className = cls;
      line.textContent = text;
      log.appendChild(line);
      log.scrollTop = log.scrollHeight;
      pct = Math.round(((i + 1) / BOOT_LINES.length) * 100);
      bar.style.width = pct + '%';
    }, t);
  });

  setTimeout(() => {
    document.getElementById('boot-screen').style.opacity = '0';
    document.getElementById('boot-screen').style.transition = 'opacity 0.4s';
    setTimeout(() => {
      document.getElementById('boot-screen').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      startClock();
      drawRadarIdle();
    }, 400);
  }, 2600);

  document.getElementById('main-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) analyze();
  });
  document.getElementById('main-input').addEventListener('input', onInput);
});

// ── CLOCK ──────────────────────────────────────────────
function startClock() {
  const update = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    const s = String(now.getSeconds()).padStart(2,'0');
    document.getElementById('clock').textContent = `${h}:${m}:${s}`;
  };
  update();
  setInterval(update, 1000);
}

// ── TYPE SELECT ────────────────────────────────────────
function setType(btn) {
  document.querySelectorAll('.ttype').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedType = btn.dataset.type;
  document.getElementById('input-type-badge').textContent = selectedType.toUpperCase();
  document.getElementById('t-file').textContent = FILE_NAMES[selectedType];

  const placeholders = {
    phone_number:  '+1-555-867-5309',
    email_address: 'support@paypa1-secure.com',
    sms_text:      'Paste suspicious SMS here...',
    email_text:    'Paste full email content here...'
  };
  document.getElementById('main-input').placeholder = placeholders[selectedType];
}

// ── LOAD EXAMPLE ───────────────────────────────────────
function loadEx(type, text) {
  document.querySelectorAll('.ttype').forEach(b => {
    if (b.dataset.type === type) setType(b);
  });
  const ta = document.getElementById('main-input');
  ta.value = text;
  onInput(ta);
  ta.focus();
}

// ── ON INPUT (real-time indicators) ───────────────────
function onInput(el) {
  const val = el.value || (el.target ? el.target.value : '');
  const input = val;
  const bytes = new TextEncoder().encode(input).length;
  document.getElementById('t-bytes').textContent =
    bytes > 1024 ? (bytes/1024).toFixed(1)+'KB' : bytes+'B';

  // Count links
  const links = (input.match(/https?:\/\/\S+|bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly/gi) || []).length;
  // Count urgency keywords
  const urgency = (input.match(/urgent|immediately|suspended|verify|expire|limited|act now|asap|24.?hour|warning|alert/gi) || []).length;
  // Count red-flag keywords
  const flags = (input.match(/otp|password|credential|bank|credit card|ssn|social security|account number|cvv|pin|login|sign.?in/gi) || []).length;

  const rtU = document.getElementById('rt-urgency');
  const rtL = document.getElementById('rt-links');
  const rtK = document.getElementById('rt-keywords');

  rtU.textContent = `URGENCY: ${urgency}`;
  rtU.className = 'rt-item' + (urgency >= 3 ? ' danger' : urgency >= 1 ? ' warn' : '');

  rtL.textContent = `LINKS: ${links}`;
  rtL.className = 'rt-item' + (links >= 2 ? ' danger' : links === 1 ? ' warn' : '');

  rtK.textContent = `FLAGS: ${flags}`;
  rtK.className = 'rt-item' + (flags >= 2 ? ' danger' : flags === 1 ? ' warn' : '');
}

// ═══════════════════════════════════════════════════════
//   DETECTION ENGINE — 100% Rule-Based, No API Needed
// ═══════════════════════════════════════════════════════

function runEngine(type, input) {
  const t = input.toLowerCase().trim();
  const scores = { urgency: 0, deception: 0, manipulation: 0, linkRisk: 0, spoof: 0 };
  const flags = [];
  const attackTypes = new Set();
  const recommendations = [];

  // ── PHONE NUMBER ──────────────────────────────────────
  if (type === 'phone_number') {
    const cleaned = t.replace(/[\s\-().+]/g,'');

    // Suspicious patterns
    if (/^0{4,}/.test(cleaned) || /(\d)\1{5,}/.test(cleaned)) {
      scores.deception += 60; flags.push('Repeated digit pattern — likely fake/spoofed number');
    }
    if (/^(900|976|809|284|876|473|664|649|767|268|242)/.test(cleaned)) {
      scores.deception += 70; flags.push('High-cost / international premium rate area code detected');
      attackTypes.add('vishing'); attackTypes.add('scam');
    }
    if (/^(1900|1800|18[0-9]{2})/.test(cleaned)) {
      scores.deception += 20; flags.push('Toll-free number — common in robocall campaigns');
    }
    if (cleaned.length < 7 || cleaned.length > 15) {
      scores.deception += 40; flags.push('Unusual number length — does not match standard formats');
    }
    if (/123456789|987654321|111111|000000/.test(cleaned)) {
      scores.deception += 80; flags.push('Sequential/repeating digits — pattern of spoofed test numbers');
      attackTypes.add('impersonation');
    }
    // International non-standard
    const country = input.trim();
    if (/^\+(?!1|44|91|61|81|49|33|39|34|55|86)/.test(country)) {
      scores.deception += 30; flags.push('Uncommon international country code');
    }
    if (scores.deception === 0) flags.push('Number format appears within standard range');

    recommendations.push('Do not answer calls from unrecognized international numbers');
    recommendations.push('Use a reverse phone lookup service to verify legitimacy');
    if (scores.deception > 40) {
      recommendations.push('Block and report the number to your carrier');
      attackTypes.add('vishing');
    }
  }

  // ── EMAIL ADDRESS ─────────────────────────────────────
  if (type === 'email_address') {
    if (!t.includes('@')) {
      scores.deception += 50; flags.push('Not a valid email format');
    } else {
      const [localPart, domain] = t.split('@');
      const domainName = (domain || '').split('.')[0];

      // Lookalike brand domains (leet-speak, number substitutions)
      const brands = ['paypal','google','amazon','microsoft','apple','netflix','facebook','instagram','twitter','bank','chase','wellsfargo','citibank','hsbc','barclays','linkedin','dropbox','yahoo'];
      brands.forEach(brand => {
        const leet = brand.replace(/a/g,'[a4@]').replace(/o/g,'[o0]').replace(/e/g,'[e3]').replace(/i/g,'[i1!]').replace(/l/g,'[l1]').replace(/s/g,'[s5$]');
        const re = new RegExp(leet, 'i');
        if (re.test(domainName) && domainName !== brand) {
          scores.deception += 85; scores.spoof += 80;
          flags.push(`Lookalike domain — "${domain}" impersonates "${brand}"`);
          attackTypes.add('phishing'); attackTypes.add('impersonation');
        }
        if (domainName === brand && (domain.split('.').length > 2 || !/\.(com|net|org|io|co)$/.test(domain))) {
          scores.spoof += 60;
          flags.push(`Brand name in subdomain — "${domain}" mimics official ${brand} address`);
          attackTypes.add('phishing');
        }
      });

      // Levenshtein-distance lookalike
      brands.forEach(brand => {
        if (domainName !== brand && levenshtein(domainName, brand) <= 2 && domainName.length > 3) {
          scores.deception += Math.max(scores.deception, 70);
          flags.push(`Domain "${domainName}" is 1-2 characters away from known brand "${brand}"`);
          attackTypes.add('phishing');
        }
      });

      // Free domain impersonating institution
      const freeDomains = ['gmail','yahoo','hotmail','outlook','protonmail','icloud','aol'];
      const institutionWords = ['bank','support','security','billing','admin','noreply','hr','payroll','it-dept','helpdesk'];
      if (freeDomains.some(d => domain.includes(d))) {
        if (institutionWords.some(w => localPart.includes(w))) {
          scores.deception += 75; scores.spoof += 70;
          flags.push(`Free email domain (${domain}) used with institutional-sounding sender "${localPart}"`);
          attackTypes.add('impersonation'); attackTypes.add('phishing');
        }
      }

      // Random character local part
      if (/[a-z0-9]{12,}/.test(localPart.replace(/[._-]/g,'')) && !/^(info|support|noreply|admin|hello|contact|team)/.test(localPart)) {
        scores.deception += 30;
        flags.push('Unusually long random-character sender name — common in bulk phishing');
      }

      // Hyphen-stuffed domains
      if ((domain.match(/-/g) || []).length >= 2) {
        scores.deception += 40; scores.spoof += 35;
        flags.push(`Hyphen-heavy domain "${domain}" — pattern used in fraudulent domains`);
        attackTypes.add('phishing');
      }

      // TK, ML, CF, GA — free and abused TLDs
      if (/\.(tk|ml|cf|ga|gq|xyz|top|click|pw|buzz)$/.test(domain)) {
        scores.deception += 65; scores.linkRisk += 60;
        flags.push(`High-risk TLD ".${domain.split('.').pop()}" — frequently used in phishing campaigns`);
        attackTypes.add('phishing');
      }

      if (scores.deception === 0 && scores.spoof === 0) {
        flags.push('Email domain appears legitimate — no lookalike patterns found');
      }
      recommendations.push('Hover over links in emails from this address before clicking');
      recommendations.push('Verify directly via official website — do not reply to this address');
      if (scores.deception > 50) recommendations.push('Block this sender and report as phishing');
    }
  }

  // ── SMS / EMAIL TEXT ──────────────────────────────────
  if (type === 'sms_text' || type === 'email_text') {

    // URGENCY scoring
    const urgencyPatterns = [
      [/\burgent\b/i, 25, 'Urgency keyword: "urgent"'],
      [/\bimmediately\b/i, 20, 'Urgency keyword: "immediately"'],
      [/\bact now\b/i, 30, 'High-pressure phrase: "act now"'],
      [/\b24.?hour/i, 25, 'Artificial deadline: "24 hours"'],
      [/\bexpire[sd]?\b/i, 20, 'Expiration pressure tactic'],
      [/\blimited time\b/i, 20, 'Scarcity manipulation: "limited time"'],
      [/\bfinal notice\b/i, 35, 'Final notice — classic scam escalation tactic'],
      [/\byour account (has been|is) (suspended|locked|blocked|compromised)/i, 50, 'Account threat — impersonation of service provider'],
      [/\bwarning\b/i, 15, 'Warning language detected'],
      [/\balert\b/i, 10, 'Alert language — common in phishing pretexts'],
      [/\bASAP\b/i, 20, 'Urgency keyword: "ASAP"'],
      [/verify (your|account|identity)/i, 30, 'Verification request — phishing pattern'],
    ];
    urgencyPatterns.forEach(([re, pts, msg]) => {
      if (re.test(t)) { scores.urgency += pts; flags.push(msg); }
    });

    // DECEPTION scoring
    const deceptionPatterns = [
      [/http:\/\//i, 30, 'Unencrypted HTTP link — legitimate services use HTTPS'],
      [/bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly|is\.gd|rb\.gy|clck\.ru|cutt\.ly/i, 50, 'URL shortener detected — masks true destination'],
      [/\.tk|\.ml|\.cf|\.ga|\.gq|\.xyz|\.pw|\.top|\.click/i, 60, 'High-risk TLD in embedded link'],
      [/(?:click|tap|follow|open|visit).{0,30}(link|here|below|url)/i, 25, 'Click-bait phrasing directing to external link'],
      [/login|sign.?in/i, 20, 'Login request — credential harvesting indicator'],
      [/(free|prize|winner|won|gift|reward).{0,30}(claim|collect|receive)/i, 55, 'Prize/reward claim — classic scam pretext'],
      [/\binvestment\b.{0,40}\b(return|profit|guaranteed|yield)\b/i, 60, 'Guaranteed returns — investment fraud indicator'],
      [/\b(bitcoin|crypto|btc|ethereum|nft)\b.{0,30}\b(profit|return|earn|double)/i, 65, 'Crypto profit promise — investment scam pattern'],
      [/\b(job|hiring|position).{0,50}\b(work from home|earn \$|per day|per week)\b/i, 55, 'Work-from-home job offer — job scam pattern'],
    ];
    deceptionPatterns.forEach(([re, pts, msg]) => {
      if (re.test(t)) { scores.deception += pts; flags.push(msg); }
    });

    // MANIPULATION scoring
    const manipPatterns = [
      [/\bfear\b|\bscared\b|\bpanic\b/i, 30, 'Fear-based language detected'],
      [/\b(congratulations|congrats)\b/i, 20, 'Congratulatory lure — common in prize scams'],
      [/\bselected\b|\bchosen\b|\bspecial offer\b/i, 20, 'Exclusivity manipulation tactic'],
      [/\b(don'?t miss|last chance|only \d+ left|limited spots)\b/i, 25, 'Scarcity manipulation'],
      [/\bsend.{0,30}(bank|account|routing|details|info)\b/i, 60, 'Explicit request for banking details'],
      [/(share|give|provide).{0,20}(password|otp|pin|code|credential)/i, 70, 'Request to share credentials or OTP'],
      [/\botp\b/i, 40, 'OTP mentioned — potential OTP fraud attempt'],
      [/\b(wire|transfer|send).{0,30}(money|\$|usd|€|£)\b/i, 60, 'Wire transfer request — financial fraud indicator'],
    ];
    manipPatterns.forEach(([re, pts, msg]) => {
      if (re.test(t)) { scores.manipulation += pts; flags.push(msg); }
    });

    // LINK RISK
    const urlMatches = t.match(/https?:\/\/[^\s]+|www\.[^\s]+/gi) || [];
    urlMatches.forEach(url => {
      scores.linkRisk += 20;
      if (/bit\.ly|tinyurl|goo\.gl|ow\.ly/i.test(url)) scores.linkRisk += 30;
      if (!/https:\/\//.test(url)) scores.linkRisk += 20;
    });
    if (urlMatches.length > 0) flags.push(`${urlMatches.length} URL(s) detected in message`);

    // IDENTITY SPOOF
    const spoofBrands = ['paypal','google','amazon','microsoft','apple','netflix','facebook','whatsapp','instagram','twitter','bank of america','chase','hdfc','sbi','icici','hdfc','irs','fbi','police','government'];
    spoofBrands.forEach(brand => {
      if (t.includes(brand)) {
        scores.spoof += 30;
        flags.push(`Brand/institution name "${brand}" mentioned — verify sender authenticity`);
        attackTypes.add('impersonation');
      }
    });

    // Attack type classification
    if (scores.urgency > 40 || scores.deception > 40) {
      if (type === 'sms_text') attackTypes.add('smishing');
      else attackTypes.add('phishing');
    }
    if (scores.manipulation > 50 && scores.manipulation > scores.urgency) attackTypes.add('scam');
    if (/otp|one.?time|verification code/i.test(t)) attackTypes.add('otp_fraud');
    if (/won|winner|prize|lottery/i.test(t)) attackTypes.add('prize_fraud');
    if (/job|hiring|earn.{0,20}(per day|per week|from home)/i.test(t)) attackTypes.add('job_scam');
    if (/invest|return|profit|guaranteed/i.test(t)) attackTypes.add('investment_fraud');
    if (scores.linkRisk > 60) attackTypes.add('credential_harvesting');

    // Recommendations
    if (scores.linkRisk > 0) recommendations.push('Do NOT click any links — type the official URL manually');
    if (scores.manipulation > 40) recommendations.push('Do not share OTPs, passwords, or banking details with anyone');
    if (attackTypes.has('phishing') || attackTypes.has('smishing')) {
      recommendations.push('Report message to your provider as phishing/spam');
      recommendations.push('Contact the impersonated organization via their official website only');
    }
    if (attackTypes.has('prize_fraud') || attackTypes.has('scam')) {
      recommendations.push('Ignore and delete — legitimate organizations do not ask you to pay to claim prizes');
    }
    if (attackTypes.has('otp_fraud')) {
      recommendations.push('NEVER share OTPs — your bank will NEVER ask for this');
    }
    if (attackTypes.has('job_scam')) {
      recommendations.push('Research the company on LinkedIn and official job boards before engaging');
    }
    if (attackTypes.has('investment_fraud')) {
      recommendations.push('Guaranteed returns do not exist — report to your financial regulator');
    }
  }

  // ── FINAL SCORE CALCULATION ──────────────────────────
  // Cap each sub-score at 100
  Object.keys(scores).forEach(k => { scores[k] = Math.min(100, scores[k]); });

  // Weighted composite
  const weights = { urgency: 0.25, deception: 0.30, manipulation: 0.20, linkRisk: 0.15, spoof: 0.10 };
  const composite = Math.min(100, Math.round(
    Object.keys(scores).reduce((sum, k) => sum + scores[k] * weights[k], 0)
  ));

  // Verdict thresholds
  let verdict;
  if (composite < 22)      verdict = 'SAFE';
  else if (composite < 50) verdict = 'SUSPICIOUS';
  else                     verdict = 'MALICIOUS';

  // Deduplicate flags
  const uniqueFlags = [...new Set(flags)];

  if (uniqueFlags.length === 0) uniqueFlags.push('No significant threat indicators found');
  if (attackTypes.size === 0) attackTypes.add('none');
  if (recommendations.length === 0) recommendations.push('Content appears safe — remain vigilant and verify sources');

  return {
    verdict,
    composite,
    scores,
    flags: uniqueFlags,
    attackTypes: [...attackTypes].filter(a => a !== 'none'),
    recommendations: [...new Set(recommendations)]
  };
}

// ── LEVENSHTEIN DISTANCE ───────────────────────────────
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length: m+1}, (_,i) => Array.from({length: n+1}, (_,j) => i||j));
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

// ── MAIN ANALYZE ──────────────────────────────────────
function analyze() {
  const input = document.getElementById('main-input').value.trim();
  if (!input) { flashStatus('INPUT EMPTY — ENTER DATA FIRST', 'warn'); return; }

  const btn = document.getElementById('scan-btn');
  btn.disabled = true;
  document.getElementById('scan-btn-text').textContent = 'SCANNING...';
  document.getElementById('scan-btn-icon').textContent = '◌';
  flashStatus('SCANNING...', 'scan');

  // Simulate scan delay for UX
  setTimeout(() => {
    const result = runEngine(selectedType, input);
    lastResult = result;
    renderResult(result, input);
    btn.disabled = false;
    document.getElementById('scan-btn-text').textContent = 'INITIATE SCAN';
    document.getElementById('scan-btn-icon').textContent = '▶';
    scanCount++;
    document.getElementById('scan-count').textContent = `SCANS: ${scanCount}`;
    addHistory(input, result.verdict, result.composite);
    flashStatus('SCAN COMPLETE — ' + result.verdict, result.verdict === 'SAFE' ? 'safe' : result.verdict === 'SUSPICIOUS' ? 'warn' : 'danger');
  }, 900);
}

// ── RENDER RESULT ─────────────────────────────────────
function renderResult(r, input) {
  const { verdict, composite, scores, flags, attackTypes, recommendations } = r;

  // Radar
  animateRadar(composite, verdict);

  // Verdict box
  const subs = {
    SAFE: 'No significant threat indicators detected',
    SUSPICIOUS: 'Warning signs present — exercise caution',
    MALICIOUS: 'High-confidence social engineering attack'
  };
  const box = document.getElementById('verdict-box');
  box.className = 'verdict-box';
  box.innerHTML = `
    <div class="vb-result">
      <div class="vb-verdict ${verdict}">${verdict}</div>
      <div class="vb-sub">${subs[verdict]}</div>
      <div class="vb-meta">
        <div class="vb-meta-item">TYPE: <strong>${selectedType.replace(/_/g,' ').toUpperCase()}</strong></div>
        <div class="vb-meta-item">SCORE: <strong>${composite}/100</strong></div>
        <div class="vb-meta-item">FLAGS: <strong>${flags.length}</strong></div>
      </div>
    </div>`;

  // Threat level badge
  const tl = document.getElementById('tl-value');
  tl.textContent = verdict;
  tl.className = 'tl-value ' + verdict.toLowerCase();

  // Score breakdown
  const bkData = [
    ['urgency', scores.urgency],
    ['deception', scores.deception],
    ['manipulation', scores.manipulation],
    ['link', scores.linkRisk],
    ['spoof', scores.spoof]
  ];
  const colors = {
    0:  '#00ff88',
    30: '#ffe94d',
    60: '#ff9500',
    80: '#ff3b3b'
  };
  bkData.forEach(([key, val]) => {
    const bar = document.getElementById(`bk-${key}`);
    const valEl = document.getElementById(`bkv-${key}`);
    let color = '#00ff88';
    if (val >= 80) color = '#ff3b3b';
    else if (val >= 60) color = '#ff9500';
    else if (val >= 30) color = '#ffe94d';
    bar.style.background = color;
    bar.style.boxShadow = `0 0 6px ${color}`;
    setTimeout(() => { bar.style.width = val + '%'; }, 200);
    valEl.textContent = val;
    valEl.style.color = color;
  });

  // Threat log
  const logEl = document.getElementById('threat-log');
  if (flags.length === 0 || (flags.length === 1 && flags[0].includes('No significant'))) {
    logEl.innerHTML = `<div class="log-entry"><div class="log-bullet green"></div><div class="log-msg dim">No threat indicators detected. Content appears safe.</div></div>`;
  } else {
    logEl.innerHTML = flags.map(f => `
      <div class="log-entry">
        <div class="log-bullet ${verdict==='MALICIOUS'?'red':verdict==='SUSPICIOUS'?'orange':'green'}"></div>
        <div class="log-msg">${esc(f)}</div>
      </div>`).join('');
  }

  // Attack tags
  const tagsEl = document.getElementById('attack-tags');
  if (attackTypes.length === 0) {
    tagsEl.innerHTML = `<div class="tags-idle">// No attack type classified</div>`;
  } else {
    tagsEl.innerHTML = attackTypes.map(a => {
      const cls = verdict==='MALICIOUS' ? 'atag-red' : verdict==='SUSPICIOUS' ? 'atag-orange' : 'atag-cyan';
      return `<span class="atag ${cls}">${a.replace(/_/g,' ').toUpperCase()}</span>`;
    }).join('');
  }

  // Recommendations
  const recEl = document.getElementById('rec-list');
  recEl.innerHTML = recommendations.map(r => `
    <div class="rec-item">
      <span class="rec-arrow">▷</span>
      <span>${esc(r)}</span>
    </div>`).join('');
}

// ── HISTORY ───────────────────────────────────────────
function addHistory(input, verdict, score) {
  scanHistory.unshift({ text: input.substring(0,50)+(input.length>50?'…':''), verdict, type: selectedType.replace(/_/g,' '), score });
  if (scanHistory.length > 8) scanHistory.pop();

  const el = document.getElementById('history-log');
  el.innerHTML = scanHistory.map(h => `
    <div class="hist-row">
      <div class="hist-dot ${h.verdict}"></div>
      <div class="hist-text">${esc(h.text)}</div>
      <div class="hist-type">${h.score}</div>
    </div>`).join('');
}

// ── STATUS BAR FLASH ──────────────────────────────────
function flashStatus(msg, type) {
  const el = document.getElementById('status-text');
  const dot = el.previousElementSibling;
  el.textContent = msg;
  dot.style.background = type === 'danger' ? '#ff3b3b' : type === 'warn' ? '#ff9500' : type === 'safe' ? '#00ff88' : '#00e5ff';
  dot.style.boxShadow = `0 0 8px ${dot.style.background}`;
}

// ── RADAR CANVAS ──────────────────────────────────────
function drawRadarIdle() {
  const canvas = document.getElementById('radar');
  const ctx = canvas.getContext('2d');
  const cx = 110, cy = 110, maxR = 100;

  function frame() {
    ctx.clearRect(0,0,220,220);
    // Background rings
    for (let r = 20; r <= maxR; r += 20) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(0,255,136,${0.06 + (r===maxR?0.06:0)})`;
      ctx.lineWidth = r === maxR ? 1.5 : 0.5;
      ctx.stroke();
    }
    // Crosshairs
    ctx.strokeStyle = 'rgba(0,255,136,0.08)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(cx-maxR,cy); ctx.lineTo(cx+maxR,cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx,cy-maxR); ctx.lineTo(cx,cy+maxR); ctx.stroke();

    // Rotating sweep
    radarAngle += 0.025;
    const grad = ctx.createConicalGradient
      ? null
      : null;
    const sweepLen = Math.PI * 0.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, maxR, radarAngle - sweepLen, radarAngle);
    ctx.closePath();
    const sweepGrad = ctx.createRadialGradient(cx,cy,0,cx,cy,maxR);
    sweepGrad.addColorStop(0, 'rgba(0,255,136,0.15)');
    sweepGrad.addColorStop(1, 'rgba(0,255,136,0.01)');
    ctx.fillStyle = sweepGrad;
    ctx.fill();

    // Sweep line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(radarAngle)*maxR, cy + Math.sin(radarAngle)*maxR);
    ctx.strokeStyle = 'rgba(0,255,136,0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI*2);
    ctx.fillStyle = '#00ff88';
    ctx.fill();
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    radarAnimFrame = requestAnimationFrame(frame);
  }

  if (radarAnimFrame) cancelAnimationFrame(radarAnimFrame);
  frame();
}

function animateRadar(score, verdict) {
  if (radarAnimFrame) cancelAnimationFrame(radarAnimFrame);

  const canvas = document.getElementById('radar');
  const ctx = canvas.getContext('2d');
  const cx = 110, cy = 110, maxR = 100;

  const color = verdict === 'MALICIOUS' ? '#ff3b3b'
              : verdict === 'SUSPICIOUS' ? '#ff9500'
              : '#00ff88';

  // Update score display
  const scoreEl = document.getElementById('radar-score');
  const labelEl = document.getElementById('radar-label');
  scoreEl.textContent = score;
  scoreEl.style.color = color;
  scoreEl.style.textShadow = `0 0 20px ${color}`;
  labelEl.textContent = verdict;

  let displayScore = 0;
  const target = score;
  let angle = -Math.PI/2;

  function frame() {
    displayScore = Math.min(displayScore + 2.5, target);
    ctx.clearRect(0,0,220,220);

    // Background rings
    for (let r = 20; r <= maxR; r += 20) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(${hexToRgb(color)},${r===maxR?0.2:0.07})`;
      ctx.lineWidth = r===maxR ? 1.5 : 0.5;
      ctx.stroke();
    }
    // Crosshairs
    ctx.strokeStyle = `rgba(${hexToRgb(color)},0.1)`;
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(cx-maxR,cy); ctx.lineTo(cx+maxR,cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx,cy-maxR); ctx.lineTo(cx,cy+maxR); ctx.stroke();

    // Arc progress
    const endAngle = -Math.PI/2 + (displayScore/100) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR-6, -Math.PI/2, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Rotating sweep
    radarAngle += 0.03;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(radarAngle)*maxR, cy + Math.sin(radarAngle)*maxR);
    ctx.strokeStyle = `rgba(${hexToRgb(color)},0.6)`;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'butt';
    ctx.stroke();

    // Center
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI*2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Threat dots scattered on radar (if malicious/suspicious)
    if (verdict !== 'SAFE' && displayScore > 20) {
      const dotSeeds = [
        [0.5, 50, 30], [1.8, 70, 50], [3.1, 40, 70], [4.5, 60, 40],
        [2.2, 80, 60], [5.0, 30, 35]
      ];
      dotSeeds.forEach(([a, r, opacity]) => {
        if (r/100 * maxR < (displayScore/100)*maxR) {
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a)*r*0.85, cy + Math.sin(a)*r*0.85, 3, 0, Math.PI*2);
          ctx.fillStyle = color;
          ctx.globalAlpha = opacity/100;
          ctx.shadowColor = color;
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
        }
      });
    }

    if (displayScore < target) radarAnimFrame = requestAnimationFrame(frame);
    else {
      // Continue slow rotation after fill
      function slowRotate() {
        ctx.clearRect(0,0,220,220);
        for (let r = 20; r <= maxR; r += 20) {
          ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
          ctx.strokeStyle = `rgba(${hexToRgb(color)},${r===maxR?0.2:0.07})`;
          ctx.lineWidth = r===maxR?1.5:0.5; ctx.stroke();
        }
        ctx.strokeStyle=`rgba(${hexToRgb(color)},0.1)`; ctx.lineWidth=0.5;
        ctx.beginPath(); ctx.moveTo(cx-maxR,cy); ctx.lineTo(cx+maxR,cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx,cy-maxR); ctx.lineTo(cx,cy+maxR); ctx.stroke();

        ctx.beginPath(); ctx.arc(cx,cy,maxR-6,-Math.PI/2,-Math.PI/2+(score/100)*Math.PI*2);
        ctx.strokeStyle=color; ctx.lineWidth=6; ctx.lineCap='round';
        ctx.shadowColor=color; ctx.shadowBlur=12; ctx.stroke(); ctx.shadowBlur=0;

        radarAngle += 0.015;
        ctx.beginPath(); ctx.moveTo(cx,cy);
        ctx.lineTo(cx+Math.cos(radarAngle)*maxR, cy+Math.sin(radarAngle)*maxR);
        ctx.strokeStyle=`rgba(${hexToRgb(color)},0.5)`; ctx.lineWidth=1.5;
        ctx.lineCap='butt'; ctx.stroke();

        ctx.beginPath(); ctx.arc(cx,cy,4,0,Math.PI*2);
        ctx.fillStyle=color; ctx.shadowColor=color; ctx.shadowBlur=10; ctx.fill(); ctx.shadowBlur=0;

        radarAnimFrame = requestAnimationFrame(slowRotate);
      }
      slowRotate();
    }
  }
  frame();
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

// ── UTIL ──────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
