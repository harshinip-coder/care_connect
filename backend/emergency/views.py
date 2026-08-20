import json
import functools
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.utils import timezone
from django.db.models import Q
from django.contrib import messages

from .models import EmergencyRequest, EmergencyNotification, EmergencyAuditLog
from .forms import EmergencyRequestForm
from .services import (
    create_sos_incident,
    update_sos_details,
    evaluate_emergency_timeouts,
    process_response,
    resolve_emergency_case,
    get_emergency_history,
    get_sos_timeout,
    log_audit
)
from notifications.models import Notification


def api_login_required(view_func):
    @functools.wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({
                "success": False,
                "authenticated": False,
                "message": "Authentication required. Please log in to continue."
            }, status=401)
        return view_func(request, *args, **kwargs)
    return _wrapped_view


def serialize_emergency(emergency, current_user=None):
    evaluate_emergency_timeouts(emergency)
    emergency.refresh_from_db()

    active_notif = emergency.notifications.filter(status='PENDING').first()
    seconds_remaining = 0
    if active_notif and active_notif.timeout_at:
        delta = (active_notif.timeout_at - timezone.now()).total_seconds()
        seconds_remaining = max(0, int(delta))

    stages_def = [
        'PRIMARY_GUARDIAN',
        'SECONDARY_GUARDIAN',
        'SOCIETY_MEMBER',
        'VOLUNTEER',
        'EMERGENCY_CONTACT',
        'ADMIN'
    ]
    stages_data = []
    role_labels = {
        'PRIMARY_GUARDIAN': 'Primary Guardian',
        'SECONDARY_GUARDIAN': 'Secondary Guardian',
        'SOCIETY_MEMBER': 'Society Member',
        'VOLUNTEER': 'Volunteer',
        'EMERGENCY_CONTACT': 'Emergency Contact / Security',
        'ADMIN': 'Admin Case Escalation'
    }

    for stage_key in stages_def:
        notif = emergency.notifications.filter(recipient_role=stage_key).last()
        stages_data.append({
            'role': stage_key,
            'role_label': role_labels.get(stage_key, stage_key),
            'status': notif.status if notif else 'NOT_SENT',
            'sent_at': notif.sent_at.strftime('%I:%M:%S %p') if notif and notif.sent_at else None,
            'responded_at': notif.responded_at.strftime('%I:%M:%S %p') if notif and notif.responded_at else None,
            'recipient_name': (notif.recipient_user.get_full_name() or notif.recipient_user.username) if notif and notif.recipient_user else None
        })

    audit_data = []
    for log in emergency.audit_logs.all().order_by('timestamp'):
        audit_data.append({
            'action': log.action,
            'actor': (log.actor.get_full_name() or log.actor.username) if log.actor else 'System',
            'details': log.details,
            'timestamp': log.timestamp.strftime('%I:%M:%S %p')
        })

    can_respond = False
    if active_notif and current_user and current_user.is_authenticated:
        if current_user.is_superuser or current_user.role == 'admin':
            can_respond = True
        elif active_notif.recipient_user == current_user:
            can_respond = True
        elif active_notif.recipient_role == 'PRIMARY_GUARDIAN':
            from .services import is_user_guardian_for_resident
            can_respond = is_user_guardian_for_resident(current_user, emergency.resident, is_primary=True)
        elif active_notif.recipient_role == 'SECONDARY_GUARDIAN':
            from .services import is_user_guardian_for_resident
            can_respond = is_user_guardian_for_resident(current_user, emergency.resident, is_primary=False)
        elif active_notif.recipient_role == 'SOCIETY_MEMBER':
            can_respond = (current_user.role == 'society_member' and (not current_user.society or current_user.society == emergency.society))
        elif active_notif.recipient_role == 'VOLUNTEER':
            can_respond = (current_user.role == 'volunteer' and (not current_user.society or current_user.society == emergency.society))
        elif active_notif.recipient_role in ['EMERGENCY_CONTACT', 'SECURITY']:
            can_respond = (current_user.role == 'security' and (not current_user.society or current_user.society == emergency.society))
        elif active_notif.recipient_role == 'ADMIN':
            can_respond = (current_user.role == 'admin' or current_user.is_superuser)

    if not can_respond and current_user and current_user.is_authenticated:
        if (current_user.is_superuser or current_user.role == 'admin') and emergency.status not in ['RESOLVED', 'CANCELLED']:
            can_respond = True



    res_user = emergency.resident
    society_name = 'CareConnect Residency'
    if emergency.society and hasattr(emergency.society, 'name'):
        society_name = str(emergency.society.name)
    elif res_user and hasattr(res_user, 'society') and res_user.society:
        society_name = str(res_user.society.name)

    block_name = 'N/A'
    if emergency.block and hasattr(emergency.block, 'block_name'):
        block_name = str(emergency.block.block_name)
    elif res_user and hasattr(res_user, 'block') and res_user.block:
        block_name = str(res_user.block.block_name)

    flat_name = 'N/A'
    if emergency.flat and hasattr(emergency.flat, 'flat_number'):
        flat_name = str(emergency.flat.flat_number)
    elif res_user and hasattr(res_user, 'flat') and res_user.flat:
        flat_name = str(res_user.flat.flat_number)

    res_name = 'Unknown Resident'
    res_username = ''
    res_id = None
    if res_user:
        res_id = res_user.id
        res_username = res_user.username or ''
        res_name = res_user.get_full_name() if hasattr(res_user, 'get_full_name') and res_user.get_full_name() else res_username

    return {
        'id': emergency.id,
        'resident_id': res_id,
        'resident_name': res_name,
        'resident_username': res_username,
        'society': society_name,
        'block': block_name,
        'flat': flat_name,
        'emergency_type': emergency.emergency_type,
        'message': emergency.message,
        'description': emergency.description,
        'status': emergency.status,
        'status_display': emergency.get_status_display(),
        'active_escalation_level': emergency.active_escalation_level,
        'location_address': emergency.location_address,
        'latitude': emergency.latitude,
        'longitude': emergency.longitude,
        'seconds_remaining': seconds_remaining,
        'timeout_config': get_sos_timeout(),
        'assigned_responder_name': (emergency.assigned_responder.get_full_name() or emergency.assigned_responder.username) if emergency.assigned_responder else None,
        'assigned_responder_role': emergency.assigned_responder_role,
        'resolved_by_name': (emergency.resolved_by.get_full_name() or emergency.resolved_by.username) if emergency.resolved_by else None,
        'resolution_notes': emergency.resolution_notes,
        'created_at': emergency.created_at.strftime('%I:%M:%S %p, %b %d %Y'),
        'resolved_at': emergency.resolved_at.strftime('%I:%M:%S %p, %b %d %Y') if emergency.resolved_at else None,
        'stages': stages_data,
        'audit_logs': audit_data,
        'is_active': emergency.status not in ['RESOLVED', 'CANCELLED'],
        'can_respond': can_respond
    }


