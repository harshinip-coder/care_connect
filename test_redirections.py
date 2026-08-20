import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'careconnect.settings')
django.setup()

from django.contrib.auth import authenticate
from accounts.models import User

test_cases = [
    ("Harshini", "Harshini@2008", "admin_dashboard"),
    ("harshini", "Harshini@2008", "admin_dashboard"),
    ("Deepan", "Harshini@2008", "resident_dashboard"),
    ("deepan", "Harshini@2008", "resident_dashboard"),
    ("Palanisamy", "Harshini@2008", "guardian_dashboard"),
    ("palanisamy", "Harshini@2008", "guardian_dashboard"),
    ("Kavitha", "Harshini@2008", "guardian_dashboard"),
    ("kavitha", "Harshini@2008", "guardian_dashboard"),
    ("Gojo", "Harshini@2008", "security_dashboard"),
    ("gojo", "Harshini@2008", "security_dashboard"),
    ("Sukuna", "Harshini@2008", "security_dashboard"),
    ("sukuna", "Harshini@2008", "security_dashboard"),
    ("Jinwoo", "Harshini@2008", "society_member_dashboard"),
    ("jinwoo", "Harshini@2008", "society_member_dashboard"),
    ("ShinChan", "Harshini@2008", "volunteer_dashboard"),
    ("shinchan", "Harshini@2008", "volunteer_dashboard"),
]

def simulate_login(username_input, password):
    user = authenticate(username=username_input, password=password)
    if user is None:
        if "@" in username_input:
            u_obj = User.objects.filter(email__iexact=username_input).first()
        else:
            u_obj = User.objects.filter(username__iexact=username_input).first()
        if u_obj:
            user = authenticate(username=u_obj.username, password=password)
    
    if user is None:
        return "FAILED_AUTH", None
    
    role = user.role.lower() if user.role else ('admin' if user.is_superuser else 'resident')
    if role == "admin" or user.is_superuser:
        target = "admin_dashboard"
    elif role == "resident":
        target = "resident_dashboard"
    elif role == "guardian":
        target = "guardian_dashboard"
    elif role == "society_member":
        target = "society_member_dashboard"
    elif role == "security":
        target = "security_dashboard"
    elif role == "volunteer":
        target = "volunteer_dashboard"
    else:
        target = "dashboard"
        
    return target, user

print("=== TESTING ROLE-BASED LOGIN REDIRECTION ===")
all_passed = True
for uname, pwd, expected_target in test_cases:
    target, u = simulate_login(uname, pwd)
    status = "PASS" if target == expected_target else "FAIL"
    if status == "FAIL":
        all_passed = False
    print(f"[{status}] Input: '{uname}' -> Logged as: {u.username if u else 'None'} (Role: {u.role if u else 'None'}) -> Redirect: {target} (Expected: {expected_target})")

if all_passed:
    print("\nALL LOGIN REDIRECTIONS PASSED PERFECTLY!")
else:
    print("\nSOME REDIRECTIONS FAILED!")
