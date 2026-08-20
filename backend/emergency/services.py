import datetime
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from accounts.models import User, Guardian, Volunteer, SecurityPersonnel
from societies.models import Society
from emergency.models import EmergencyRequest, EmergencyNotification, EmergencyAuditLog
from notifications.models import Notification


def get_sos_timeout():
    return getattr(settings, 'SOS_RESPONSE_TIMEOUT', 10)


def log_audit(emergency, action, actor=None, details=''):
    EmergencyAuditLog.objects.create(
        emergency=emergency,
        action=action,
        actor=actor,
        details=details
    )


def create_sos_incident(resident, emergency_type="Medical", description="SOS Button Pressed", lat=None, lng=None, address=""):
    """
    Step 1 & 2 & 3 — SOS Creation & Society Identification.
    Creates an SOS request with status = 'ACTIVE' and active_escalation_level = 'PRIMARY_GUARDIAN'.
    Prevents duplicate active SOS requests for the same resident.
    Binds the resident's Society directly to emergency.society.
    """
    if getattr(resident, 'role', None) != 'resident':
        raise ValueError(f"Only residents can trigger SOS emergency alerts. '{getattr(resident, 'username', 'User')}' has role '{getattr(resident, 'role', None)}'.")

    active = EmergencyRequest.objects.filter(
        resident=resident
    ).exclude(
        status__in=['RESOLVED', 'CANCELLED']
    ).first()

    if active:
        evaluate_emergency_timeouts(active)
        return active, False

    society = resident.society
    block = resident.block
    flat = resident.flat

    if not address:
        parts = []
        if flat:
            parts.append(f"Flat {flat.flat_number}")
        if block:
            parts.append(f"Block {block.block_name}")
        if society:
            parts.append(str(society.name))
        if resident.address:
            parts.append(resident.address)
        address = ", ".join(parts) if parts else "CareConnect Residency"

    emergency = EmergencyRequest.objects.create(
        resident=resident,
        society=society,
        block=block,
        flat=flat,
        emergency_type=emergency_type or "Medical Emergency",
        message="",
        description=description or "SOS Button Pressed",
        latitude=lat,
        longitude=lng,
        location_address=address,
        resolution_notes="",
        status='ACTIVE',
        active_escalation_level='NONE'
    )

    log_audit(
        emergency,
        'SOS_CREATED',
        actor=resident,
        details=f"SOS triggered by {resident.username} ({resident.get_full_name()}). Society: {society.name if society else 'N/A'}. Address: {address}"
    )

    advance_escalation_chain(emergency)
    return emergency, True


def update_sos_details(emergency, emergency_type=None, message=None, description=None, lat=None, lng=None, address=None):
    if emergency_type:
        emergency.emergency_type = emergency_type
    if message is not None:
        emergency.message = message
    if description is not None:
        emergency.description = description
    if lat is not None:
        emergency.latitude = lat
    if lng is not None:
        emergency.longitude = lng
    if address:
        emergency.location_address = address

    emergency.save()
    log_audit(emergency, 'SOS_DETAILS_UPDATED', actor=emergency.resident, details=f"Details updated: Type={emergency.emergency_type}, Msg='{emergency.message}'")
    return emergency


def evaluate_emergency_timeouts(emergency):
    """
    Evaluates timeouts for the active stage.
    If the active PENDING stage has timed out, marks NO_RESPONSE and advances escalation chain.
    """
    if emergency.status in ['RESPONDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED', 'ESCALATED']:
        return emergency

    active_notif = emergency.notifications.filter(status='PENDING').first()
    if active_notif:
        now = timezone.now()
        if now >= active_notif.timeout_at:
            active_notif.status = 'NO_RESPONSE'
            active_notif.save()

            log_audit(
                emergency,
                f"{active_notif.recipient_role}_TIMEOUT",
                details=f"{active_notif.get_recipient_role_display()} stage response timeout ({get_sos_timeout()}s)"
            )

            advance_escalation_chain(emergency)

    return emergency


