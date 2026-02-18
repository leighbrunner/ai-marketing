require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/call', async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  // Normalize AU number to E.164
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Simplify Outbound Demo running at http://localhost:${PORT}`);
});
