import urllib.request
import json

BASE_URL = "http://localhost:3000"

print("1. Testing GET /v1/models (Taka AI Models)...")
req = urllib.request.Request(f"{BASE_URL}/v1/models")
with urllib.request.urlopen(req, timeout=10) as resp:
    data = json.loads(resp.read().decode())
    print("Models:", [m['id'] for m in data.get('data', [])])

print("\n2. Testing POST /api/taka-keys (Create API key)...")
req = urllib.request.Request(
    f"{BASE_URL}/api/taka-keys",
    data=json.dumps({"name": "Test Key"}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req, timeout=10) as resp:
    kdata = json.loads(resp.read().decode())
    new_key = kdata.get("key", {}).get("keySecret")
    print(f"Created Key: {new_key}")

print("\n3. Testing POST /v1/chat/completions with model 'taka-ultra-v1' and Bearer token...")
req = urllib.request.Request(
    f"{BASE_URL}/v1/chat/completions",
    data=json.dumps({
        "model": "taka-ultra-v1",
        "messages": [{"role": "user", "content": "Respond with 'TAKA_NEURAL_OK'"}],
        "max_tokens": 10
    }).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {new_key}"
    }
)
with urllib.request.urlopen(req, timeout=10) as resp:
    res = json.loads(resp.read().decode())
    print("Response Status:", resp.status)
    print("Model returned:", res.get("model"))
    print("Content:", res['choices'][0]['message']['content'].strip())
    print("System Fingerprint:", res.get("system_fingerprint"))

print("\n4. Testing POST /v1/chat/completions Streaming SSE...")
req = urllib.request.Request(
    f"{BASE_URL}/v1/chat/completions",
    data=json.dumps({
        "model": "taka-flash-v1",
        "messages": [{"role": "user", "content": "Say hello in 3 words"}],
        "stream": True,
        "max_tokens": 15
    }).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {new_key}"
    }
)
with urllib.request.urlopen(req, timeout=10) as resp:
    print("Stream Headers:", dict(resp.headers))
    chunks = []
    for line in resp:
        line_str = line.decode("utf-8").strip()
        if line_str.startswith("data: ") and line_str != "data: [DONE]":
            try:
                cdata = json.loads(line_str[6:])
                delta = cdata['choices'][0]['delta'].get('content', '')
                chunks.append(delta)
            except:
                pass
    print("Stream Output:", "".join(chunks).strip())

print("\nTESTS COMPLETE!")
