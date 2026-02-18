#!/usr/bin/env python3
"""Setup ElevenLabs agent and import Twilio number."""
import json
import os
import urllib.request
import sys
from dotenv import load_dotenv
load_dotenv()

ELEVENLABS_API_KEY = os.environ["ELEVENLABS_API_KEY"]
TWILIO_SID = os.environ["TWILIO_ACCOUNT_SID"]
TWILIO_TOKEN = os.environ["TWILIO_AUTH_TOKEN"]
PHONE_NUMBER = os.environ["TWILIO_PHONE_NUMBER"]

BASE = "https://api.elevenlabs.io/v1"

def api_call(method, path, data=None):
    url = f"{BASE}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("xi-api-key", ELEVENLABS_API_KEY)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"ERROR {e.code}: {e.read().decode()}")
        sys.exit(1)

# Step 1: Create the agent
print("Creating agent...")
agent_data = {
    "name": "Simplify Outbound Demo",
    "conversation_config": {
        "agent": {
            "first_message": "Hey there! This is Sarah calling from Simplify. Hope I haven't caught you at a bad time. I'll only take a minute. I'm reaching out because we help Australians compare loans from over 30 lenders to find the best deal. Is that something you'd be interested in hearing a bit more about?",
            "language": "en",
            "prompt": {
                "prompt": """You are Sarah, a friendly and professional outbound sales representative calling on behalf of Simplify (simplify.com.au). You have a warm, natural Australian conversational style. You are NOT robotic or scripted-sounding.

ABOUT SIMPLIFY:
- Simplify is Australia's leading online loan comparison platform
- They connect borrowers with 30+ major lenders
- They offer car loans, boat loans, caravan loans, motorbike loans, business loans, and personal loans
- No impact on credit score when comparing
- 100% lender visibility with no hidden fees
- Same-day approvals possible
- 30+ loan specialists to guide customers
- Rated 4.9/5 on Feefo (Platinum Trusted Service Award)
- The process is simple: compare online, get matched, settle your loan

YOUR GOAL:
- Introduce Simplify's services in a casual, friendly way
- Find out if the person is currently looking for any type of financing (car, boat, caravan, personal loan, etc.)
- Highlight the key benefits: free to compare, no credit score impact, access to 30+ lenders, same-day approvals
- If interested, encourage them to visit simplify.com.au or offer to have a loan specialist call them back
- If they're not interested, be respectful and thank them for their time

CONVERSATION STYLE:
- Keep it conversational and natural, like chatting with a mate
- Use Australian English and casual phrasing
- Don't be pushy — if someone isn't interested, wrap up gracefully
- Keep responses concise (1-3 sentences max)
- Ask questions to understand their needs rather than just pitching
- Be enthusiastic but not over-the-top
- If asked about specific rates, explain that rates vary by lender and personal circumstances, and that's exactly why comparing is so valuable

IMPORTANT RULES:
- Never make up specific interest rates or loan terms
- Always be honest — if you don't know something, say so and offer to have a specialist follow up
- If someone asks to be removed from the call list, acknowledge immediately and end the call politely
- This is a demo call, so if the person seems to know it's a demo, acknowledge that and showcase the technology""",
                "llm": "gemini-2.5-flash",
                "temperature": 0.7,
                "max_tokens": 150
            }
        },
        "tts": {
            "model_id": "eleven_turbo_v2",
            "voice_id": "IKne3meq5aSn9XLyUdCD",
            "agent_output_audio_format": "ulaw_8000",
            "stability": 0.5,
            "speed": 1.0,
            "similarity_boost": 0.8
        },
        "asr": {
            "quality": "high",
            "provider": "elevenlabs",
            "user_input_audio_format": "ulaw_8000"
        },
        "turn": {
            "turn_timeout": 7
        },
        "conversation": {
            "max_duration_seconds": 300
        }
    }
}

result = api_call("POST", "/convai/agents/create", agent_data)
agent_id = result.get("agent_id")
print(f"Agent created! ID: {agent_id}")

# Step 2: Import Twilio phone number with AU region
print("\nImporting Twilio phone number...")
phone_data = {
    "provider": "twilio",
    "phone_number": PHONE_NUMBER,
    "label": "Simplify AU Outbound",
    "sid": TWILIO_SID,
    "token": TWILIO_TOKEN,
    "agent_id": agent_id
}

result2 = api_call("POST", "/convai/phone-numbers", phone_data)
phone_number_id = result2.get("phone_number_id")
print(f"Phone number imported! ID: {phone_number_id}")
print(json.dumps(result2, indent=2))

# Save config for the demo app
config = {
    "agent_id": agent_id,
    "phone_number_id": phone_number_id,
    "phone_number": PHONE_NUMBER,
    "elevenlabs_api_key": ELEVENLABS_API_KEY
}
with open("/Users/leigh/dev/personal/outbound/config.json", "w") as f:
    json.dump(config, f, indent=2)
print(f"\nConfig saved to config.json")
print(json.dumps(config, indent=2))
