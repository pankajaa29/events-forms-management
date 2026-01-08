import urllib.request
import json
import urllib.parse

def verify_level6():
    base_url = "http://localhost:8000/api"
    
    # 1. Login
    print("1. Logging in...")
    login_data = json.dumps({"username": "admin", "password": "admin123"}).encode('utf-8')
    req = urllib.request.Request(f"{base_url}/token/", data=login_data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        token = json.loads(resp.read().decode())['access']
    print("   Token obtained.")

    # 2. Create Complex Form (Radio + Checkbox)
    print("2. Creating Complex Form...")
    form_data = {
        "title": "Level 6 Test Form",
        "sections": [{
            "title": "Preferences",
            "questions": [
                {
                    "text": "Favorite Color",
                    "question_type": "radio",
                    "options": [{"text": "Red"}, {"text": "Blue"}]
                },
                {
                    "text": "Hobbies",
                    "question_type": "checkbox",
                    "options": [{"text": "Coding"}, {"text": "Gaming"}, {"text": "Reading"}]
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
        q_radio_id = form['sections'][0]['questions'][0]['id']
        q_check_id = form['sections'][0]['questions'][1]['id']
    print(f"   Form Created: ID {form_id}")

    # 3. Submit Response
    print("3. Submitting Response...")
    response_data = {
        "form": form_id,
        "answers": [
            {"question": q_radio_id, "value": "Blue"},
            {"question": q_check_id, "value": "Coding,Gaming"}
        ]
    }
    req = urllib.request.Request(
        f"{base_url}/responses/",
        data=json.dumps(response_data).encode(),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as resp:
        print("   Response Submitted.")

    # 4. Export CSV
    print("4. Testing CSV Export...")
    req = urllib.request.Request(
        f"{base_url}/responses/export_csv/?form={form['id']}",
        headers={'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(req) as resp:
        csv_content = resp.read().decode('utf-8')
        print("   CSV Content Preview:")
        print(csv_content)
        
        if "Favorite Color" in csv_content and "Hobbies" in csv_content:
            print("   SUCCESS: CSV contains correct headers.")
        else:
            print("   FAILURE: CSV headers missing.")
            
        if "Blue" in csv_content and "Coding,Gaming" in csv_content:
             print("   SUCCESS: CSV contains answer data.")
        else:
             print("   FAILURE: Answer data missing.")

if __name__ == "__main__":
    verify_level6()
