import json
from django.test import TestCase, Client
from django.utils import timezone
from accounts.models import User, Guardian, Volunteer, SecurityPersonnel
from societies.models import Society, Block, Flat
from emergency.models import EmergencyRequest, EmergencyNotification, EmergencyAuditLog
from notifications.models import Notification
from emergency.services import evaluate_emergency_timeouts, advance_escalation_chain


class EmergencyWorkflowTests(TestCase):

    def setUp(self):
        # Create Societies
        self.society_a = Society.objects.create(name="Green Valley", address="123 Main St", city="Metropolis", state="NY", pincode="10001")
        self.society_b = Society.objects.create(name="Blue Haven", address="456 Ocean Ave", city="Metropolis", state="NY", pincode="10002")

        self.block_a = Block.objects.create(society=self.society_a, block_name="A", total_floors=5)
        self.flat_101 = Flat.objects.create(block=self.block_a, flat_number="101", floor=1, occupied=True)

        # Create Resident A (Society A)
        self.resident_a = User.objects.create_user(
            username="resident_a", password="pass123", role="resident",
            first_name="Deepan", last_name="P", email="resident_a@test.com",
            society=self.society_a, block=self.block_a, flat=self.flat_101
        )

        # Create Resident B (Society B)
        self.resident_b = User.objects.create_user(
            username="resident_b", password="pass123", role="resident",
            first_name="Alice", last_name="B", email="resident_b@test.com",
            society=self.society_b
        )

        # Create Primary Guardian for Resident A
        self.primary_guardian_user = User.objects.create_user(
            username="guardian_primary", password="pass123", role="guardian",
            first_name="Palanisamy", last_name="M", email="palanisamy@test.com"
        )
        self.primary_guardian_link = Guardian.objects.create(
            user=self.primary_guardian_user, resident=self.resident_a,
            first_name="Palanisamy", last_name="M", email="palanisamy@test.com",
            is_primary=True, relationship="Father"
        )

        # Create Secondary Guardian for Resident A
        self.secondary_guardian_user = User.objects.create_user(
            username="guardian_secondary", password="pass123", role="guardian",
            first_name="Kavitha", last_name="P", email="kavitha@test.com"
        )
        self.secondary_guardian_link = Guardian.objects.create(
            user=self.secondary_guardian_user, resident=self.resident_a,
            first_name="Kavitha", last_name="P", email="kavitha@test.com",
            is_primary=False, relationship="Mother"
        )

        # Create Society Member A (Society A)
        self.member_a = User.objects.create_user(
            username="member_a", password="pass123", role="society_member",
            first_name="Jinwoo", last_name="S", email="member_a@test.com",
            society=self.society_a
        )

        # Create Society Member B (Society B)
        self.member_b = User.objects.create_user(
            username="member_b", password="pass123", role="society_member",
            first_name="Gojo", last_name="S", email="member_b@test.com",
            society=self.society_b
        )

        # Create Volunteer A (Society A)
        self.volunteer_a_user = User.objects.create_user(
            username="volunteer_a", password="pass123", role="volunteer",
            first_name="ShinChan", last_name="N", email="volunteer_a@test.com",
            society=self.society_a
        )
        self.volunteer_a_obj = Volunteer.objects.create(
            user=self.volunteer_a_user, first_name="ShinChan", last_name="N",
            email="volunteer_a@test.com", phone="1234567890", society=self.society_a
        )

        # Create Volunteer B (Society B)
        self.volunteer_b_user = User.objects.create_user(
            username="volunteer_b", password="pass123", role="volunteer",
            first_name="Jinwoo", last_name="V", email="volunteer_b@test.com",
            society=self.society_b
        )

        # Create Security A (Society A)
        self.security_a_user = User.objects.create_user(
            username="security_a", password="pass123", role="security",
            first_name="Sukuna", last_name="R", email="security_a@test.com",
            society=self.society_a
        )
        self.security_a_obj = SecurityPersonnel.objects.create(
            user=self.security_a_user, first_name="Sukuna", last_name="R",
            email="security_a@test.com", phone="9876543210", society=self.society_a
        )

        # Create Admin
        self.admin_user = User.objects.create_user(
            username="admin_user", password="pass123", role="admin", is_staff=True, is_superuser=True,
            first_name="Harshini", last_name="P", email="admin@test.com"
        )

        self.client = Client()

    def test_01_resident_creates_sos(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({"emergency_type": "Medical", "description": "Chest pain"}), content_type="application/json")
        self.assertIn(res.status_code, [200, 201])
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["emergency"]["status"], "NOTIFYING_PRIMARY_GUARDIAN")

    def test_02_sos_linked_to_correct_society(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        data = res.json()
        emergency = EmergencyRequest.objects.get(pk=data["emergency"]["id"])
        self.assertEqual(emergency.society, self.society_a)

    def test_03_primary_guardian_receives_notification(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        em_id = res.json()["emergency"]["id"]

        self.client.login(username="guardian_primary", password="pass123")
        res_active = self.client.get("/api/emergency/my-active/")
        data = res_active.json()
        self.assertTrue(data["has_active"])
        self.assertEqual(data["emergency"]["id"], em_id)

    def test_04_primary_guardian_accepts(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        em_id = res.json()["emergency"]["id"]

        self.client.login(username="guardian_primary", password="pass123")
        res_accept = self.client.post(f"/api/emergency/sos/{em_id}/accept/", json.dumps({}), content_type="application/json")
        data = res_accept.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["emergency"]["status"], "RESPONDING")
        self.assertEqual(data["emergency"]["assigned_responder_name"], "Palanisamy M")

    def test_05_escalation_stops_on_accept(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        em_id = res.json()["emergency"]["id"]

        self.client.login(username="guardian_primary", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/accept/", json.dumps({}), content_type="application/json")

        emergency = EmergencyRequest.objects.get(pk=em_id)
        evaluate_emergency_timeouts(emergency)
        emergency.refresh_from_db()
        self.assertEqual(emergency.status, "RESPONDING")
        self.assertEqual(emergency.active_escalation_level, "PRIMARY_GUARDIAN")

    def test_06_primary_guardian_declines(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        em_id = res.json()["emergency"]["id"]

        self.client.login(username="guardian_primary", password="pass123")
        res_dec = self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")
        data = res_dec.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["emergency"]["active_escalation_level"], "SECONDARY_GUARDIAN")

    def test_07_secondary_guardian_receives_alert(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        em_id = res.json()["emergency"]["id"]

        self.client.login(username="guardian_primary", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")

        self.client.login(username="guardian_secondary", password="pass123")
        res_active = self.client.get("/api/emergency/my-active/")
        self.assertTrue(res_active.json()["has_active"])
        self.assertEqual(res_active.json()["emergency"]["active_escalation_level"], "SECONDARY_GUARDIAN")

    def test_08_secondary_guardian_accepts(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        em_id = res.json()["emergency"]["id"]

        self.client.login(username="guardian_primary", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")

        self.client.login(username="guardian_secondary", password="pass123")
        res_accept = self.client.post(f"/api/emergency/sos/{em_id}/accept/", json.dumps({}), content_type="application/json")
        self.assertEqual(res_accept.json()["emergency"]["status"], "RESPONDING")
        self.assertEqual(res_accept.json()["emergency"]["assigned_responder_name"], "Kavitha P")

    def test_09_secondary_guardian_declines(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        em_id = res.json()["emergency"]["id"]

        self.client.login(username="guardian_primary", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")

        self.client.login(username="guardian_secondary", password="pass123")
        res_dec = self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")
        self.assertEqual(res_dec.json()["emergency"]["active_escalation_level"], "SOCIETY_MEMBER")

    def test_10_society_members_receive_alert(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        em_id = res.json()["emergency"]["id"]

        self.client.login(username="guardian_primary", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")

        self.client.login(username="guardian_secondary", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")

        self.client.login(username="member_a", password="pass123")
        res_active = self.client.get("/api/emergency/my-active/")
        self.assertTrue(res_active.json()["has_active"])
        self.assertEqual(res_active.json()["emergency"]["active_escalation_level"], "SOCIETY_MEMBER")

    def test_11_society_isolation(self):
        # Resident A in Society A triggers SOS
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        em_id = res.json()["emergency"]["id"]

        # Primary and Secondary decline to escalate to SOCIETY_MEMBER
        self.client.login(username="guardian_primary", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")
        self.client.login(username="guardian_secondary", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")

        # Society B Member MUST NOT see Society A SOS
        self.client.login(username="member_b", password="pass123")
        res_b = self.client.get("/api/emergency/my-active/")
        self.assertFalse(res_b.json()["has_active"])

    def test_12_society_member_accepts(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        em_id = res.json()["emergency"]["id"]

        self.client.login(username="guardian_primary", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")
        self.client.login(username="guardian_secondary", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")

        self.client.login(username="member_a", password="pass123")
        res_accept = self.client.post(f"/api/emergency/sos/{em_id}/accept/", json.dumps({}), content_type="application/json")
        self.assertEqual(res_accept.json()["emergency"]["status"], "RESPONDING")
        self.assertEqual(res_accept.json()["emergency"]["assigned_responder_name"], "Jinwoo S")

    def test_13_security_receives_alert(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        em_id = res.json()["emergency"]["id"]

        self.client.login(username="guardian_primary", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")
        self.client.login(username="guardian_secondary", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")
        self.client.login(username="member_a", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")

        self.client.login(username="security_a", password="pass123")
        res_active = self.client.get("/api/emergency/my-active/")
        self.assertTrue(res_active.json()["has_active"])
        self.assertEqual(res_active.json()["emergency"]["active_escalation_level"], "EMERGENCY_CONTACT")

    def test_14_volunteer_receives_alert(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        em_id = res.json()["emergency"]["id"]

        self.client.login(username="guardian_primary", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")
        self.client.login(username="guardian_secondary", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")
        self.client.login(username="member_a", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")
        self.client.login(username="security_a", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")

        self.client.login(username="volunteer_a", password="pass123")
        res_active = self.client.get("/api/emergency/my-active/")
        self.assertTrue(res_active.json()["has_active"])
        self.assertEqual(res_active.json()["emergency"]["active_escalation_level"], "VOLUNTEER")

    def test_15_volunteer_accepts(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        em_id = res.json()["emergency"]["id"]

        self.client.login(username="guardian_primary", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")
        self.client.login(username="guardian_secondary", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")
        self.client.login(username="member_a", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")
        self.client.login(username="security_a", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")

        self.client.login(username="volunteer_a", password="pass123")
        res_accept = self.client.post(f"/api/emergency/sos/{em_id}/accept/", json.dumps({}), content_type="application/json")
        self.assertEqual(res_accept.json()["emergency"]["status"], "RESPONDING")
        self.assertEqual(res_accept.json()["emergency"]["assigned_responder_name"], "ShinChan N")

        self.volunteer_a_obj.refresh_from_db()
        self.assertEqual(self.volunteer_a_obj.availability, "Busy")

    def test_16_admin_escalation(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        em_id = res.json()["emergency"]["id"]

        self.client.login(username="guardian_primary", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")
        self.client.login(username="guardian_secondary", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")
        self.client.login(username="member_a", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")
        self.client.login(username="security_a", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")
        self.client.login(username="volunteer_a", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/decline/", json.dumps({}), content_type="application/json")

        emergency = EmergencyRequest.objects.get(pk=em_id)
        self.assertEqual(emergency.status, "ESCALATED")
        self.assertEqual(emergency.active_escalation_level, "ADMIN")

    def test_17_admin_resolves(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        em_id = res.json()["emergency"]["id"]

        self.client.login(username="admin_user", password="pass123")
        res_resolve = self.client.post(f"/api/emergency/sos/{em_id}/resolve/", json.dumps({"resolution_notes": "Handled by Admin"}), content_type="application/json")
        data = res_resolve.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["emergency"]["status"], "RESOLVED")

    def test_18_resolution_notes_saved(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        em_id = res.json()["emergency"]["id"]

        self.client.login(username="admin_user", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/resolve/", json.dumps({"resolution_notes": "Patient sent to hospital"}), content_type="application/json")

        emergency = EmergencyRequest.objects.get(pk=em_id)
        self.assertEqual(emergency.resolution_notes, "Patient sent to hospital")
        self.assertEqual(emergency.resolved_by, self.admin_user)

    def test_19_complete_audit_history(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        em_id = res.json()["emergency"]["id"]

        self.client.login(username="guardian_primary", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/accept/", json.dumps({}), content_type="application/json")

        self.client.login(username="admin_user", password="pass123")
        self.client.post(f"/api/emergency/sos/{em_id}/resolve/", json.dumps({"resolution_notes": "Resolved"}), content_type="application/json")

        emergency = EmergencyRequest.objects.get(pk=em_id)
        actions = list(emergency.audit_logs.values_list("action", flat=True))
        self.assertIn("SOS_CREATED", actions)
        self.assertIn("PRIMARY_GUARDIAN_NOTIFIED", actions)
        self.assertIn("EMERGENCY_ACCEPTED", actions)
        self.assertIn("EMERGENCY_RESOLVED", actions)

    def test_20_duplicate_sos_prevented(self):
        self.client.login(username="resident_a", password="pass123")
        res1 = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        em_id1 = res1.json()["emergency"]["id"]

        res2 = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        data2 = res2.json()
        self.assertFalse(data2["created"])
        self.assertEqual(data2["emergency"]["id"], em_id1)

    def test_21_unauthorized_user_cannot_accept(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        em_id = res.json()["emergency"]["id"]

        # Resident B (unrelated) tries to accept Resident A's SOS
        self.client.login(username="resident_b", password="pass123")
        res_accept = self.client.post(f"/api/emergency/sos/{em_id}/accept/", json.dumps({}), content_type="application/json")
        self.assertFalse(res_accept.json()["success"])

    def test_22_resident_cannot_see_other_resident_sos(self):
        self.client.login(username="resident_a", password="pass123")
        self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")

        self.client.login(username="resident_b", password="pass123")
        res_active = self.client.get("/api/emergency/my-active/")
        self.assertFalse(res_active.json()["has_active"])

    def test_23_notification_read_unread_status(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")

        self.client.login(username="guardian_primary", password="pass123")
        res_notif = self.client.get("/api/notifications/")
        notifs = res_notif.json()["notifications"]
        self.assertGreater(len(notifs), 0)
        notif_id = notifs[0]["id"]

        res_read = self.client.post(f"/api/notifications/{notif_id}/read/")
        self.assertTrue(res_read.json()["success"])
        notif_obj = Notification.objects.get(pk=notif_id)
        self.assertTrue(notif_obj.is_read)

    def test_24_session_auth_enforced(self):
        self.client.logout()
        res = self.client.post("/api/emergency/sos/", json.dumps({}), content_type="application/json")
        self.assertEqual(res.status_code, 401)
        data = res.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["authenticated"], False)

    def test_25_role_comes_from_database(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.get("/api/emergency/my-active/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.resident_a.role, "resident")

    def test_26_other_type_requires_description(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({"emergency_type": "Other", "description": "   "}), content_type="application/json")
        self.assertEqual(res.status_code, 400)
        data = res.json()
        self.assertFalse(data["success"])

    def test_27_block_and_flat_linked(self):
        self.client.login(username="resident_a", password="pass123")
        res = self.client.post("/api/emergency/sos/", json.dumps({"emergency_type": "Medical Emergency", "description": "Need help"}), content_type="application/json")
        data = res.json()
        em_id = data["emergency"]["id"]
        emergency = EmergencyRequest.objects.get(pk=em_id)
        self.assertEqual(emergency.block, self.block_a)
        self.assertEqual(emergency.flat, self.flat_101)

