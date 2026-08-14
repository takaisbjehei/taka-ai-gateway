import urllib.request
import json
import sys

BASE_URL = "http://localhost:3000"
API_KEY = "taka_live_13976afc40529f16a3bf25b5465438cc"

req = urllib.request.Request(
    f"{BASE_URL}/v1/chat/completions",
    data=json.dumps({
        "model": "taka-search-v1",
        "messages": [{"role": "user", "content": "Who created you and what is your name?"}],
        "max_tokens": 60
    }).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
)

with urllib.request.urlopen(req, timeout=15) as resp:
    res = json.loads(resp.read().decode())
    content = res['choices'][0]['message']['content']
    sys.stdout.buffer.write(content.encode('utf-8'))
    sys.stdout.buffer.write(b"\n")
    print(f"Model ID in response: {res.get('model')}")
