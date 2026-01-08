import urllib.request
import json
import urllib.error

def verify_level4_flow():
    base_url = "http://localhost:8000/api"
    
    # 1. Login (to create form)
    print("1. Login as Admin...")
    login_data = json.dumps({"username": "admin", "password": "admin123"}).encode('utf-8')
    req = urllib.request.Request(f"{base_url}/token/", data=login_data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        token = json.loads(resp.read().decode())['access']
    print("   Logged in.")

    # 2. Create Form
    print("2. Creating Survey Form...")
    form_data = {
        "title": "Customer Feedback",
        "sections": [{
            "title": "Feedback",
            "questions": [
                {"text": "Rate us", "question_type": "rating", "is_required": True},
                {"text": "Comments", "question_type": "long_text"}
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
        question_id = form['sections'][0]['questions'][0]['id']
    print(f"   Form Created: ID {form_id}")

    # 3. Public Submission (Anonymous)
    print("3. Submitting Anonymous Response...")
    response_data = {
        "form": form_id,
        "answers": [
            {"question": question_id, "value": "5 Stars"}
        ]
    }
    req = urllib.request.Request(
        f"{base_url}/responses/",
        data=json.dumps(response_data).encode(),
        headers={'Content-Type': 'application/json'} # No Auth Header!
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print("   Success! Response ID:", data['id'])
            print("   Answers:", data['answers'])
    except urllib.error.HTTPError as e:
        print("   Submission Failed:", e.read().decode())

if __name__ == "__main__":
    verify_level4_flow()
