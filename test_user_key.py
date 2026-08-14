import urllib.request
import json

BASE_URL = "http://localhost:3000"
API_KEY = "taka_live_e29d54a0a277890f0a1720fad57f12bf"

print(f"Testing Taka AI Gateway with user's key: {API_KEY}")

req = urllib.request.Request(
    f"{BASE_URL}/v1/chat/completions",
    data=json.dumps({
        "model": "taka-search-v1",
        "messages": [{"role": "user", "content": "What is the latest world news today?"}],
        "max_tokens": 50
    }).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
)

try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        res = json.loads(resp.read().decode())
        print("Success! Response:")
        print(res['choices'][0]['message']['content'])
        print(f"Model: {res.get('model')}")
        print(f"Headers: {dict(resp.headers)}")
except Exception as e:
    print(f"Error: {e}")
