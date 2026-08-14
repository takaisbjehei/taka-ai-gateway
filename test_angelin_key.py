import urllib.request
import json

BASE_URL = "https://taka-ai-gateway.vercel.app"
API_KEY = "taka_live_13976afc40529f16a3bf25b5465438cc"

print(f"Testing Taka Gateway with key: {API_KEY}")

req = urllib.request.Request(
    f"{BASE_URL}/v1/chat/completions",
    data=json.dumps({
        "model": "taka-flash-8b",
        "messages": [{"role": "user", "content": "Say hello!"}],
        "max_tokens": 15
    }).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
)

try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        res = json.loads(resp.read().decode())
        print("Success! Gateway response:")
        print(res['choices'][0]['message']['content'])
        print(f"Model: {res.get('model')}")
except Exception as e:
    print(f"Error: {e}")