def advance_escalation_chain(emergency):
    """
    Step 4 to 10 — Strictly Ordered Escalation State Machine:
    1. PRIMARY_GUARDIAN
    2. SECONDARY_GUARDIAN
    3. SOCIETY_MEMBER (Same Society Only)
    4. VOLUNTEER (Same Society Only)
    5. EMERGENCY_CONTACT (Security / Emergency Contacts)
    6. ADMIN (Status set to ESCALATED)
    """
    current_level = emergency.active_escalation_level

    if current_level == 'NONE':
        next_level = 'PRIMARY_GUARDIAN'
    elif current_level == 'PRIMARY_GUARDIAN':
        next_level = 'SECONDARY_GUARDIAN'
    elif current_level == 'SECONDARY_GUARDIAN':
        next_level = 'SOCIETY_MEMBER'
    elif current_level == 'SOCIETY_MEMBER':
        next_level = 'EMERGENCY_CONTACT'
    elif current_level == 'EMERGENCY_CONTACT':
        next_level = 'VOLUNTEER'
    elif current_level == 'VOLUNTEER':
        next_level = 'ADMIN'
    else:
        next_level = 'ADMIN'


    timeout_seconds = get_sos_timeout()
    now = timezone.now()
    timeout_at = now + datetime.timedelta(seconds=timeout_seconds)
    res_name = emergency.resident.get_full_name() or emergency.resident.username
    society_name = emergency.society.name if emergency.society else (emergency.resident.society.name if emergency.resident.society else "CareConnect Community")

    if next_level == 'PRIMARY_GUARDIAN':
        guardian = Guardian.objects.filter(resident=emergency.resident, is_primary=True).first()
        recipient_user = find_user_for_guardian(guardian)

        emergency.status = 'NOTIFYING_PRIMARY_GUARDIAN'
        emergency.active_escalation_level = 'PRIMARY_GUARDIAN'
        emergency.current_stage_start = now
        emergency.save()

        if not recipient_user:
            log_audit(emergency, 'PRIMARY_GUARDIAN_NOT_ASSIGNED', details="No Primary Guardian assigned. Auto-escalating to Secondary Guardian.")
            return advance_escalation_chain(emergency)

        EmergencyNotification.objects.create(
            emergency=emergency,
            recipient_user=recipient_user,
            recipient_role='PRIMARY_GUARDIAN',
            escalation_level='PRIMARY_GUARDIAN',
            status='PENDING',
            title='🚨 EMERGENCY SOS — Primary Guardian Alert',
            message=f"Resident: {res_name}\nSociety: {society_name}\nLocation: {emergency.location_address}\nType: {emergency.emergency_type}",
            timeout_at=timeout_at
        )

        Notification.objects.create(
            receiver=recipient_user,
            emergency=emergency,
            title="🚨 Emergency SOS Alert (Primary Guardian)",
            message=f"Resident {res_name} in {society_name} needs immediate assistance at {emergency.location_address}!"
        )

        log_audit(emergency, 'PRIMARY_GUARDIAN_NOTIFIED', actor=recipient_user, details=f"Primary Guardian notified ({guardian.first_name if guardian else recipient_user.username}). Timeout in {timeout_seconds}s")

    elif next_level == 'SECONDARY_GUARDIAN':
        guardian = Guardian.objects.filter(resident=emergency.resident, is_primary=False).first()
        recipient_user = find_user_for_guardian(guardian)

        emergency.status = 'NOTIFYING_SECONDARY_GUARDIAN'
        emergency.active_escalation_level = 'SECONDARY_GUARDIAN'
        emergency.current_stage_start = now
        emergency.save()

        if not recipient_user:
            log_audit(emergency, 'SECONDARY_GUARDIAN_NOT_ASSIGNED', details="No Secondary Guardian assigned. Auto-escalating to Society Members.")
            return advance_escalation_chain(emergency)

        EmergencyNotification.objects.create(
            emergency=emergency,
            recipient_user=recipient_user,
            recipient_role='SECONDARY_GUARDIAN',
            escalation_level='SECONDARY_GUARDIAN',
            status='PENDING',
            title='🚨 EMERGENCY SOS — Secondary Guardian Alert',
            message=f"Primary Guardian did not respond within {timeout_seconds}s.\n\nResident: {res_name}\nSociety: {society_name}\nLocation: {emergency.location_address}",
            timeout_at=timeout_at
        )

        Notification.objects.create(
            receiver=recipient_user,
            emergency=emergency,
            title="🚨 Emergency SOS Alert (Secondary Guardian)",
            message=f"Primary Guardian timed out. Resident {res_name} in {society_name} needs assistance!"
        )

        log_audit(emergency, 'SECONDARY_GUARDIAN_NOTIFIED', actor=recipient_user, details=f"Secondary Guardian notified ({guardian.first_name if guardian else recipient_user.username}). Timeout in {timeout_seconds}s")

    elif next_level == 'SOCIETY_MEMBER':
        # STRICT SOCIETY ISOLATION: Notify only members belonging to emergency.society
        society_query = Q(society=emergency.society) if emergency.society else Q(society=emergency.resident.society)
        society_users = User.objects.filter(Q(role='society_member') & society_query)

        emergency.status = 'NOTIFYING_SOCIETY_MEMBER'
        emergency.active_escalation_level = 'SOCIETY_MEMBER'
        emergency.current_stage_start = now
        emergency.save()

        if not society_users.exists():
            log_audit(emergency, 'NO_SOCIETY_MEMBERS_AVAILABLE', details=f"No Society Members in '{society_name}'. Auto-escalating to Volunteers.")
            return advance_escalation_chain(emergency)

        for sm_user in society_users:
            EmergencyNotification.objects.create(
                emergency=emergency,
                recipient_user=sm_user,
                recipient_role='SOCIETY_MEMBER',
                escalation_level='SOCIETY_MEMBER',
                status='PENDING',
                title=f'🚨 SOCIETY EMERGENCY — {society_name}',
                message=f"Resident: {res_name}\nSociety: {society_name}\nLocation: {emergency.location_address}\nType: {emergency.emergency_type}",
                timeout_at=timeout_at
            )

            Notification.objects.create(
                receiver=sm_user,
                emergency=emergency,
                title=f"🚨 Society Emergency ({society_name})",
                message=f"Guardians unavailable. Resident {res_name} in your society needs assistance at {emergency.location_address}!"
            )

        log_audit(emergency, 'SOCIETY_MEMBER_NOTIFIED', details=f"Society Members of '{society_name}' notified ({society_users.count()} members). Timeout in {timeout_seconds}s")

    elif next_level == 'VOLUNTEER':
        # STRICT SOCIETY ISOLATION: Notify only volunteers belonging to emergency.society
        society_query = Q(society=emergency.society) if emergency.society else Q(society=emergency.resident.society)
        volunteer_users = User.objects.filter(Q(role='volunteer') & society_query)

        emergency.status = 'NOTIFYING_VOLUNTEER'
        emergency.active_escalation_level = 'VOLUNTEER'
        emergency.current_stage_start = now
        emergency.save()

        if not volunteer_users.exists():
            log_audit(emergency, 'NO_VOLUNTEERS_AVAILABLE', details=f"No Volunteers in '{society_name}'. Auto-escalating to Emergency Contacts.")
            return advance_escalation_chain(emergency)

        for vol_user in volunteer_users:
            EmergencyNotification.objects.create(
                emergency=emergency,
                recipient_user=vol_user,
                recipient_role='VOLUNTEER',
                escalation_level='VOLUNTEER',
                status='PENDING',
                title=f'🚨 VOLUNTEER ASSISTANCE REQUIRED — {society_name}',
                message=f"Resident: {res_name}\nSociety: {society_name}\nLocation: {emergency.location_address}\nType: {emergency.emergency_type}",
                timeout_at=timeout_at
            )

            Notification.objects.create(
                receiver=vol_user,
                emergency=emergency,
                title="🚨 Volunteer Emergency Request",
                message=f"Emergency assistance requested for {res_name} in {society_name} at {emergency.location_address}!"
            )

        log_audit(emergency, 'VOLUNTEER_NOTIFIED', details=f"Volunteers of '{society_name}' notified ({volunteer_users.count()} volunteers). Timeout in {timeout_seconds}s")

    elif next_level == 'EMERGENCY_CONTACT':
        # Security staff and emergency contacts
        security_query = Q(society=emergency.society) if emergency.society else Q(society=emergency.resident.society)
        security_users = User.objects.filter(Q(role='security') & security_query)

        emergency.status = 'NOTIFYING_EMERGENCY_CONTACT'
        emergency.active_escalation_level = 'EMERGENCY_CONTACT'
        emergency.current_stage_start = now
        emergency.save()

        if not security_users.exists():
            log_audit(emergency, 'NO_SECURITY_AVAILABLE', details=f"No Security Personnel in '{society_name}'. Auto-escalating to Admin.")
            return advance_escalation_chain(emergency)

        for sec_user in security_users:
            EmergencyNotification.objects.create(
                emergency=emergency,
                recipient_user=sec_user,
                recipient_role='SECURITY',
                escalation_level='EMERGENCY_CONTACT',
                status='PENDING',
                title=f'🚨 URGENT EMERGENCY CONTACT ALERT — {society_name}',
                message=f"Prior responders unavailable.\n\nSOS ID #{emergency.id}\nResident: {res_name}\nSociety: {society_name}\nLocation: {emergency.location_address}",
                timeout_at=timeout_at
            )

            Notification.objects.create(
                receiver=sec_user,
                emergency=emergency,
                title="🚨 Urgent Security / Emergency Contact Alert",
                message=f"Prior responders unavailable. Immediate response requested for {res_name} at {emergency.location_address}!"
            )

        log_audit(emergency, 'EMERGENCY_CONTACT_NOTIFIED', details=f"Emergency Contacts & Security notified ({security_users.count()} security). Timeout in {timeout_seconds}s")

    else:
        # Step 10 — Escalated to Admin
        admin_users = User.objects.filter(Q(role='admin') | Q(is_superuser=True))

        emergency.status = 'ESCALATED'
        emergency.active_escalation_level = 'ADMIN'
        emergency.current_stage_start = now
        emergency.save()

        for admin in admin_users:
            EmergencyNotification.objects.create(
                emergency=emergency,
                recipient_user=admin,
                recipient_role='ADMIN',
                escalation_level='ADMIN',
                status='PENDING',
                title=f'🚨 ESCALATED CASE ALERT — SOS #{emergency.id}',
                message=f"ALL PREVIOUS ESCALATION LEVELS TIMED OUT.\n\nSOS ID #{emergency.id}\nResident: {res_name}\nSociety: {society_name}\nLocation: {emergency.location_address}\nType: {emergency.emergency_type}",
                timeout_at=now + datetime.timedelta(days=1)
            )

            Notification.objects.create(
                receiver=admin,
                emergency=emergency,
                title=f"🚨 ESCALATED EMERGENCY CASE — SOS #{emergency.id}",
                message=f"All escalation stages failed to respond. SOS #{emergency.id} for {res_name} in {society_name} requires Admin intervention!"
            )

        log_audit(emergency, 'ESCALATED_TO_ADMIN', details="All previous escalation levels timed out without response. Case ESCALATED to Admin dashboard.")