# ==========================
# REST API ENDPOINTS
# ==========================

@csrf_exempt
@api_login_required
def create_sos_api(request):
    """
    Step 1 & 2 & 3 — Resident SOS Request Creation.
    Validates authenticated user, identifies society, creates ACTIVE emergency request,
    and starts Primary Guardian escalation.
    """
    if request.method == "GET":
        return my_active_emergency_api(request)

    if request.method != "POST":
        return JsonResponse({"success": False, "message": f"Method {request.method} not allowed. Use GET or POST."}, status=405)

    if request.user.role != 'resident':
        return JsonResponse({
            "success": False,
            "message": f"Only residents are authorized to trigger SOS emergency alerts. User role '{request.user.role}' is restricted."
        }, status=403)

    data = {}
    if request.body:
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            data = request.POST.dict()
    else:
        data = request.POST.dict()

    emergency_type = data.get("emergency_type", "Medical Emergency")
    description = (data.get("description") or "").strip()

    if emergency_type == "Other" and not description:
        return JsonResponse({
            "success": False,
            "message": "Description is required when selecting 'Other' emergency type."
        }, status=400)

    if not description:
        description = f"{emergency_type} Alert"

    lat = data.get("latitude")
    lng = data.get("longitude")
    address = data.get("location_address") or data.get("address") or ""

    try:
        if lat: lat = float(lat)
        if lng: lng = float(lng)
    except (ValueError, TypeError):
        lat, lng = None, None

    try:
        emergency, created = create_sos_incident(
            resident=request.user,
            emergency_type=emergency_type,
            description=description,
            lat=lat,
            lng=lng,
            address=address
        )

        status_code = 201 if created else 200

        return JsonResponse({
            "success": True,
            "created": created,
            "confirmation_title": "SOS Alert Sent Successfully" if created else "Active SOS Exists",
            "message": "SOS Alert Sent Successfully. Primary Guardian notified." if created else f"Active SOS #{emergency.id} is already in progress.",
            "emergency": serialize_emergency(emergency, request.user)
        }, status=status_code)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            "success": False,
            "message": f"Failed to create emergency incident: {str(e)}"
        }, status=500)


