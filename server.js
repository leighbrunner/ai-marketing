if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  require('dotenv').config();
}

const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const SITE_PASSWORD = process.env.SITE_PASSWORD || 'simplifyai';
const COOKIE_SECRET = crypto.createHash('sha256').update(SITE_PASSWORD).digest('hex').slice(0, 32);

function makeToken() {
  return crypto.createHmac('sha256', COOKIE_SECRET).update(SITE_PASSWORD).digest('hex');
}

function parseCookies(req) {
  const cookies = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k) cookies[k] = v.join('=');
  });
  return cookies;
}

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Login — Simplify AI Demo</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:#001F22;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center}
.card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:48px 36px;max-width:380px;width:100%;backdrop-filter:blur(24px);text-align:center}
h1{font-size:22px;font-weight:600;margin-bottom:8px}
p{font-size:14px;color:rgba(255,255,255,.45);margin-bottom:28px}
input{width:100%;padding:14px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;font-size:16px;font-family:inherit;color:#fff;outline:none;margin-bottom:16px;transition:border-color .2s}
input:focus{border-color:#0FFFFF;box-shadow:0 0 0 3px rgba(15,255,255,.12)}
button{width:100%;padding:14px;border:none;border-radius:10px;background:linear-gradient(135deg,#0FFFFF,#5CE555);color:#001F22;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;transition:transform .15s}
button:hover{transform:translateY(-1px)}
.err{color:#ff5050;font-size:13px;margin-bottom:12px;display:none}
.tag{font-family:'Space Mono',monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.25);margin-top:24px}
</style></head><body>
<form class="card" method="POST" action="/auth">
<h1>Simplify AI Demo</h1>
<p>Enter the password to access the demo</p>
<div class="err" id="err">Incorrect password</div>
<input type="password" name="password" placeholder="Password" autofocus autocomplete="off">
<button type="submit">Enter</button>
<div class="tag">AI-Powered Outbound Demo</div>
</form>
<script>if(location.search.includes('err=1'))document.getElementById('err').style.display='block'</script>
</body></html>`;

// Auth middleware
app.use((req, res, next) => {
  if (req.path === '/auth') return next();
  const cookies = parseCookies(req);
  if (cookies.auth === makeToken()) return next();
  res.status(200).send(LOGIN_HTML);
});

// Auth endpoint
app.post('/auth', (req, res) => {
  if (req.body.password === SITE_PASSWORD) {
    res.setHeader('Set-Cookie', `auth=${makeToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    res.redirect(303, '/');
  } else {
    res.redirect(303, '/auth?err=1');
  }
});

app.get('/auth', (req, res) => {
  res.send(LOGIN_HTML);
});

// Static files (after auth check)
app.use(express.static(path.join(__dirname, 'public')));

// Outbound call API
app.post('/api/call', async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  let normalized = phoneNumber.replace(/[\s\-()]/g, '');
  if (normalized.startsWith('0')) {
    normalized = '+61' + normalized.slice(1);
  } else if (!normalized.startsWith('+')) {
    normalized = '+61' + normalized;
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/convai/twilio/outbound-call', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: process.env.ELEVENLABS_AGENT_ID,
        agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
        to_number: normalized,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('ElevenLabs API error:', data);
      return res.status(response.status).json({ error: data.detail || 'Failed to initiate call' });
    }

    res.json({
      success: true,
      conversationId: data.conversation_id,
      callSid: data.callSid,
      calledNumber: normalized,
    });
  } catch (err) {
    console.error('Call error:', err);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

// Only listen when running locally (not in Lambda)
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Simplify Outbound Demo running at http://localhost:${PORT}`);
  });
}

module.exports = app;
