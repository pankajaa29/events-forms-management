
import requests
import json

# Login to get token (assuming test user exists, otherwise will fail)
# If login fails, I'll need to handle that, but let's assume 'admin' 'admin' or similar for local dev?
# Better: Just try to update an existing form 33 if it exists, or create one.
# I'll rely on the existing auth token if I can, or just try to login.

BASE_URL = 'http://127.0.0.1:8000/api'

def test_crash():
    try:
        # 1. Login with known user
        print("Logging in as debug_user...")
        resp = requests.post(f"{BASE_URL}/token/", data={'username': 'debug_user', 'password': 'password123'})
        if resp.status_code != 200:
             print(f"Login failed: {resp.status_code} {resp.text}")
             return

        token = resp.json()['access']
        headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
        
        # 2. Create a form
        print("Creating form...")
        create_resp = requests.post(f"{BASE_URL}/forms/", json={"title": "Test Form", "sections": []}, headers=headers)
        if create_resp.status_code != 201:
             print(f"Create Failed: {create_resp.status_code} {create_resp.text}")
             return
             
        form_id = create_resp.json()['id']
        print(f"Form ID: {form_id}")

        # 3. PATCH causing 500
        payload = {
            "title": "Updated Title",
            "is_active": True,
            "expiry_at": None, 
            "inactive_message": "Closed.",
            "slug": f"my-slug-{form_id}" # Ensure unique
        }
        print(f"Sending PATCH to forms/{form_id}/")
        patch_resp = requests.patch(f"{BASE_URL}/forms/{form_id}/", json=payload, headers=headers)
        
        print(f"Status: {patch_resp.status_code}")
        if patch_resp.status_code == 500:
            # Print start of error to find exception type
            print("ERROR RESPONSE START:")
            import os
            print(f"CWD: {os.getcwd()}")
            with open("error.html", "w") as f:
                f.write(patch_resp.text)
            print(f"Saved error to {os.path.abspath('error.html')}")
        else:
            print("Success (or at least not 500)")
            print(patch_resp.text[:500])

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_crash()