@csrf_exempt
@api_login_required
def update_sos_details_api(request, pk):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Method not allowed. Use POST."}, status=405)

    emergency = get_object_or_404(EmergencyRequest, pk=pk, resident=request.user)

    data = {}
    if request.body:
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            data = request.POST.dict()
    else:
        data = request.POST.dict()

    emergency_type = data.get("emergency_type")
    message = data.get("message")
    description = data.get("description")
    address = data.get("location_address") or data.get("address")
    lat = data.get("latitude")
    lng = data.get("longitude")

    try:
        if lat: lat = float(lat)
        if lng: lng = float(lng)
    except (ValueError, TypeError):
        lat, lng = None, None

    emergency = update_sos_details(
        emergency=emergency,
        emergency_type=emergency_type,
        message=message,
        description=description,
        lat=lat,
        lng=lng,
        address=address
    )

    return JsonResponse({
        "success": True,
        "message": "Emergency details updated successfully.",
        "emergency": serialize_emergency(emergency, request.user)
    })


@api_login_required
def emergency_detail_api(request, pk):
    emergency = get_object_or_404(EmergencyRequest, pk=pk)
    return JsonResponse({
        "success": True,
        "emergency": serialize_emergency(emergency, request.user)
    })


@csrf_exempt
@api_login_required
def accept_sos_api(request, pk):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Method not allowed. Use POST."}, status=405)
    success, message, emergency, res_status = process_response(pk, request.user, "ACCEPT")
    return JsonResponse({
        "success": success,
        "response_status": res_status,
        "message": message,
        "emergency": serialize_emergency(emergency, request.user) if emergency else None
    })


@csrf_exempt
@api_login_required
def reject_sos_api(request, pk):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Method not allowed. Use POST."}, status=405)
    success, message, emergency, res_status = process_response(pk, request.user, "REJECT")
    return JsonResponse({
        "success": success,
        "response_status": res_status,
        "message": message,
        "emergency": serialize_emergency(emergency, request.user) if emergency else None
    })


@csrf_exempt
@api_login_required
def respond_emergency_api(request, pk):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Method not allowed. Use POST."}, status=405)

    data = {}
    if request.body:
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            data = request.POST.dict()
    else:
        data = request.POST.dict()

    action = (data.get("action") or "").upper().strip()
    notes = data.get("resolution_notes") or data.get("notes") or ""

    if action == "RESOLVE":
        success, message, emergency = resolve_emergency_case(pk, request.user, notes)
        return JsonResponse({
            "success": success,
            "message": message,
            "emergency": serialize_emergency(emergency, request.user) if emergency else None
        })

    if not action:
        action = "ACCEPT"

    if action in ["ACCEPT", "DECLINE", "REJECT"]:
        success, message, emergency, res_status = process_response(pk, request.user, action)
        return JsonResponse({
            "success": success,
            "response_status": res_status,
            "message": message,
            "emergency": serialize_emergency(emergency, request.user) if emergency else None
        })

    emergency = get_object_or_404(EmergencyRequest, pk=pk)
    emergency.status = 'IN_PROGRESS'
    emergency.save()
    log_audit(emergency, f"RESPONDER_{action}", actor=request.user, details=f"Status updated to {action}")

    return JsonResponse({
        "success": True,
        "message": f"Status updated to {action}",
        "emergency": serialize_emergency(emergency, request.user)
    })


@csrf_exempt
@api_login_required
def resolve_emergency_api(request, pk):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Method not allowed. Use POST."}, status=405)

    data = {}
    if request.body:
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            data = request.POST.dict()
    else:
        data = request.POST.dict()

    notes = data.get("resolution_notes") or data.get("notes") or "Emergency resolved."
    success, message, emergency = resolve_emergency_case(pk, request.user, notes)

    return JsonResponse({
        "success": success,
        "message": message,
        "emergency": serialize_emergency(emergency, request.user) if emergency else None
    })


