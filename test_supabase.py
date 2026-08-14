import os
import urllib.request
import json

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://oetjhxllyzjczbcthlfo.supabase.co")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SERVICE_KEY:
    # Read from .env.local if present
    if os.path.exists(".env.local"):
        with open(".env.local") as f:
            for line in f:
                if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                    SERVICE_KEY = line.split("=", 1)[1].strip()

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json"
}

print("1. Checking groq_keys table...")
req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/groq_keys?select=*", headers=headers)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        keys = json.loads(resp.read().decode())
        print(f"Success! Found {len(keys)} keys in Supabase:")
        for k in keys:
            masked = k.get('api_key', '')[:8] + '...'
            print(f" - {k.get('label')}: {masked} (Active: {k.get('is_active')}, Requests: {k.get('total_requests')})")
except Exception as e:
    print(f"Table error: {e}")

print("\n2. Testing get_next_groq_key RPC...")
req_rpc = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/rpc/get_next_groq_key", data=b"{}", headers=headers)
try:
    with urllib.request.urlopen(req_rpc, timeout=10) as resp:
        res = json.loads(resp.read().decode())
        print(f"RPC Success! Selected key ID: {res[0].get('id') if res else 'None'}")
except Exception as e:
    print(f"RPC error: {e}")