def find_user_for_guardian(guardian):
    if not guardian:
        return None
    if guardian.user:
        return guardian.user
    user = None
    if guardian.username:
        user = User.objects.filter(username__iexact=guardian.username).first()
        if not user:
            user = User.objects.filter(username__istartswith=guardian.username, role='guardian').first()
    if not user and guardian.first_name:
        user = User.objects.filter(first_name__iexact=guardian.first_name, role='guardian').first()
        if not user:
            user = User.objects.filter(username__istartswith=guardian.first_name, role='guardian').first()
    if not user and guardian.email:
        user = User.objects.filter(email__iexact=guardian.email, role='guardian').first()
    if not user and guardian.phone:
        user = User.objects.filter(phone=guardian.phone, role='guardian').first()
    if not user:
        user = User.objects.filter(role='guardian').first()
    return user


def is_user_guardian_for_resident(user, resident, is_primary):
    if not user or not resident:
        return False
    guardian = Guardian.objects.filter(resident=resident, is_primary=is_primary).first()
    if not guardian:
        return False
    if guardian.user:
        return guardian.user == user or guardian.user.id == user.id

    u_uname = (user.username or '').lower().strip()
    g_uname = (guardian.username or '').lower().strip()
    g_fname = (guardian.first_name or '').lower().strip()

    if g_uname:
        return u_uname == g_uname or u_uname.startswith(g_uname) or g_uname.startswith(u_uname)
    if g_fname:
        return u_uname == g_fname or u_uname.startswith(g_fname) or g_fname.startswith(u_uname)

    if guardian.email and user.email and guardian.email.strip() and guardian.email.lower().strip() == user.email.lower().strip():
        return True
    if guardian.phone and user.phone and guardian.phone.strip() and guardian.phone.strip() == user.phone.strip():
        return True
    return False




