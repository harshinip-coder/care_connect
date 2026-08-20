import os
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'careconnect.settings')
django.setup()

from accounts.models import User, Guardian, Volunteer, SecurityPersonnel
from societies.models import Society, Block, Flat

print("Starting database population with non-proxy profile data...")

# 1. Create / Get Society "UK", Blocks "A" & "B", Flats "101"
society, _ = Society.objects.get_or_create(
    name="UK",
    defaults={
        "address": "irugalur",
        "city": "Erode",
        "state": "Tamil Nadu",
        "pincode": "637464"
    }
)

block_a, _ = Block.objects.get_or_create(
    society=society,
    block_name="A",
    defaults={"total_floors": 5}
)

block_b, _ = Block.objects.get_or_create(
    society=society,
    block_name="B",
    defaults={"total_floors": 5}
)

flat_101_a, _ = Flat.objects.get_or_create(
    block=block_a,
    flat_number="101",
    defaults={"floor": 1, "occupied": True}
)

flat_101_b, _ = Flat.objects.get_or_create(
    block=block_b,
    flat_number="101",
    defaults={"floor": 1, "occupied": True}
)

# Function to create or update user
def create_or_update_user(username, password, first_name, last_name, email, phone, role, **kwargs):
    user, created = User.objects.get_or_create(username=username)
    user.first_name = first_name
    user.last_name = last_name
    user.email = email
    user.phone = phone
    user.role = role
    user.is_active = True
    
    for key, val in kwargs.items():
        setattr(user, key, val)
        
    user.set_password(password)
    user.save()
    action = "Created" if created else "Updated"
    print(f"[{action} User] Username: {username} | Role: {role}")
    return user

# 2. ADMIN PROFILE
admin_user = create_or_update_user(
    username="Harshini",
    password="Harshini@2008",
    first_name="Harshini",
    last_name="P",
    email="harshinideepan6@gmail.com",
    phone="+91 6374643862",
    role="admin",
    employee_id="ADM001",
    dob=date(2008, 6, 7),
    gender="Female",
    blood_group="B+",
    address="KPRIET",
    city="Coimbatore",
    state="Tamil Nadu",
    pincode="637464",
    is_superuser=True,
    is_staff=True,
    two_factor_enabled=True,
    email_verified=True,
    phone_verified=True
)

# 3. RESIDENT PROFILE
resident_user = create_or_update_user(
    username="Deepan",
    password="Harshini@2008",
    first_name="Deepan",
    last_name="P",
    email="harshinideepan6@gmail.com",
    phone="+91 6374643862",
    alternate_phone="+91 8344831215",
    role="resident",
    employee_id="RES001",
    dob=date(2010, 6, 7),
    gender="Male",
    blood_group="B+",
    address="irugalur",
    city="erode",
    state="Tamil Nadu",
    pincode="637464",
    medical_conditions="None",
    allergies="None",
    society=society,
    block=block_a,
    flat=flat_101_a
)

# 4. PRIMARY GUARDIAN PROFILE
primary_guardian_user = create_or_update_user(
    username="Palanisamy",
    password="Harshini@2008",
    first_name="Palanisamy",
    last_name="M",
    email="harshinideepan6@gmail.com",
    phone="+91 6374643862",
    alternate_phone="+91 8344831215",
    role="guardian",
    employee_id="GRD001",
    dob=date(2000, 6, 7),
    gender="Male",
    blood_group="O+",
    address="irugalur",
    city="Erode",
    state="Tamil Nadu",
    pincode="637464",
    guardian_type="Primary Guardian",
    relationship="Parent",
    society=society,
    block=block_a,
    flat=flat_101_a
)

p_g_obj, _ = Guardian.objects.get_or_create(
    guardian_id="GRD001",
    resident=resident_user,
    defaults={
        "user": primary_guardian_user,
        "first_name": "Palanisamy",
        "last_name": "M",
        "username": "Palanisamy",
        "dob": date(2000, 6, 7),
        "gender": "Male",
        "blood_group": "O+",
        "email": "harshinideepan6@gmail.com",
        "phone": "+91 6374643862",
        "alternate_phone": "+91 8344831215",
        "address": "irugalur",
        "city": "Erode",
        "state": "Tamil Nadu",
        "pincode": "637464",
        "relationship": "Parent",
        "guardian_type": "Primary Guardian",
        "is_primary": True,
        "emergency_status": "🟢 No Active Emergency",
        "availability": "🟢 Available",
        "notification_pref": "Push + SMS",
        "response_method": "Phone Call"
    }
)
p_g_obj.user = primary_guardian_user
p_g_obj.resident = resident_user
p_g_obj.is_primary = True
p_g_obj.save()

