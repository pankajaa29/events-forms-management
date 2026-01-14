
import requests
import json

BASE_URL = 'http://127.0.0.1:8000/api'

def check_status():
    try:
        # 1. Login
        resp = requests.post(f"{BASE_URL}/token/", data={'username': 'debug_user', 'password': 'password123'})
        if resp.status_code != 200:
             print("Login failed")
             return

        token = resp.json()['access']
        headers = {'Authorization': f'Bearer {token}'}
        
        # 2. Get Form 33
        print("Fetching Form 33...")
        # Note: If 33 doesn't exist, I might fail, but user said "forms/33".
        # If it doesn't exist (deleted?), I'll check my created form 36.
        # But let's try 33 first.
        try:
            get_resp = requests.get(f"{BASE_URL}/forms/33/", headers=headers)
            if get_resp.status_code == 200:
                data = get_resp.json()
                print(f"Form 33 ID: {data.get('id')}")
                print(f"is_active: {data.get('is_active')} (Type: {type(data.get('is_active'))})")
                print(f"expiry_at: {data.get('expiry_at')}")
            else:
                 print(f"Form 33 Fetch Failed: {get_resp.status_code}")
                 
        except Exception as e:
            print(f"Request Error: {e}")

    except Exception as e:
        print(e)

if __name__ == "__main__":
    check_status()
