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

    # 1.5 Create Form
    print("Creating test form...")
    form_data = {
        "title": "Test Upload Form",
        "description": "Created by test script",
        "sections": [
            {
                "title": "Section 1",
                "description": "Test Section",
                "order": 0,
                "questions": [
                    {
                        "text": "Question 1",
                        "question_type": "short_text",
                        "is_required": False,
                        "order": 0,
                        "options": []
                    }
                ]
            }
        ]
    }
    create_resp = requests.post(f"{BASE_URL}/forms/", headers={'Authorization': f'Bearer {token}'}, json=form_data)
    if create_resp.status_code != 201:
        print(f"Failed to create form: {create_resp.text}")
        return
    
    FORM_ID = create_resp.json()['id']
    print(f"Created Form ID: {FORM_ID}")

    # 2. Upload
    print(f"Attempting POST upload to form {FORM_ID}...")
    headers = {'Authorization': f'Bearer {token}'}
    
    files = {
        'logo_image': ('test_logo.jpg', create_test_image(), 'image/jpeg')
    }
    
    try:
        response = requests.post(f"{BASE_URL}/forms/{FORM_ID}/upload_images/", headers=headers, files=files, timeout=10)
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
    except requests.exceptions.Timeout:
        print("ERROR: Request timed out!")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_upload()
