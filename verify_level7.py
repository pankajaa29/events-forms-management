import urllib.request
import json
import os
import urllib.parse
from urllib.error import HTTPError

def verify_level7():
    base_url = "http://localhost:8000/api"
    
    # 0. Setup Dummy File
    with open("test_upload.txt", "w") as f:
        f.write("This is a test upload file.")

    try:
        # 1. Login
        print("1. Logging in...")
        login_data = json.dumps({"username": "admin", "password": "admin123"}).encode('utf-8')
        req = urllib.request.Request(f"{base_url}/token/", data=login_data, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req) as resp:
            token = json.loads(resp.read().decode())['access']
        print("   Token obtained.")

        # 2. Create Advanced Form
        print("2. Creating Advanced Form...")
        form_data = {
            "title": "Level 7 Advanced Form",
            "sections": [{
                "title": "Feedback",
                "questions": [
                    {
                        "text": "Satisfaction",
                        "question_type": "slider",
                        "config": {"min": 0, "max": 10, "step": 1}
                    },
                    {
                        "text": "Rating",
                        "question_type": "rating",
                        "config": {"max_stars": 5}
                    },
                    {
                        "text": "Attachment",
                        "question_type": "file_upload"
                    }
                ]
            }]
        }
        
        req = urllib.request.Request(
            f"{base_url}/forms/", 
            data=json.dumps(form_data).encode(),
            headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
        )
        with urllib.request.urlopen(req) as resp:
            form = json.loads(resp.read().decode())
            form_id = form['id']
            qs = form['sections'][0]['questions']
            q_slider_id = qs[0]['id']
            q_rating_id = qs[1]['id']
            q_file_id = qs[2]['id']
        print(f"   Form Created: ID {form_id}")

        # 3. Upload File
        print("3. Uploading File...")
        # A bit complex to do multipart with urllib, using a boundary
        boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
        with open("test_upload.txt", "rb") as f:
            file_content = f.read()
            
        data = (
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="file"; filename="test_upload.txt"\r\n'
            f'Content-Type: text/plain\r\n\r\n'
        ).encode() + file_content + f'\r\n--{boundary}--\r\n'.encode()

        req = urllib.request.Request(
            f"{base_url}/responses/upload/", 
            data=data,
            headers={
                'Content-Type': f'multipart/form-data; boundary={boundary}',
                # 'Authorization': f'Bearer {token}' # AllowAny
            },
            method='POST'
        )
        with urllib.request.urlopen(req) as resp:
            upload_res = json.loads(resp.read().decode())
            file_url = upload_res['url']
        print(f"   File Uploaded: {file_url}")

        # 4. Submit Response
        print("4. Submitting Response...")
        response_data = {
            "form": form_id,
            "answers": [
                {"question": q_slider_id, "value": "8"},
                {"question": q_rating_id, "value": "5"},
                {"question": q_file_id, "value": file_url}
            ]
        }
        req = urllib.request.Request(
            f"{base_url}/responses/",
            data=json.dumps(response_data).encode(),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req) as resp:
            print("   Response Submitted.")

        # 5. Export CSV
        print("5. Verifying Data via CSV...")
        req = urllib.request.Request(
            f"{base_url}/responses/export_csv/?form={form_id}",
            headers={'Authorization': f'Bearer {token}'}
        )
        with urllib.request.urlopen(req) as resp:
            csv_content = resp.read().decode('utf-8')
            print("   CSV Content Preview:")
            print(csv_content)
            
            if "8" in csv_content and "5" in csv_content and "test_upload.txt" in csv_content:
                print("   SUCCESS: Advanced inputs and file URL present in CSV.")
            else:
                print("   FAILURE: Data missing from CSV.")

    except HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.reason}")
        print(e.read().decode())
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if os.path.exists("test_upload.txt"):
            os.remove("test_upload.txt")

if __name__ == "__main__":
    verify_level7()