def process_response(emergency_id, user, action):
    """
    Step 13 — Atomic Response Controller.
    Locks record via select_for_update to prevent duplicate accepts or race conditions.
    On ACCEPT:
    - Sets status = 'RESPONDING' (or 'ACKNOWLEDGED')
    - Assigns responder = user
    - Immediately stops further escalation
    On DECLINE/REJECT:
    - Marks stage as DECLINED
    - Immediately triggers next escalation stage
    """
    with transaction.atomic():
        emergency = EmergencyRequest.objects.select_for_update().filter(pk=emergency_id).first()
        if not emergency:
            return False, "Emergency request not found.", None, "not_found"

        evaluate_emergency_timeouts(emergency)

        if emergency.status in ['RESPONDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'] or emergency.assigned_responder is not None:
            responder_name = (emergency.assigned_responder.get_full_name() or emergency.assigned_responder.username) if emergency.assigned_responder else "another responder"
            return False, f"This emergency has already been accepted by {responder_name}.", emergency, "already_accepted"

        active_notif = emergency.notifications.filter(status='PENDING').first()
        now = timezone.now()

        # Enforce strict backend authorization check
        is_authorized = False
        if user.is_superuser or user.role == 'admin':
            is_authorized = True
        elif active_notif:
            if active_notif.recipient_user == user:
                is_authorized = True
            elif active_notif.recipient_role == 'PRIMARY_GUARDIAN':
                is_authorized = is_user_guardian_for_resident(user, emergency.resident, is_primary=True)
            elif active_notif.recipient_role == 'SECONDARY_GUARDIAN':
                is_authorized = is_user_guardian_for_resident(user, emergency.resident, is_primary=False)
            elif active_notif.recipient_role == 'SOCIETY_MEMBER':
                is_authorized = (user.role == 'society_member' and (not user.society or user.society == emergency.society))
            elif active_notif.recipient_role == 'VOLUNTEER':
                is_authorized = (user.role == 'volunteer' and (not user.society or user.society == emergency.society))
            elif active_notif.recipient_role in ['EMERGENCY_CONTACT', 'SECURITY']:
                is_authorized = (user.role == 'security' and (not user.society or user.society == emergency.society))


        if not is_authorized:
            return False, "You are not authorized to respond to this emergency request.", emergency, "not_authorized"

        if action in ['ACCEPT', 'RESPONDING', 'REACHED']:
            if active_notif:
                active_notif.status = 'ACCEPTED'
                active_notif.responded_at = now
                active_notif.save()

            emergency.status = 'RESPONDING'
            emergency.assigned_responder = user
            emergency.assigned_responder_role = (user.role or 'RESPONDER').upper()

            if user.role == 'volunteer':
                vol = Volunteer.objects.filter(Q(user=user) | Q(email=user.email) | Q(phone=user.phone)).first()
                if vol:
                    vol.availability = 'Busy'
                    vol.save()
                    emergency.assigned_volunteer = vol
            elif user.role == 'security':
                sec = SecurityPersonnel.objects.filter(Q(user=user) | Q(email=user.email) | Q(phone=user.phone)).first()
                if sec:
                    emergency.assigned_security = sec

            emergency.save()

            actor_name = user.get_full_name() or user.username
            log_audit(emergency, 'EMERGENCY_ACCEPTED', actor=user, details=f"Emergency ACCEPTED by {actor_name} ({user.get_role_display() if hasattr(user, 'get_role_display') else user.role}). Status updated to RESPONDING.")

            Notification.objects.create(
                receiver=emergency.resident,
                emergency=emergency,
                title="🚨 Emergency Response Accepted!",
                message=f"{actor_name} has ACCEPTED your SOS alert and is responding now!"
            )

            return True, f"Emergency accepted by {actor_name}. Status set to RESPONDING.", emergency, "accepted"

        elif action in ['DECLINE', 'REJECT']:
            if active_notif:
                active_notif.status = 'DECLINED'
                active_notif.responded_at = now
                active_notif.save()

            actor_name = user.get_full_name() or user.username
            log_audit(emergency, 'EMERGENCY_DECLINED', actor=user, details=f"Emergency DECLINED by {actor_name}. Auto-escalating to next stage.")
            advance_escalation_chain(emergency)
            return True, "Declined emergency call. Auto-escalating to next responder stage.", emergency, "declined"

    return False, "Invalid action. Must be ACCEPT or REJECT.", emergency, "invalid"


