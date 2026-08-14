import urllib.request
import json
import time

VERCEL_URL = "https://taka-ai-gateway.vercel.app"

print("Waiting for Vercel deployment (15s)...")
time.sleep(15)

print("1. Testing GET https://taka-ai-gateway.vercel.app/v1/models...")
try:
    req = urllib.request.Request(f"{VERCEL_URL}/v1/models")
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        print("Status:", resp.status)
        print("Models:", [m['id'] for m in data.get('data', [])])
except Exception as e:
    print("Models error:", e)

print("\n2. Testing POST https://taka-ai-gateway.vercel.app/v1/chat/completions...")
try:
    req = urllib.request.Request(
        f"{VERCEL_URL}/v1/chat/completions",
        data=json.dumps({
            "model": "taka-ultra-v1",
            "messages": [{"role": "user", "content": "Respond with 'TAKA_LIVE_ONLINE'"}],
            "max_tokens": 10
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        res = json.loads(resp.read().decode())
        print("Status:", resp.status)
        print("Model:", res.get("model"))
        print("Reply:", res['choices'][0]['message']['content'].strip())
        print("Headers:", dict(resp.headers))
except Exception as e:
    print("Chat error:", e)
