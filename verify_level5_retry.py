import urllib.request
import json
import urllib.error
import time

def verify_level5_retry():
    base_url = "http://localhost:8000/api"
    
    # 1. Login
    print("1. Logging in...")
    login_data = json.dumps({"username": "admin", "password": "admin123"}).encode('utf-8')
    req = urllib.request.Request(f"{base_url}/token/", data=login_data, headers={'Content-Type': 'application/json'})
    
    token = None
    try:
        with urllib.request.urlopen(req) as resp:
            token = json.loads(resp.read().decode())['access']
            print("   Token obtained.")
    except Exception as e:
        print("   Login Failed:", e)
        return

    # 2. Check Responses for Form 7 (from previous run)
    print("2. Checking results for Form 7...")
    headers = {'Authorization': f'Bearer {token}'}
    req = urllib.request.Request(f"{base_url}/responses/?form=7", headers=headers)
    
    try:
        with urllib.request.urlopen(req) as resp:
            print("   Response Code:", resp.getcode())
            data = resp.read().decode()
            print("   Data:", data)
    except urllib.error.HTTPError as e:
        print("   Fetch Failed:", e.code, e.read().decode())
    except Exception as e:
        print("   Connection Error:", e)

if __name__ == "__main__":
    verify_level5_retry()