@csrf_exempt
@api_login_required
def cancel_emergency_api(request, pk):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Method not allowed. Use POST."}, status=405)

    if request.user.is_superuser or request.user.role == 'admin':
        emergency = get_object_or_404(EmergencyRequest, pk=pk)
    else:
        emergency = EmergencyRequest.objects.filter(pk=pk, resident=request.user).first()
        if not emergency:
            return JsonResponse({"success": False, "message": "Permission denied. Only the resident who triggered the SOS or an Admin can cancel this emergency."}, status=403)

    emergency.status = 'CANCELLED'
    emergency.save()
    log_audit(emergency, 'EMERGENCY_CANCELLED', actor=request.user, details=f"Emergency cancelled by {request.user.get_full_name() or request.user.username}.")

    return JsonResponse({
        "success": True,
        "message": "Emergency alert cancelled successfully.",
        "emergency": serialize_emergency(emergency, request.user)
    })


@api_login_required
def my_active_emergency_api(request):
    """
    Returns active emergency visible to the current authenticated user based on role and society.
    Evaluates stage timeouts dynamically across all active emergencies to ensure seamless real-time escalation.
    Enforces society isolation so users from Society A cannot see Society B emergencies.
    """
    user = request.user
    
    # Auto-evaluate timeouts on all unresolved emergencies
    active_incidents = EmergencyRequest.objects.exclude(status__in=['RESOLVED', 'CANCELLED'])
    for em in active_incidents:
        evaluate_emergency_timeouts(em)

    emergency = None

    if user.role == 'resident':
        emergency = EmergencyRequest.objects.filter(
            resident=user
        ).exclude(
            status__in=['RESOLVED', 'CANCELLED']
        ).first()

    if not emergency:
        # Check active notification targeted to this specific user
        emergency = EmergencyRequest.objects.filter(
            notifications__recipient_user=user,
            notifications__status='PENDING'
        ).exclude(
            status__in=['RESOLVED', 'CANCELLED']
        ).first()

    if not emergency and user.role == 'guardian':
        from accounts.models import Guardian
        u_name = (user.username or '').split('@')[0]
        guardian_residents = Guardian.objects.filter(
            Q(user=user) | 
            Q(username__iexact=user.username) | 
            Q(username__iexact=u_name) |
            Q(first_name__iexact=u_name) |
            (Q(email__iexact=user.email) & ~Q(email='')) |
            (Q(phone=user.phone) & ~Q(phone=''))
        ).values_list('resident_id', flat=True)

        if guardian_residents:
            emergency = EmergencyRequest.objects.filter(
                resident_id__in=guardian_residents
            ).exclude(
                status__in=['RESOLVED', 'CANCELLED']
            ).first()


    if not emergency:
        # Filter by role and society
        society_query = Q(society=user.society) if user.society else Q()
        role_map = {
            'security': ['SECURITY', 'EMERGENCY_CONTACT'],
            'society_member': ['SOCIETY_MEMBER', 'SOCIETY'],
            'volunteer': ['VOLUNTEER'],
            'admin': ['PRIMARY_GUARDIAN', 'SECONDARY_GUARDIAN', 'SOCIETY_MEMBER', 'VOLUNTEER', 'EMERGENCY_CONTACT', 'SECURITY', 'SOCIETY', 'ADMIN']
        }
        target_roles = role_map.get(user.role, [])
        if target_roles:
            if user.role in ['society_member', 'volunteer', 'security'] and user.society:
                emergency = EmergencyRequest.objects.filter(
                    society_query,
                    active_escalation_level__in=target_roles
                ).exclude(
                    status__in=['RESOLVED', 'CANCELLED']
                ).first()
            else:
                emergency = EmergencyRequest.objects.filter(
                    active_escalation_level__in=target_roles
                ).exclude(
                    status__in=['RESOLVED', 'CANCELLED']
                ).first()


    if not emergency:
        emergency = EmergencyRequest.objects.filter(
            assigned_responder=user
        ).exclude(
            status__in=['RESOLVED', 'CANCELLED']
        ).first()

    if not emergency and (user.role == 'admin' or user.is_superuser):
        emergency = EmergencyRequest.objects.exclude(
            status__in=['RESOLVED', 'CANCELLED']
        ).first()

    if not emergency:
        return JsonResponse({"has_active": False, "emergency": None})

    return JsonResponse({
        "has_active": True,
        "emergency": serialize_emergency(emergency, user)
    })


