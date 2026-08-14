import urllib.request
import json
import traceback

BASE_URL = "http://localhost:3000"
API_KEY = "taka_live_e29d54a0a277890f0a1720fad57f12bf"

print(f"Testing key: {API_KEY}")

req = urllib.request.Request(
    f"{BASE_URL}/v1/chat/completions",
    data=json.dumps({
        "model": "taka-flash-8b",
        "messages": [{"role": "user", "content": "Hi"}],
        "max_tokens": 10
    }).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
)

try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        print(f"Status: {resp.status}")
        print(resp.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTPError {e.code}: {e.read().decode()}")
except Exception as e:
    traceback.print_exc()
