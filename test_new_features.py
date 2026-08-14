import urllib.request
import json

BASE_URL = "http://localhost:3000"

print("1. Testing One-Time Access Code Login...")
# First attempt with one-time code
req = urllib.request.Request(
    f"{BASE_URL}/api/auth/access",
    data=json.dumps({"code": "TAKA-VIP-8899"}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode())
    print("1st attempt with TAKA-VIP-8899:", res)
    assert res['success'] == True

# Second attempt (should fail because it's one-time)
try:
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/access",
        data=json.dumps({"code": "TAKA-VIP-8899"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("2nd attempt returned:", res)
except urllib.error.HTTPError as e:
    err = json.loads(e.read().decode())
    print("2nd attempt properly rejected as one-time:", err)

# Master Admin Pass
req = urllib.request.Request(
    f"{BASE_URL}/api/auth/access",
    data=json.dumps({"code": "TAKA-MASTER-2026"}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode())
    print("Master Pass verification:", res)
    assert res['success'] == True

print("\n2. Testing GET /v1/models (Latest 14 Taka Models)...")
req = urllib.request.Request(f"{BASE_URL}/v1/models")
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    models = [m['id'] for m in data.get('data', [])]
    print(f"Total Models ({len(models)}): {models}")
    assert "taka-search-v1" in models
    assert "taka-search-mini" in models
    assert "taka-max-120b" in models

print("\n3. Testing Compound Search Agent (taka-search-v1)...")
req = urllib.request.Request(
    f"{BASE_URL}/v1/chat/completions",
    data=json.dumps({
        "model": "taka-search-v1",
        "messages": [{"role": "user", "content": "What is the capital of France?"}],
        "max_tokens": 15
    }).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req, timeout=15) as resp:
    res = json.loads(resp.read().decode())
    print("Search Model Response:", res['choices'][0]['message']['content'].strip())
    print("Model in response:", res.get('model'))
    assert res.get('model') == "taka-search-v1"

print("\nALL ACCESS & SEARCH TESTS PASSED!")
