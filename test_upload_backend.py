import requests
import os
from io import BytesIO
from PIL import Image

# Config
BASE_URL = 'http://localhost:8000/api'
USERNAME = 'testadmin'
PASSWORD = 'testpass' # Created via shell
FORM_ID = 21 # From user log

def create_test_image():
    file = BytesIO()
    image = Image.new('RGB', (100, 100), color='red')
    image.save(file, 'jpeg')
    file.seek(0)
    return file

def test_upload():
    # 1. Login
    print(f"Logging in as {USERNAME}...")
    try:
        auth_resp = requests.post(f"{BASE_URL}/token/", data={'username': USERNAME, 'password': PASSWORD})
        if auth_resp.status_code != 200:
            print(f"Login failed: {auth_resp.text}")
            return
        token = auth_resp.json()['access']
        print("Login successful.")
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    # 2. Upload
    print(f"Attempting PATCH upload to form {FORM_ID}...")
    headers = {'Authorization': f'Bearer {token}'}
    
    files = {
        'logo_image': ('test_logo.jpg', create_test_image(), 'image/jpeg')
    }
    
    try:
        response = requests.patch(f"{BASE_URL}/forms/{FORM_ID}/", headers=headers, files=files, timeout=10)
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
    except requests.exceptions.Timeout:
        print("ERROR: Request timed out!")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_upload()