# 5. SECONDARY GUARDIAN PROFILE
secondary_guardian_user = create_or_update_user(
    username="Kavitha",
    password="Harshini@2008",
    first_name="Kavitha",
    last_name="P",
    email="harshinideepan6@gmail.com",
    phone="+91 6374643862",
    alternate_phone="+91 8344831215",
    role="guardian",
    employee_id="GRD002",
    dob=date(2000, 6, 7),
    gender="Female",
    blood_group="B+",
    address="irugalur",
    city="Erode",
    state="Tamil Nadu",
    pincode="637464",
    guardian_type="Secondary Guardian",
    relationship="Parent",
    society=society,
    block=block_b,
    flat=flat_101_b
)

s_g_obj, _ = Guardian.objects.get_or_create(
    guardian_id="GRD002",
    resident=resident_user,
    defaults={
        "user": secondary_guardian_user,
        "first_name": "Kavitha",
        "last_name": "P",
        "username": "Kavitha",
        "dob": date(2000, 6, 7),
        "gender": "Female",
        "blood_group": "B+",
        "email": "harshinideepan6@gmail.com",
        "phone": "+91 6374643862",
        "alternate_phone": "+91 8344831215",
        "address": "irugalur",
        "city": "Erode",
        "state": "Tamil Nadu",
        "pincode": "637464",
        "relationship": "Parent",
        "guardian_type": "Secondary Guardian",
        "is_primary": False,
        "emergency_status": "🟢 No Active Emergency",
        "availability": "🟢 Available",
        "notification_pref": "Push + SMS",
        "response_method": "Phone Call"
    }
)
s_g_obj.user = secondary_guardian_user
s_g_obj.resident = resident_user
s_g_obj.is_primary = False
s_g_obj.save()

# 6. SECURITY PERSONNEL PROFILE 1 (Satoru Gojo)
security_1_user = create_or_update_user(
    username="Gojo",
    password="Harshini@2008",
    first_name="satoru",
    last_name="gojo",
    email="harshinideepan6@gmail.com",
    phone="6374643862",
    alternate_phone="8344831215",
    role="security",
    employee_id="101",
    dob=date(2008, 6, 7),
    gender="Male",
    blood_group="B+",
    address="irugalur",
    city="erode",
    state="tamilnadu",
    pincode="637464",
    society=society,
    block=block_a,
    gate_location="1st gate",
    shift="Night",
    emergency_phone="6374643862"
)

sec_1_obj, _ = SecurityPersonnel.objects.get_or_create(
    security_id="101",
    defaults={
        "user": security_1_user,
        "first_name": "satoru",
        "last_name": "gojo",
        "username": "Gojo",
        "dob": date(2008, 6, 7),
        "gender": "Male",
        "blood_group": "B+",
        "email": "harshinideepan6@gmail.com",
        "phone": "6374643862",
        "alternate_phone": "8344831215",
        "address": "irugalur",
        "city": "erode",
        "state": "tamilnadu",
        "pincode": "637464",
        "society": society,
        "shift": "Night",
        "status": "On Duty",
        "assigned_block": "A",
        "gate_location": "1st gate",
        "emergency_phone": "6374643862"
    }
)
sec_1_obj.user = security_1_user
sec_1_obj.save()

# 7. SECURITY PERSONNEL PROFILE 2 (Riemann Sukuna)
security_2_user = create_or_update_user(
    username="Sukuna",
    password="Harshini@2008",
    first_name="riemann",
    last_name="sukuna",
    email="harshinideepan6@gmail.com",
    phone="6374643862",
    alternate_phone="8344831215",
    role="security",
    employee_id="102",
    dob=date(2008, 6, 7),
    gender="Male",
    blood_group="B+",
    address="irugalur",
    city="erode",
    state="tamilnadu",
    pincode="637464",
    society=society,
    block=block_a,
    gate_location="2nd gate",
    shift="Night",
    emergency_phone="6374643862"
)

sec_2_obj, _ = SecurityPersonnel.objects.get_or_create(
    security_id="102",
    defaults={
        "user": security_2_user,
        "first_name": "riemann",
        "last_name": "sukuna",
        "username": "Sukuna",
        "dob": date(2008, 6, 7),
        "gender": "Male",
        "blood_group": "B+",
        "email": "harshinideepan6@gmail.com",
        "phone": "6374643862",
        "alternate_phone": "8344831215",
        "address": "irugalur",
        "city": "erode",
        "state": "tamilnadu",
        "pincode": "637464",
        "society": society,
        "shift": "Night",
        "status": "On Duty",
        "assigned_block": "A",
        "gate_location": "2nd gate",
        "emergency_phone": "6374643862"
    }
)
sec_2_obj.user = security_2_user
sec_2_obj.save()

# 8. SOCIETY MEMBER PROFILE (Sung Jinwoo)
society_member_user = create_or_update_user(
    username="Jinwoo",
    password="Harshini@2008",
    first_name="sung",
    last_name="jinwoo",
    email="harshinideepan6@gmail.com",
    phone="6374643862",
    alternate_phone="8344831215",
    role="society_member",
    employee_id="101",
    dob=date(2008, 7, 2),
    gender="Male",
    blood_group="A-",
    address="irugalur",
    city="Erode",
    state="tamilNadu",
    pincode="637464",
    society=society,
    block=block_a,
    flat=flat_101_a
)

