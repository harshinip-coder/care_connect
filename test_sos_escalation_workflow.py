import os
import sys
import django
import datetime
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'careconnect.settings')
django.setup()

from accounts.models import User, Guardian, Volunteer, SecurityPersonnel
from emergency.models import EmergencyRequest, EmergencyNotification, EmergencyAuditLog
from emergency.services import (
    create_sos_incident,
    process_response,
    evaluate_emergency_timeouts,
    resolve_emergency_case
)
from emergency.views import serialize_emergency

print("==================================================")
print("TESTING CARECONNECT SOS ESCALATION ENGINE")
print("==================================================")

# 1. Load users from database (seeded via seed_profiles.py)
deepan = User.objects.get(username="Deepan")
palanisamy = User.objects.get(username="Palanisamy")
kavitha = User.objects.get(username="Kavitha")
jinwoo = User.objects.get(username="Jinwoo")
shinchan = User.objects.get(username="ShinChan")
gojo = User.objects.get(username="Gojo")
harshini = User.objects.get(username="Harshini")

print(f"Deepan (Resident): {deepan.id}")
print(f"Palanisamy (Primary Guardian): {palanisamy.id}")
print(f"Kavitha (Secondary Guardian): {kavitha.id}")
print(f"Jinwoo (Society Member): {jinwoo.id}")
print(f"ShinChan (Volunteer): {shinchan.id}")
print(f"Gojo (Security): {gojo.id}")
print(f"Harshini (Admin): {harshini.id}")

# Clear any existing unresolved emergencies for Deepan for a clean test
EmergencyRequest.objects.filter(resident=deepan).exclude(status='RESOLVED').update(status='CANCELLED')

# TEST SCENARIO A: Deepan triggers SOS -> Primary Guardian (Palanisamy) declines -> Escalates to Secondary Guardian (Kavitha) -> Kavitha Accepts!
print("\n--- TEST SCENARIO A: DECLINE & ESCALATE TO KAVITHA ---")

sos_a, created = create_sos_incident(
    resident=deepan,
    emergency_type="Medical Emergency",
    description="Test SOS for Kavitha response"
)

print(f"SOS Created: ID #{sos_a.id}, Status: {sos_a.status}, Active Stage: {sos_a.active_escalation_level}")
assert sos_a.status == "NOTIFYING_PRIMARY_GUARDIAN"
assert sos_a.active_escalation_level == "PRIMARY_GUARDIAN"

# Verify Palanisamy can respond, Kavitha cannot respond yet
serialized_pal = serialize_emergency(sos_a, palanisamy)
serialized_kav = serialize_emergency(sos_a, kavitha)
print(f"Palanisamy can_respond at Stage 1: {serialized_pal['can_respond']}")
print(f"Kavitha can_respond at Stage 1: {serialized_kav['can_respond']}")

assert serialized_pal['can_respond'] is True, "Primary Guardian should be allowed to respond at Stage 1"
assert serialized_kav['can_respond'] is False, "Secondary Guardian should NOT be allowed to respond at Stage 1"

# Palanisamy declines SOS
success, msg, sos_a, res_status = process_response(sos_a.id, palanisamy, "REJECT")
print(f"Palanisamy Decline Response: success={success}, msg='{msg}', status='{sos_a.status}', active_stage='{sos_a.active_escalation_level}'")
assert sos_a.status == "NOTIFYING_SECONDARY_GUARDIAN"
assert sos_a.active_escalation_level == "SECONDARY_GUARDIAN"

# Now verify Kavitha can respond at Stage 2!
serialized_kav_st2 = serialize_emergency(sos_a, kavitha)
print(f"Kavitha can_respond at Stage 2: {serialized_kav_st2['can_respond']}")
assert serialized_kav_st2['can_respond'] is True, "Kavitha (Secondary Guardian) MUST be allowed to respond at Stage 2!"

# Kavitha accepts SOS
success, msg, sos_a, res_status = process_response(sos_a.id, kavitha, "ACCEPT")
print(f"Kavitha Accept Response: success={success}, msg='{msg}', status='{sos_a.status}', assigned_responder='{sos_a.assigned_responder.username}'")
assert sos_a.status == "RESPONDING"
assert sos_a.assigned_responder == kavitha

# Resolve emergency
success, msg, sos_a = resolve_emergency_case(sos_a.id, kavitha, "Handled safely by Kavitha")
print(f"Resolve Emergency: success={success}, status='{sos_a.status}'")
assert sos_a.status == "RESOLVED"


