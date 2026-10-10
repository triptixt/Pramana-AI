import requests
import json

BASE_URL = "http://127.0.0.1:8000"
PASSWORD = "Admin@123"

USERS = [
    {"email": "yashi@abc.com", "role": "ciso", "org_id": 9, "name": "Yashi"},
    {"email": "prateek@abc.com", "role": "grc", "org_id": 9, "name": "Prateek"},
    {"email": "ravi@abc.com", "role": "control_owner", "org_id": 9, "name": "Ravi"},
    {"email": "rose@abc.com", "role": "internal_auditor", "org_id": 9, "name": "ROSE"},
    {"email": "david@abc.com", "role": "external_auditor", "org_id": 9, "name": "David"},
    {"email": "harsh@abc.com", "role": "evidence_contributor", "org_id": 9, "name": "Harsh"},
    {"email": "tripti@abc.com", "role": "executive", "org_id": 9, "name": "tripti"},
    {"email": "admin@pramana.ai", "role": "super_admin", "org_id": 1, "name": "Super Admin"}
]

def run_tests():
    print("================================================================================")
    print("  PRAMANA MULTI-USER REAL-TIME CONNECTED DATA FLOW VERIFICATION (POSTGRESQL)")
    print("================================================================================")

    tokens = {}
    
    # 1. Login all users
    for u in USERS:
        pwd = "admin123" if u["email"] == "admin@pramana.ai" else "Admin@123"
        res = requests.post(f"{BASE_URL}/auth/login", json={"email": u["email"], "password": pwd})
        if res.status_code == 200:
            token = res.json().get("access_token")
            tokens[u["email"]] = token
            print(f" [+] Login Successful: {u['email']:<20} ({u['role']:<20}) -> Token acquired")
        else:
            print(f" [-] Login FAILED for {u['email']}: {res.status_code} - {res.text}")
            return

    print("\n--------------------------------------------------------------------------------")
    print("  TESTING TENANT ORG 9 ('ABC TECH') DATA CONSISTENCY ACROSS ALL USERS")
    print("--------------------------------------------------------------------------------")

    endpoints_to_test = [
        ("Frameworks Catalog", f"{BASE_URL}/compliance/frameworks"),
        ("Organization Controls", f"{BASE_URL}/compliance/organization-controls"),
        ("Evidence Library", f"{BASE_URL}/evidence/?organization_id=9"),
        ("Gap Analysis", f"{BASE_URL}/gap-analysis/?organization_id=9"),
        ("Audit Logs", f"{BASE_URL}/audit-logs/?organization_id=9"),
        ("System Frameworks", f"{BASE_URL}/frameworks/"),
    ]

    abc_users = [u for u in USERS if u["org_id"] == 9]
    
    for label, url in endpoints_to_test:
        print(f"\n[Page/Module: {label}] Endpoint: {url}")
        reference_data = None
        reference_user = None
        all_consistent = True

        for u in abc_users:
            headers = {"Authorization": f"Bearer {tokens[u['email']]}"}
            res = requests.get(url, headers=headers)
            
            if res.status_code == 200:
                data = res.json()
                data_summary = len(data) if isinstance(data, list) else (list(data.keys()) if isinstance(data, dict) else type(data))
                
                # Check consistency
                data_repr = json.dumps(data, sort_keys=True)
                if reference_data is None:
                    reference_data = data_repr
                    reference_user = u["email"]
                    print(f"   [OK] {u['email']:<20} ({u['role']:<20}): Status 200 | Items: {data_summary}")
                else:
                    if data_repr == reference_data:
                        print(f"   [OK] {u['email']:<20} ({u['role']:<20}): Status 200 | Items: {data_summary} [MATCHES {reference_user}]")
                    else:
                        print(f"   [!]  {u['email']:<20} ({u['role']:<20}): Status 200 | Data differs from {reference_user}")
                        all_consistent = False
            else:
                print(f"   [X]  {u['email']:<20} ({u['role']:<20}): Status {res.status_code} | {res.text[:80]}")
                all_consistent = False

        if all_consistent:
            print(f" ==> VERDICT: All {len(abc_users)} users in Org 9 see IDENTICAL live data for '{label}'.")
        else:
            print(f" ==> VERDICT: Differences or errors observed across users for '{label}'.")

    # 2. Test Super Admin isolation / platform overview
    print("\n--------------------------------------------------------------------------------")
    print("  TESTING SUPER ADMIN PERMISSIONS & WORKSPACE")
    print("--------------------------------------------------------------------------------")
    admin_token = tokens["admin@pramana.ai"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    admin_endpoints = [
        ("Platform Overview", f"{BASE_URL}/platform/overview"),
        ("All Organizations", f"{BASE_URL}/organizations/"),
        ("All Users", f"{BASE_URL}/users/"),
        ("Frameworks Catalog", f"{BASE_URL}/frameworks/"),
    ]
    for label, url in admin_endpoints:
        res = requests.get(url, headers=admin_headers)
        if res.status_code == 200:
            print(f"   [OK] Super Admin ({label}): Status 200 | Response count/keys: {len(res.json()) if isinstance(res.json(), list) else list(res.json().keys())}")
        else:
            print(f"   [X]  Super Admin ({label}): Status {res.status_code} | {res.text}")

    print("\n================================================================================")
    print("  DATA FLOW & REVENUE/AUDIT TRAIL SYNCHRONIZATION TEST COMPLETE")
    print("================================================================================")

if __name__ == "__main__":
    run_tests()
