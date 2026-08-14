# 🚀 Taka AI Gateway

**Enterprise-Grade, Zero-Downtime Groq API Rotator & Load Balancer**

Taka AI Gateway pools multiple Groq API keys, rotates them sequentially (Round-Robin / Least Recently Used), automatically detects HTTP 429 rate limits, and transparently fails over to the next healthy key with sub-millisecond overhead.

It exposes a **100% standard OpenAI-compatible API** (`/v1/chat/completions`, `/v1/models`) supporting real-time streaming (SSE) and non-streaming responses.

---

## 🌟 Key Features

- **⚡ Zero-Downtime Key Rotation**: Sequentially distributes every request across your pooled API keys.
- **🛡️ Smart 429 Rate-Limit Failover**: If a key hits a rate limit, it is placed in a 60-second cooldown and the request is transparently retried with the next active key without client failure.
- **🌊 Native Streaming Support**: Full Server-Sent Events (`stream: true`) compatible with the OpenAI API protocol.
- **🌐 100% Free Cloud Architecture**: Runs seamlessly on **Vercel (Edge Functions)** with **Supabase (PostgreSQL)** and **GitHub (CI/CD)**.
- **🔄 Hybrid Fallback**: Works immediately in-memory with pre-configured keys even before Supabase is connected!
- **📊 Real-time Web Dashboard**: Visual monitoring of active keys, request distribution, cooldown states, and an in-browser test playground.

---

## 🛠️ Quick Start (Local)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the Taka AI Dashboard!

---

## ☁️ 1-Minute Cloud Deployment (Vercel + GitHub + Supabase)

### Step 1: Create Supabase Database (Free)
1. Go to [database.new](https://database.new) and create a free project.
2. Open the **SQL Editor** in your Supabase dashboard.
3. Copy and paste the contents of [`supabase/schema.sql`](./supabase/schema.sql) and click **Run**.
   *(This creates the table, atomic rotation functions, and seeds your 8 keys).*
4. Go to **Project Settings -> API** and copy:
   - `Project URL`
   - `service_role` secret key

### Step 2: Push to GitHub
```bash
git add .
git commit -m "feat: Taka AI Gateway"
git remote add origin https://github.com/YOUR_USERNAME/taka-ai-gateway.git
git push -u origin main
```

### Step 3: Deploy to Vercel (Free)
1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repository.
2. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://your-project.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `your-service-role-key`
   - `RATE_LIMIT_COOLDOWN_SECONDS` = `60`
   - *(Optional)* `PROXY_AUTH_TOKEN` = `your-custom-secret-token`
3. Click **Deploy**.
4. Your Gateway is now live at: `https://your-app.vercel.app/v1`!

---

## 💻 Developer Integration

Use your Taka AI Gateway URL as a drop-in replacement anywhere OpenAI is supported:

### Python (`openai` SDK)
```python
from openai import OpenAI

client = OpenAI(
    base_url="https://your-app.vercel.app/v1", # or http://localhost:3000/v1
    api_key="taka-ai-key" # or your PROXY_AUTH_TOKEN
)

response = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[{"role": "user", "content": "Hello Taka AI!"}],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content or "", end="")
```

### Node.js / TypeScript (`openai` SDK)
```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://your-app.vercel.app/v1",
  apiKey: "taka-ai-key",
});

async function main() {
  const stream = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: "Explain quantum computing." }],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}

main();
```

### cURL
```bash
curl https://your-app.vercel.app/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer taka-ai-key" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

---

## 📋 Supported Models
- `llama-3.3-70b-versatile` (Default recommended)
- `llama-3.1-8b-instant` (Ultra-low latency)
- `llama-3.1-70b-versatile`
- `deepseek-r1-distill-llama-70b`
- `mixtral-8x7b-32768`
- `gemma2-9b-it`
- `whisper-large-v3`