# TEST SCENARIO B: Full Timeout Escalation Sequence across all 6 tiers!
print("\n--- TEST SCENARIO B: TIMEOUT ESCALATION ACROSS ALL TIERS ---")

sos_b, created = create_sos_incident(
    resident=deepan,
    emergency_type="Fire",
    description="Test 6-Tier Timeout Escalation"
)
print(f"SOS B Created: ID #{sos_b.id}, Stage 1: {sos_b.active_escalation_level}")
assert sos_b.active_escalation_level == "PRIMARY_GUARDIAN"

# Simulate timeout at Stage 1 (Primary Guardian)
notif_1 = sos_b.notifications.filter(status='PENDING').first()
notif_1.timeout_at = timezone.now() - datetime.timedelta(seconds=1)
notif_1.save()

evaluate_emergency_timeouts(sos_b)
sos_b.refresh_from_db()
print(f"After Stage 1 Timeout -> Stage: {sos_b.active_escalation_level}, Status: {sos_b.status}")
assert sos_b.active_escalation_level == "SECONDARY_GUARDIAN"

# Simulate timeout at Stage 2 (Secondary Guardian - Kavitha)
notif_2 = sos_b.notifications.filter(status='PENDING').first()
notif_2.timeout_at = timezone.now() - datetime.timedelta(seconds=1)
notif_2.save()

evaluate_emergency_timeouts(sos_b)
sos_b.refresh_from_db()
print(f"After Stage 2 Timeout -> Stage: {sos_b.active_escalation_level}, Status: {sos_b.status}")
assert sos_b.active_escalation_level == "SOCIETY_MEMBER"

# Verify Jinwoo (Society Member) can respond at Stage 3
serialized_jinwoo = serialize_emergency(sos_b, jinwoo)
assert serialized_jinwoo['can_respond'] is True, "Society Member should be allowed to respond at Stage 3"

# Simulate timeout at Stage 3 (Society Member)
notif_3 = sos_b.notifications.filter(status='PENDING').first()
notif_3.timeout_at = timezone.now() - datetime.timedelta(seconds=1)
notif_3.save()

evaluate_emergency_timeouts(sos_b)
sos_b.refresh_from_db()
print(f"After Stage 3 Timeout -> Stage: {sos_b.active_escalation_level}, Status: {sos_b.status}")
assert sos_b.active_escalation_level == "SECURITY"

# Verify Gojo (Security) can respond at Stage 4
serialized_sec = serialize_emergency(sos_b, gojo)
assert serialized_sec['can_respond'] is True, "Security should be allowed to respond at Stage 4"

# Simulate timeout at Stage 4 (Security)
notif_4 = sos_b.notifications.filter(status='PENDING').first()
notif_4.timeout_at = timezone.now() - datetime.timedelta(seconds=1)
notif_4.save()

evaluate_emergency_timeouts(sos_b)
sos_b.refresh_from_db()
print(f"After Stage 4 Timeout -> Stage: {sos_b.active_escalation_level}, Status: {sos_b.status}")
assert sos_b.active_escalation_level == "VOLUNTEER"

# Verify ShinChan (Volunteer) can respond at Stage 5
serialized_vol = serialize_emergency(sos_b, shinchan)
assert serialized_vol['can_respond'] is True, "Volunteer should be allowed to respond at Stage 5"

# Simulate timeout at Stage 5 (Volunteer)
notif_5 = sos_b.notifications.filter(status='PENDING').first()
notif_5.timeout_at = timezone.now() - datetime.timedelta(seconds=1)
notif_5.save()

evaluate_emergency_timeouts(sos_b)
sos_b.refresh_from_db()
print(f"After Stage 5 Timeout -> Stage: {sos_b.active_escalation_level}, Status: {sos_b.status}")
assert sos_b.active_escalation_level == "ADMIN"
assert sos_b.status == "ESCALATED"

# Verify Admin (Harshini) can respond at Stage 6
serialized_admin = serialize_emergency(sos_b, harshini)
assert serialized_admin['can_respond'] is True, "Admin should be allowed to respond at Stage 6"

# Admin resolves emergency
success, msg, sos_b = resolve_emergency_case(sos_b.id, harshini, "Admin resolved escalated emergency")
assert sos_b.status == "RESOLVED"

print("\n==================================================")
print("ALL SOS ESCALATION STATE MACHINE TESTS PASSED 100%!")
print("==================================================")