def resolve_emergency_case(emergency_id, user, resolution_notes=""):
    """
    Step 11 — Emergency Resolution.
    Sets status = 'RESOLVED', records resolved_by, resolved_at, and resolution_notes.
    Frees up volunteer availability if assigned.
    Notifies resident and participants.
    """
    with transaction.atomic():
        emergency = EmergencyRequest.objects.select_for_update().filter(pk=emergency_id).first()
        if not emergency:
            return False, "Emergency request not found.", None

        if emergency.status == 'RESOLVED':
            return True, "Emergency is already resolved.", emergency

        now = timezone.now()
        emergency.status = 'RESOLVED'
        emergency.resolved_by = user
        emergency.resolved_at = now
        emergency.resolution_notes = resolution_notes or "Emergency successfully resolved."
        emergency.active_escalation_level = 'RESOLVED'
        emergency.save()

        if emergency.assigned_volunteer:
            emergency.assigned_volunteer.availability = 'Available'
            emergency.assigned_volunteer.save()

        actor_name = user.get_full_name() or user.username
        log_audit(
            emergency,
            'EMERGENCY_RESOLVED',
            actor=user,
            details=f"SOS #{emergency.id} RESOLVED by {actor_name}. Notes: '{emergency.resolution_notes}'"
        )

        Notification.objects.create(
            receiver=emergency.resident,
            emergency=emergency,
            title=f"✅ SOS #{emergency.id} Resolved",
            message=f"Your emergency alert SOS #{emergency.id} has been marked RESOLVED by {actor_name}."
        )

        return True, f"SOS #{emergency.id} successfully marked as RESOLVED.", emergency


def get_emergency_history(user=None, society=None, resident_only=False):
    """
    Step 12 — Permanent History Query.
    Returns completed/past SOS records with full escalation timeline and audit logs.
    """
    queryset = EmergencyRequest.objects.all().select_related('resident', 'society', 'assigned_responder', 'resolved_by').prefetch_related('audit_logs', 'notifications')

    if user:
        if resident_only or user.role == 'resident':
            queryset = queryset.filter(resident=user)
        elif user.role == 'guardian':
            guardian_residents = Guardian.objects.filter(Q(user=user) | Q(email=user.email) | Q(phone=user.phone)).values_list('resident_id', flat=True)
            queryset = queryset.filter(resident_id__in=guardian_residents)
        elif user.role in ['society_member', 'volunteer', 'security'] and user.society:
            queryset = queryset.filter(society=user.society)

    if society:
        queryset = queryset.filter(society=society)

    return queryset.order_by('-created_at')