# 9. VOLUNTEER PROFILE (Shin Chan)
volunteer_user = create_or_update_user(
    username="ShinChan",
    password="Harshini@2008",
    first_name="shin",
    last_name="chan",
    email="harshinideepan6@gmail.com",
    phone="6374643862",
    alternate_phone="8344831215",
    role="volunteer",
    employee_id="VOL001",
    volunteer_type="Emergency Volunteer",
    dob=date(2008, 7, 2),
    gender="Male",
    blood_group="A-",
    address="Irugalur",
    city="Erode",
    state="Tamil Nadu",
    pincode="637464",
    society=society,
    block=block_a,
    joining_date=date(2026, 8, 12),
    experience="2 Years",
    skills="First Aid, Rescue Assistance",
    availability="Available",
    preferred_response_area="Block A",
    emergency_contact_number="9876543210"
)

vol_obj, _ = Volunteer.objects.get_or_create(
    volunteer_id="VOL001",
    defaults={
        "user": volunteer_user,
        "first_name": "shin",
        "last_name": "chan",
        "username": "ShinChan",
        "dob": date(2008, 7, 2),
        "gender": "Male",
        "blood_group": "A-",
        "email": "harshinideepan6@gmail.com",
        "phone": "6374643862",
        "alternate_phone": "8344831215",
        "address": "Irugalur",
        "city": "Erode",
        "state": "Tamil Nadu",
        "pincode": "637464",
        "society": society,
        "block": block_a,
        "joining_date": date(2026, 8, 12),
        "experience": "2 Years",
        "skills": "First Aid, Rescue Assistance",
        "availability": "Available",
        "preferred_response_area": "Block A",
        "emergency_contact_number": "9876543210"
    }
)
vol_obj.user = volunteer_user
vol_obj.save()

# 10. ADDITIONAL PROFILES (Deepi, Sukuna@2008, Gojo@2008, Jinwoo@2008)
create_or_update_user(
    username="Deepi",
    password="Harshini@2008",
    first_name="Deepi",
    last_name="A",
    email="deepi@careconnect.com",
    phone="+91 6374643863",
    role="resident",
    employee_id="RES002",
    dob=date(2010, 1, 1),
    gender="Female",
    blood_group="O+",
    address="irugalur",
    city="Erode",
    state="Tamil Nadu",
    pincode="637464",
    society=society,
    block=block_a,
    flat=flat_101_a
)

sec_3_user = create_or_update_user(
    username="Sukuna@2008",
    password="Harshini@2008",
    first_name="riemann",
    last_name="sukuna",
    email="sukuna2008@careconnect.com",
    phone="6374643864",
    role="security",
    employee_id="103",
    gender="Male",
    blood_group="B+",
    society=society,
    block=block_a,
    gate_location="2nd gate",
    shift="Night"
)
sec_3_obj, _ = SecurityPersonnel.objects.get_or_create(
    security_id="103",
    defaults={
        "user": sec_3_user,
        "first_name": "riemann",
        "last_name": "sukuna",
        "username": "Sukuna@2008",
        "email": "sukuna2008@careconnect.com",
        "phone": "6374643864",
        "society": society,
        "shift": "Night",
        "status": "On Duty",
        "assigned_block": "A",
        "gate_location": "2nd gate"
    }
)
sec_3_obj.user = sec_3_user
sec_3_obj.save()

create_or_update_user(
    username="Gojo@2008",
    password="Harshini@2008",
    first_name="satoru",
    last_name="gojo",
    email="gojo2008@careconnect.com",
    phone="6374643865",
    role="society_member",
    employee_id="102",
    gender="Male",
    blood_group="B+",
    society=society,
    block=block_a,
    flat=flat_101_a
)

vol_2_user = create_or_update_user(
    username="Jinwoo@2008",
    password="Harshini@2008",
    first_name="sung",
    last_name="jinwoo",
    email="jinwoo2008@careconnect.com",
    phone="6374643866",
    role="volunteer",
    employee_id="VOL002",
    volunteer_type="Emergency Volunteer",
    gender="Male",
    blood_group="A-",
    society=society,
    block=block_a,
    joining_date=date(2026, 8, 12),
    experience="2 Years",
    skills="First Aid",
    availability="Available",
    preferred_response_area="Block A"
)
vol_2_obj, _ = Volunteer.objects.get_or_create(
    volunteer_id="VOL002",
    defaults={
        "user": vol_2_user,
        "first_name": "sung",
        "last_name": "jinwoo",
        "username": "Jinwoo@2008",
        "email": "jinwoo2008@careconnect.com",
        "phone": "6374643866",
        "society": society,
        "block": block_a,
        "joining_date": date(2026, 8, 12),
        "experience": "2 Years",
        "skills": "First Aid",
        "availability": "Available",
        "preferred_response_area": "Block A"
    }
)
vol_2_obj.user = vol_2_user
vol_2_obj.save()

print("\nDatabase population completed successfully!")

