import os
import urllib.request
import json

SUPABASE_URL = "https://oetjhxllyzjczbcthlfo.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldGpoeGxseXpqY3piY3RobGZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY4ODk5NywiZXhwIjoyMTAyMjY0OTk3fQ.f6QMeO05mxQILljhLnwj9bE028GdItAQWFjkiKah3Kc"

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json"
}

print("1. Checking if 'access_codes' table exists in user's Supabase...")
req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/access_codes?select=*", headers=headers)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        print(f"Table exists! Found {len(data)} access codes in Supabase:")
        for c in data:
            print(f" - Code: {c.get('code')}, Used: {c.get('is_used')}, OneTime: {c.get('is_one_time')}")
except urllib.error.HTTPError as e:
    print(f"HTTPError {e.code}: {e.read().decode()}")
except Exception as e:
    print(f"Error: {e}")

print("\n2. Checking RPC verify_and_consume_access_code in Supabase...")
req_rpc = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/rpc/verify_and_consume_access_code",
    data=json.dumps({"input_code": "TAKA-VIP-8899"}).encode("utf-8"),
    headers=headers
)
try:
    with urllib.request.urlopen(req_rpc, timeout=10) as resp:
        res = json.loads(resp.read().decode())
        print(f"RPC Response: {res}")
except urllib.error.HTTPError as e:
    print(f"RPC HTTPError {e.code}: {e.read().decode()}")
except Exception as e:
    print(f"RPC Error: {e}")
