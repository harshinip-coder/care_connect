from django.db import models
from accounts.models import User, Volunteer, SecurityPersonnel
from societies.models import Society, Block, Flat


class EmergencyRequest(models.Model):

    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('ACKNOWLEDGED', 'Acknowledged'),
        ('PENDING', 'Pending'),
        ('NOTIFYING_PRIMARY_GUARDIAN', 'Notifying Primary Guardian'),
        ('NOTIFYING_SECONDARY_GUARDIAN', 'Notifying Secondary Guardian'),
        ('NOTIFYING_SOCIETY_MEMBER', 'Notifying Society Member'),
        ('NOTIFYING_VOLUNTEER', 'Notifying Volunteer'),
        ('NOTIFYING_EMERGENCY_CONTACT', 'Notifying Emergency Contact'),
        ('NOTIFYING_SECURITY', 'Notifying Security'),
        ('NOTIFYING_SOCIETY', 'Notifying Society'),
        ('RESPONDING', 'Responding'),
        ('IN_PROGRESS', 'In Progress'),
        ('ESCALATED', 'Escalated'),
        ('RESOLVED', 'Resolved'),
        ('CANCELLED', 'Cancelled'),
    ]

    EMERGENCY_CHOICES = [
        ('Medical Emergency', 'Medical Emergency'),
        ('Accident', 'Accident'),
        ('Fire', 'Fire'),
        ('Security Threat', 'Security Threat'),
        ('Crime / Intrusion', 'Crime / Intrusion'),
        ('Missing Person', 'Missing Person'),
        ('Women / Child Safety', 'Women / Child Safety'),
        ('Natural Disaster', 'Natural Disaster'),
        ('Other', 'Other'),
    ]

    ESCALATION_LEVEL_CHOICES = [
        ('PRIMARY_GUARDIAN', 'Primary Guardian'),
        ('SECONDARY_GUARDIAN', 'Secondary Guardian'),
        ('SOCIETY_MEMBER', 'Society Member'),
        ('VOLUNTEER', 'Volunteer'),
        ('EMERGENCY_CONTACT', 'Emergency Contact'),
        ('SECURITY', 'Security Personnel'),
        ('SOCIETY', 'Society / Admin'),
        ('ADMIN', 'Admin'),
        ('RESOLVED', 'Resolved'),
        ('CANCELLED', 'Cancelled'),
        ('NONE', 'None'),
    ]

    resident = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='emergencies'
    )

    society = models.ForeignKey(
        Society,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='emergencies'
    )

    block = models.ForeignKey(
        Block,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='emergencies'
    )

    flat = models.ForeignKey(
        Flat,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='emergencies'
    )

    emergency_type = models.CharField(
        max_length=50,
        choices=EMERGENCY_CHOICES,
        default='Medical Emergency'
    )

    message = models.TextField(blank=True, default='', null=True)
    description = models.TextField(blank=True, default='SOS Button Pressed')

    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_address = models.CharField(max_length=255, blank=True, default='')

    status = models.CharField(
        max_length=40,
        choices=STATUS_CHOICES,
        default='ACTIVE'
    )

    active_escalation_level = models.CharField(
        max_length=30,
        choices=ESCALATION_LEVEL_CHOICES,
        default='PRIMARY_GUARDIAN'
    )

    assigned_responder = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_emergencies'
    )

    assigned_responder_role = models.CharField(max_length=50, blank=True, default='')

    assigned_volunteer = models.ForeignKey(
        Volunteer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    assigned_security = models.ForeignKey(
        SecurityPersonnel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_emergencies'
    )

    resolution_notes = models.TextField(blank=True, default='', null=True)

    current_stage_start = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"SOS #{self.id} - {self.resident.username} ({self.status})"


class EmergencyNotification(models.Model):

    ROLE_CHOICES = [
        ('PRIMARY_GUARDIAN', 'Primary Guardian'),
        ('SECONDARY_GUARDIAN', 'Secondary Guardian'),
        ('SOCIETY_MEMBER', 'Society Member'),
        ('VOLUNTEER', 'Volunteer'),
        ('EMERGENCY_CONTACT', 'Emergency Contact'),
        ('SECURITY', 'Security Personnel'),
        ('SOCIETY', 'Society / Admin'),
        ('ADMIN', 'Admin'),
    ]

    RESPONSE_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('DECLINED', 'Declined'),
        ('NO_RESPONSE', 'No Response'),
        ('NOT_SENT', 'Not Sent'),
    ]

    emergency = models.ForeignKey(
        EmergencyRequest,
        on_delete=models.CASCADE,
        related_name='notifications'
    )

    recipient_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='emergency_notifications',
        null=True,
        blank=True
    )

    recipient_role = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES
    )

    escalation_level = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES
    )

    status = models.CharField(
        max_length=20,
        choices=RESPONSE_STATUS_CHOICES,
        default='PENDING'
    )

    title = models.CharField(max_length=200, default='🚨 SOS ALERT')
    message = models.TextField(blank=True, default='')

    sent_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    timeout_at = models.DateTimeField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification #{self.id} - {self.recipient_role} ({self.status})"


class EmergencyAuditLog(models.Model):

    emergency = models.ForeignKey(
        EmergencyRequest,
        on_delete=models.CASCADE,
        related_name='audit_logs'
    )

    action = models.CharField(max_length=50)

    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    details = models.TextField(blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Audit #{self.id} - {self.action} on SOS #{self.emergency.id}"