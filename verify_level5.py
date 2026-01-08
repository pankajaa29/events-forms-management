import urllib.request
import json
import urllib.error

def verify_level5_flow():
    base_url = "http://localhost:8000/api"
    
    # 1. Login as Admin
    print("1. Login as Admin...")
    login_data = json.dumps({"username": "admin", "password": "admin123"}).encode('utf-8')
    req = urllib.request.Request(f"{base_url}/token/", data=login_data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        token = json.loads(resp.read().decode())['access']
    print("   Logged in.")

    # 2. Create Form
    print("2. Creating Survey Form...")
    form_data = {
        "title": "Results Test Form",
        "sections": [{
            "title": "S1",
            "questions": [
                {"text": "Feedback", "question_type": "short_text"}
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

    # 3. Submit Anonymous Response
    print("3. Submitting Anonymous Response...")
    response_data = {
        "form": form_id,
        "answers": [
            {"question": question_id, "value": "Great service!"}
        ]
    }
    req = urllib.request.Request(
        f"{base_url}/responses/",
        data=json.dumps(response_data).encode(),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as resp:
        print("   Response Submitted.")

    # 4. Fetch Results (As Creator)
    print("4. Fetching Results as Creator...")
    req = urllib.request.Request(
        f"{base_url}/responses/?form={form_id}",
        headers={'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(req) as resp:
        results = json.loads(resp.read().decode())
        print(f"   Fetched {len(results)} responses.")
        if len(results) > 0:
            print(f"   First Answer: {results[0]['answers'][0]['value']}")
            print("   SUCCESS: Results retrieved correctly.")
        else:
            print("   FAILURE: No results found.")

if __name__ == "__main__":
    verify_level5_flow()
