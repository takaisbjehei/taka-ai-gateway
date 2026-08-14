import urllib.request
import json
import time

BASE_URL = "http://localhost:3000"

def test_models():
    print("\n--- 1. Testing GET /v1/models ---")
    url = f"{BASE_URL}/v1/models"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        models = [m['id'] for m in data.get('data', [])]
        print(f"Status: {resp.status}, Available models: {len(models)}")
        print(f"Sample models: {models[:4]}")
        assert resp.status == 200 and len(models) > 0

def test_chat_non_stream():
    print("\n--- 2. Testing POST /v1/chat/completions (Non-Streaming) ---")
    url = f"{BASE_URL}/v1/chat/completions"
    payload = json.dumps({
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": "Respond with 'TAKA_OK'"}],
        "max_tokens": 10
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        key_label = resp.headers.get("X-Taka-Key-Label")
        key_used = resp.headers.get("X-Taka-Key-Used")
        data = json.loads(resp.read().decode())
        reply = data['choices'][0]['message']['content']
        print(f"Status: {resp.status}")
        print(f"Key Used: {key_label} ({key_used})")
        print(f"Reply: {reply.strip()}")
        assert resp.status == 200

def test_chat_stream():
    print("\n--- 3. Testing POST /v1/chat/completions (Streaming SSE) ---")
    url = f"{BASE_URL}/v1/chat/completions"
    payload = json.dumps({
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": "Count from 1 to 5"}],
        "stream": True,
        "max_tokens": 20
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        key_label = resp.headers.get("X-Taka-Key-Label")
        print(f"Status: {resp.status} (Stream), Key: {key_label}")
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
        print(f"Stream output: {''.join(chunks).strip()}")
        assert len(chunks) > 0

def test_rotation():
    print("\n--- 4. Testing Sequential Key Rotation (8 Consecutive Calls) ---")
    url = f"{BASE_URL}/v1/chat/completions"
    used_keys = []
    for i in range(8):
        payload = json.dumps({
            "model": "llama-3.1-8b-instant",
            "messages": [{"role": "user", "content": f"Ping {i}"}],
            "max_tokens": 5
        }).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            key_label = resp.headers.get("X-Taka-Key-Label")
            key_used = resp.headers.get("X-Taka-Key-Used")
            used_keys.append(f"{key_label} ({key_used})")
            print(f"Request #{i+1} handled by: {key_label} ({key_used})")
    print(f"Distinct keys used across 8 calls: {len(set(used_keys))}/8")

def test_stats():
    print("\n--- 5. Testing GET /api/stats & GET /api/keys ---")
    with urllib.request.urlopen(f"{BASE_URL}/api/stats") as resp:
        stats = json.loads(resp.read().decode())
        print("Stats:", json.dumps(stats.get("stats"), indent=2))
    with urllib.request.urlopen(f"{BASE_URL}/api/keys") as resp:
        keys_data = json.loads(resp.read().decode())
        print(f"Total keys registered: {len(keys_data.get('keys', []))}")

if __name__ == "__main__":
    print("Waiting for server...")
    time.sleep(2)
    test_models()
    test_chat_non_stream()
    test_chat_stream()
    test_rotation()
    test_stats()
    print("\n✅ ALL TESTS PASSED SUCCESSFULLY!")
