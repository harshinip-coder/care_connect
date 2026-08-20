import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'careconnect.settings')
django.setup()

from django.contrib.auth import authenticate
from accounts.models import User, Guardian, Volunteer, SecurityPersonnel

test_accounts = [
    ("Harshini", "Harshini@2008", "admin"),
    ("Deepan", "Harshini@2008", "resident"),
    ("Palanisamy", "Harshini@2008", "guardian"),
    ("Kavitha", "Harshini@2008", "guardian"),
    ("Gojo", "Harshini@2008", "security"),
    ("Sukuna", "Harshini@2008", "security"),
    ("Jinwoo", "Harshini@2008", "society_member"),
    ("ShinChan", "Harshini@2008", "volunteer"),
]

print("=== VERIFYING CREDENTIALS AND DASHBOARD ROUTING ===")

all_ok = True
for username, password, expected_role in test_accounts:
    user = authenticate(username=username, password=password)
    if user is not None:
        role_status = "OK" if user.role == expected_role else f"MISMATCH ({user.role} != {expected_role})"
        print(f"SUCCESS: Username '{username}' authenticated! Role: {user.role} ({role_status})")
        if user.role != expected_role:
            all_ok = False
    else:
        print(f"FAILURE: Username '{username}' failed authentication!")
        all_ok = False

print("\nTotal Users in DB:", User.objects.count())
print("Total Guardians in DB:", Guardian.objects.count())
print("Total Security Personnel in DB:", SecurityPersonnel.objects.count())
print("Total Volunteers in DB:", Volunteer.objects.count())

if all_ok:
    print("\nALL CREATED PROFILES ARE VERIFIED IN THE DATABASE AND CAN LOG IN SUCCESSFULLY!")
else:
    print("\nSOME LOGINS FAILED OR HAD MISMATCHES!")
