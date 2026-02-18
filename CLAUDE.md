# AI Marketing - Outbound Calling Demo

## Overview
Demo app for AI-powered outbound phone calls using ElevenLabs Conversational AI + Twilio. Built to demonstrate autonomous AI sales agents calling prospects for Simplify (simplify.com.au), an Australian loan comparison platform.

## Tech Stack
- **Server**: Node.js + Express (runs locally or as AWS Lambda)
- **Frontend**: Vanilla HTML/CSS/JS (single page in `public/`)
- **Voice AI**: ElevenLabs Conversational AI (agent + TTS + ASR)
- **Telephony**: Twilio (AU local number: +61 3 4829 3202)
- **LLM**: Gemini 2.5 Flash (for low-latency responses)
- **TTS Model**: eleven_turbo_v2 with Charlie voice (Australian accent)
- **Hosting**: AWS Lambda + API Gateway HTTP API (Sydney, ap-southeast-2)

## Live URL
https://wf9g06jee9.execute-api.ap-southeast-2.amazonaws.com/
- Password protected (SITE_PASSWORD env var)

## Project Structure
```
server.js          - Express server with auth middleware + /api/call endpoint
lambda.js          - AWS Lambda handler (wraps Express via serverless-http)
public/index.html  - Demo frontend (single file, no build step)
setup.py           - One-time setup script for ElevenLabs agent + phone import
.env               - API keys and config (not committed)
.env.example       - Template for required env vars
```

## Local Setup
1. Copy `.env.example` to `.env` and fill in credentials
2. `npm install`
3. `npm start`
4. Open http://localhost:3000

## AWS Deployment
Deployed to the `leigh` AWS account (628966941499) in ap-southeast-2.

**Resources:**
- IAM Role: `ai-marketing-lambda-role`
- Lambda: `ai-marketing-demo` (nodejs20.x, 256MB, 30s timeout)
- API Gateway HTTP API: `wf9g06jee9` (ai-marketing-demo)

**To update the Lambda after code changes:**
```bash
npm install
zip -r /tmp/ai-marketing-lambda.zip server.js lambda.js package.json node_modules/ public/
aws lambda update-function-code --profile leigh --region ap-southeast-2 \
  --function-name ai-marketing-demo --zip-file fileb:///tmp/ai-marketing-lambda.zip
```

**Environment variables** are set on the Lambda function (encrypted at rest). To update:
```bash
aws lambda update-function-configuration --profile leigh --region ap-southeast-2 \
  --function-name ai-marketing-demo --environment "Variables={KEY=value,...}"
```

## Auth
- Site is password-gated with cookie-based auth
- Login page served for unauthenticated requests
- Auth cookie is HttpOnly, SameSite=Lax, 24hr expiry
- Password set via `SITE_PASSWORD` env var

## API Flow
1. User enters phone number in frontend
2. POST `/api/call` normalizes to E.164 format
3. Server calls ElevenLabs `POST /v1/convai/twilio/outbound-call`
4. ElevenLabs orchestrates Twilio to dial the recipient
5. AI agent begins conversation when call is answered

## Notes
- AU local numbers require an Australian address in Twilio
- AU mobile numbers additionally require a Regulatory Bundle
- TTS model must be `eleven_turbo_v2` or `eleven_flash_v2` for English agents
- For lowest AU latency, Twilio regional routing should use `au1` / `sydney` edge
- Lambda Function URLs were blocked by account policy; API Gateway HTTP API used instead
