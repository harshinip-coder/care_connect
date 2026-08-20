from django.contrib.auth.models import AbstractUser
from django.db import models
from societies.models import Society, Block, Flat


class User(AbstractUser):

    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('resident', 'Resident'),
        ('guardian', 'Guardian'),
        ('society_member', 'Society Member'),
        ('security', 'Security'),
        ('volunteer', 'Volunteer'),
    ]

    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    ]

    BLOOD_GROUP_CHOICES = [
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='resident'
    )

    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    alternate_phone = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    employee_id = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="User ID / Admin ID / Resident ID / Guardian ID / Member ID / Security ID / Volunteer ID"
    )

    gender = models.CharField(
        max_length=20,
        choices=GENDER_CHOICES,
        blank=True
    )

    blood_group = models.CharField(
        max_length=10,
        choices=BLOOD_GROUP_CHOICES,
        blank=True
    )

    dob = models.DateField(
        null=True,
        blank=True
    )

    address = models.TextField(
        blank=True
    )

    city = models.CharField(
        max_length=100,
        blank=True,
        default=''
    )

    state = models.CharField(
        max_length=100,
        blank=True,
        default=''
    )

    pincode = models.CharField(
        max_length=20,
        blank=True,
        default=''
    )

    # Health & Emergency Info for Residents
    medical_conditions = models.TextField(
        blank=True,
        default='None'
    )

    allergies = models.TextField(
        blank=True,
        default='None'
    )

    # Guardian fields
    guardian_type = models.CharField(
        max_length=50,
        blank=True,
        null=True
    )

    relationship = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        default='Parent'
    )

    # Security Personnel fields
    gate_location = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    shift = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        default='Night'
    )

    emergency_phone = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    # Volunteer fields
    volunteer_type = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        default='Emergency Volunteer'
    )

    joining_date = models.DateField(
        null=True,
        blank=True
    )

    experience = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    skills = models.TextField(
        blank=True,
        null=True
    )

    availability = models.CharField(
        max_length=50,
        default='Available',
        blank=True
    )

    preferred_response_area = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    emergency_contact_number = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    # Security & Verification flags
    two_factor_enabled = models.BooleanField(
        default=True
    )

    email_verified = models.BooleanField(
        default=True
    )

    phone_verified = models.BooleanField(
        default=True
    )

    society = models.ForeignKey(
        Society,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='residents'
    )

    block = models.ForeignKey(
        Block,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='residents'
    )

    flat = models.ForeignKey(
        Flat,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='residents'
    )

    profile_photo = models.ImageField(
        upload_to='profiles/',
        blank=True,
        null=True,
        default='profiles/default.png'
    )

    is_verified = models.BooleanField(
        default=True
    )

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class Guardian(models.Model):

    RELATION_CHOICES = [
        ('Father', 'Father'),
        ('Mother', 'Mother'),
        ('Brother', 'Brother'),
        ('Sister', 'Sister'),
        ('Son', 'Son'),
        ('Daughter', 'Daughter'),
        ('Parent', 'Parent'),
        ('Friend', 'Friend'),
        ('Relative', 'Relative'),
        ('Other', 'Other'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='as_guardian_account'
    )

    resident = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='guardians'
    )

    guardian_id = models.CharField(max_length=50, blank=True, null=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    username = models.CharField(max_length=100, blank=True, null=True)
    dob = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True, null=True)
    blood_group = models.CharField(max_length=10, blank=True, null=True)
    email = models.EmailField(blank=True, default='')
    phone = models.CharField(max_length=20)
    alternate_phone = models.CharField(max_length=20, blank=True, null=True)

    relationship = models.CharField(
        max_length=50,
        choices=RELATION_CHOICES,
        default='Parent'
    )

    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True, default='')
    state = models.CharField(max_length=100, blank=True, default='')
    pincode = models.CharField(max_length=20, blank=True, default='')

    guardian_type = models.CharField(max_length=50, default='Primary Guardian')
    is_primary = models.BooleanField(default=False)

    emergency_status = models.CharField(max_length=100, default='🟢 No Active Emergency')
    availability = models.CharField(max_length=50, default='🟢 Available')
    notification_pref = models.CharField(max_length=100, default='Push + SMS')
    response_method = models.CharField(max_length=100, default='Phone Call')

    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def guardian_type_display(self):
        return "Primary Guardian" if self.is_primary else "Secondary Guardian"

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Volunteer(models.Model):

    STATUS_CHOICES = [
        ('Available', 'Available'),
        ('Busy', 'Busy'),
        ('Offline', 'Offline'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='as_volunteer_account'
    )

    volunteer_id = models.CharField(max_length=50, blank=True, null=True)
    volunteer_type = models.CharField(max_length=100, default='Emergency Volunteer')

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    username = models.CharField(max_length=100, blank=True, null=True)
    dob = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True, null=True)
    blood_group = models.CharField(max_length=10, blank=True, null=True)

    email = models.EmailField()
    phone = models.CharField(max_length=20)
    alternate_phone = models.CharField(max_length=20, blank=True, null=True)

    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True, default='')
    state = models.CharField(max_length=100, blank=True, default='')
    pincode = models.CharField(max_length=20, blank=True, default='')

    society = models.ForeignKey(
        Society,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    block = models.ForeignKey(
        Block,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    joining_date = models.DateField(null=True, blank=True)
    experience = models.CharField(max_length=100, blank=True, null=True)
    skills = models.TextField(blank=True, null=True)

    availability = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='Available'
    )

    preferred_response_area = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_number = models.CharField(max_length=20, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class SecurityPersonnel(models.Model):

    SHIFT_CHOICES = [
        ('Morning', 'Morning'),
        ('Evening', 'Evening'),
        ('Night', 'Night'),
    ]

    STATUS_CHOICES = [
        ('On Duty', 'On Duty'),
        ('Off Duty', 'Off Duty'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='as_security_account'
    )

    security_id = models.CharField(max_length=50, blank=True, null=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    username = models.CharField(max_length=100, blank=True, null=True)
    dob = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True, null=True)
    blood_group = models.CharField(max_length=10, blank=True, null=True)

    email = models.EmailField()
    phone = models.CharField(max_length=20)
    alternate_phone = models.CharField(max_length=20, blank=True, null=True)

    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True, default='')
    state = models.CharField(max_length=100, blank=True, default='')
    pincode = models.CharField(max_length=20, blank=True, default='')

    society = models.ForeignKey(
        Society,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    shift = models.CharField(
        max_length=50,
        choices=SHIFT_CHOICES,
        default='Night'
    )

    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='On Duty'
    )

    assigned_block = models.CharField(max_length=100, blank=True, default='A')
    gate_location = models.CharField(max_length=100, blank=True, null=True)
    emergency_phone = models.CharField(max_length=20, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"