@api_login_required
def emergency_history_api(request):
    """
    Step 12 — Permanent SOS History API.
    Returns completed and active emergency history records with full escalation timeline.
    """
    history_records = get_emergency_history(user=request.user)
    serialized = [serialize_emergency(em, request.user) for em in history_records]

    return JsonResponse({
        "success": True,
        "count": len(serialized),
        "emergencies": serialized
    })


@api_login_required
def list_sos_api(request):
    history_records = get_emergency_history(user=request.user)
    serialized = [serialize_emergency(em, request.user) for em in history_records]

    return JsonResponse({
        "success": True,
        "count": len(serialized),
        "emergencies": serialized
    })


@api_login_required
def notifications_list_api(request):
    user = request.user
    user_notifs = Notification.objects.filter(receiver=user).order_by('-created_at')[:20]
    unread_count = Notification.objects.filter(receiver=user, is_read=False).count()

    results = []
    for n in user_notifs:
        results.append({
            'id': n.id,
            'title': n.title,
            'message': n.message,
            'is_read': n.is_read,
            'emergency_id': n.emergency_id,
            'created_at': n.created_at.strftime('%I:%M %p')
        })

    return JsonResponse({
        "unread_count": unread_count,
        "notifications": results
    })


@csrf_exempt
@api_login_required
def mark_notification_read_api(request, pk):
    notif = get_object_or_404(Notification, pk=pk, receiver=request.user)
    notif.is_read = True
    notif.save()
    return JsonResponse({"success": True})


@csrf_exempt
@api_login_required
def mark_all_notifications_read_api(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Method not allowed. Use POST."}, status=405)
    
    # Update all notification records for the current user
    Notification.objects.filter(receiver=request.user, is_read=False).update(is_read=True)
    return JsonResponse({"success": True, "message": "All notifications marked as read."})


# ==========================
# TEMPLATE VIEWS
# ==========================

@login_required
def emergency_list(request):
    query = request.GET.get('q', '').strip()
    emergencies = EmergencyRequest.objects.select_related(
        'resident', 'society', 'block', 'flat', 'assigned_responder', 'assigned_volunteer', 'assigned_security'
    ).order_by("-created_at")

    if query:
        emergencies = emergencies.filter(
            Q(resident__username__icontains=query) |
            Q(resident__first_name__icontains=query) |
            Q(resident__last_name__icontains=query) |
            Q(emergency_type__icontains=query) |
            Q(location_address__icontains=query) |
            Q(description__icontains=query) |
            Q(status__icontains=query)
        )

    return render(request, "emergency/emergency_list.html", {
        "emergencies": emergencies,
        "query": query
    })


@login_required
def emergency_add(request):
    if request.method == "POST":
        form = EmergencyRequestForm(request.POST)
        if form.is_valid():
            em = form.save()
            messages.success(request, f"Emergency alert #{em.id} created successfully.")
            return redirect("emergency_list")
        else:
            messages.error(request, "Please correct the form errors below.")
    else:
        form = EmergencyRequestForm()
    return render(request, "emergency/emergency_add.html", {"form": form})


@login_required
def emergency_edit(request, pk):
    emergency = get_object_or_404(EmergencyRequest, pk=pk)
    if request.method == "POST":
        form = EmergencyRequestForm(request.POST, instance=emergency)
        if form.is_valid():
            form.save()
            messages.success(request, f"Emergency alert #{emergency.id} updated successfully.")
            return redirect("emergency_list")
        else:
            messages.error(request, "Please correct the form errors below.")
    else:
        form = EmergencyRequestForm(instance=emergency)
    return render(request, "emergency/emergency_edit.html", {"form": form, "emergency": emergency})


@login_required
def emergency_delete(request, pk):
    emergency = get_object_or_404(EmergencyRequest, pk=pk)
    if request.method == "POST":
        em_id = emergency.id
        emergency.delete()
        messages.success(request, f"Emergency alert #{em_id} deleted successfully.")
        return redirect("emergency_list")
    return render(request, "emergency/emergency_delete.html", {"emergency": emergency})


@login_required
def emergency_detail(request, pk):
    emergency = get_object_or_404(EmergencyRequest, pk=pk)
    details = serialize_emergency(emergency, request.user)
    return render(request, "emergency/emergency_detail.html", {
        "emergency": emergency,
        "details": details
    })


@login_required
def sos_request(request):
    return create_sos_api(request)