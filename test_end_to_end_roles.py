import os
import sys
import json
import urllib.request
import urllib.parse
import http.cookiejar

API_BASE_URL = "http://127.0.0.1:8000"

print("==================================================")
print("RUNNING CARECONNECT E2E COMPREHENSIVE TEST SUITE")
print("==================================================")

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def request_json(url, data=None, method="GET"):
    req = urllib.request.Request(url, method=method)
    req.add_header("Accept", "application/json")
    if data is not None:
        req.add_header("Content-Type", "application/json")
        encoded_data = json.dumps(data).encode("utf-8")
    else:
        encoded_data = None
    
    try:
        res = opener.open(req, data=encoded_data)
        body = res.read().decode("utf-8")
        return res.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}

# 1. Test /api/auth/me/ unauthenticated
status, res = request_json(f"{API_BASE_URL}/api/auth/me/")
print(f"[1] GET /api/auth/me/ (unauthenticated): status={status}, res={res}")
assert res.get("authenticated") is False or status == 401, "Unauthenticated /api/auth/me/ failed"

# 2. Test Admin Registration Blocking
status, res = request_json(f"{API_BASE_URL}/api/auth/register/", {"username": "fake_admin", "password": "Password@123", "role": "admin"}, method="POST")
print(f"[2] Admin Public Registration Block: status={status}, res={res}")
assert status == 400 and res.get("success") is False, "Public admin registration should be blocked"

# 3. Test Public Registration for Volunteer & Security
import time
ts = int(time.time())
vol_username = f"e2e_vol_{ts}"
sec_username = f"e2e_sec_{ts}"

test_volunteer_data = {
    "username": vol_username,
    "password": "Password@123",
    "role": "volunteer",
    "first_name": "E2E",
    "last_name": "Volunteer",
    "email": f"e2evol_{ts}@example.com",
    "phone": f"9{ts % 1000000000:09d}"
}
status, res = request_json(f"{API_BASE_URL}/api/auth/register/", test_volunteer_data, method="POST")
print(f"[3a] Register Volunteer: status={status}, res={res}")
assert status == 201 and res.get("success") is True, "Volunteer registration failed"
assert res["user"]["role"] == "volunteer", "User role in registration response is not volunteer"

test_security_data = {
    "username": sec_username,
    "password": "Password@123",
    "role": "security",
    "first_name": "E2E",
    "last_name": "Officer",
    "email": f"e2esec_{ts}@example.com",
    "phone": f"8{ts % 1000000000:09d}"
}

status, res = request_json(f"{API_BASE_URL}/api/auth/register/", test_security_data, method="POST")
print(f"[3b] Register Security: status={status}, res={res}")
assert status == 201 and res.get("success") is True, "Security registration failed"
assert res["user"]["role"] == "security", "User role in registration response is not security"

# 4. Test Login for Existing & New Accounts
accounts_to_test = [
    ("Harshini", "Harshini@2008", "admin"),
    ("Deepan", "Harshini@2008", "resident"),
    ("Kavitha", "Harshini@2008", "guardian"),
    ("Gojo", "Harshini@2008", "security"),
    ("ShinChan", "Harshini@2008", "volunteer"),
    ("Jinwoo", "Harshini@2008", "society_member"),
    (vol_username, "Password@123", "volunteer"),
    (sec_username, "Password@123", "security")
]


print("\n--- TESTING LOGINS & SESSIONS ---")
for uname, pwd, expected_role in accounts_to_test:
    # Clear cookies before each login
    cj.clear()
    status, login_res = request_json(f"{API_BASE_URL}/api/auth/login/", {"username": uname, "password": pwd}, method="POST")
    print(f"Login '{uname}': status={status}, role={login_res.get('user', {}).get('role')}")
    assert status == 200 and login_res.get("success") is True, f"Login failed for {uname}"
    assert login_res["user"]["role"] == expected_role, f"Role mismatch for {uname}: {login_res['user']['role']} != {expected_role}"

    # Verify session via /api/auth/me/
    status, me_res = request_json(f"{API_BASE_URL}/api/auth/me/")
    assert me_res.get("authenticated") is True, f"/api/auth/me/ not authenticated for {uname}"
    assert me_res["user"]["role"] == expected_role, f"/api/auth/me/ role mismatch for {uname}"

    # Verify Logout
    status, logout_res = request_json(f"{API_BASE_URL}/api/auth/logout/", method="POST")
    assert logout_res.get("success") is True, f"Logout failed for {uname}"

print("\nALL CARECONNECT BACKEND & AUTH TESTS PASSED SUCCESSFULLY!")
