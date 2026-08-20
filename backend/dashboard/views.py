import json
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db.models import Count, Q

from accounts.models import User, Guardian, Volunteer, SecurityPersonnel
from societies.models import Society, Block, Flat
from emergency.models import EmergencyRequest, EmergencyNotification
from notifications.models import Notification
from emergency.services import evaluate_emergency_timeouts


def get_common_dashboard_context(user):
    from django.utils import timezone
    one_week_ago = timezone.now() - timezone.timedelta(days=7)

    # Dynamic counts from DB
    resident_count = User.objects.filter(role="resident").count()
    guardian_count = Guardian.objects.count() or User.objects.filter(role="guardian").count()
    society_member_count = User.objects.filter(role="society_member").count()
    volunteer_count = Volunteer.objects.count() or User.objects.filter(role="volunteer").count()
    security_count = SecurityPersonnel.objects.count() or User.objects.filter(role="security").count()
    society_count = Society.objects.count()
    block_count = Block.objects.count()
    flat_count = Flat.objects.count()

    # Dynamic weekly increment counts
    res_week = User.objects.filter(role="resident", date_joined__gte=one_week_ago).count()
    grd_week = User.objects.filter(role="guardian", date_joined__gte=one_week_ago).count()
    soc_mem_week = User.objects.filter(role="society_member", date_joined__gte=one_week_ago).count()
    sec_week = SecurityPersonnel.objects.filter(created_at__gte=one_week_ago).count() if hasattr(SecurityPersonnel, 'created_at') else User.objects.filter(role="security", date_joined__gte=one_week_ago).count()
    vol_week = Volunteer.objects.filter(created_at__gte=one_week_ago).count() if hasattr(Volunteer, 'created_at') else User.objects.filter(role="volunteer", date_joined__gte=one_week_ago).count()

    total_users_count = User.objects.count()
    active_alerts_count = EmergencyRequest.objects.exclude(status__in=['RESOLVED', 'CANCELLED']).count()
    total_alerts_count = EmergencyRequest.objects.count()
    resolved_alerts_count = EmergencyRequest.objects.filter(status='RESOLVED').count()

    resolution_rate = round((resolved_alerts_count / total_alerts_count * 100), 1) if total_alerts_count > 0 else 0.0

    # Evaluate timeouts for all active emergencies before listing
    active_emergencies = EmergencyRequest.objects.exclude(status__in=['RESOLVED', 'CANCELLED'])
    for em in active_emergencies:
        evaluate_emergency_timeouts(em)

    recent_emergencies = EmergencyRequest.objects.select_related("resident").all().order_by("-created_at")[:10]

    emergencies_formatted = []
    for em in recent_emergencies:
        status_clean = "Active" if em.status in ['ACTIVE', 'PENDING', 'NOTIFYING_PRIMARY_GUARDIAN', 'NOTIFYING_SECONDARY_GUARDIAN', 'NOTIFYING_SECURITY', 'NOTIFYING_VOLUNTEER'] else "Resolved"
        if em.status == "IN_PROGRESS":
            status_clean = "In Progress"
        elif em.status == "CANCELLED":
            status_clean = "Cancelled"

        emergencies_formatted.append({
            "id": em.id,
            "code": f"SOS-{em.id:05d}",
            "type": em.emergency_type or "Medical Emergency",
            "resident_name": em.resident.get_full_name() or em.resident.username,
            "resident_avatar": f"https://ui-avatars.com/api/?name={em.resident.first_name}+{em.resident.last_name}&background=10b981&color=fff",
            "time_str": em.created_at.strftime("%I:%M %p"),
            "status": status_clean,
            "raw_status": em.status,
            "location": em.location_address or "Block A, Flat 101"
        })

    # Build dynamic notification items
    notifications_list = []
    if user and user.is_authenticated:
        n_qs = Notification.objects.filter(receiver=user).order_by("-created_at")[:10]
        if not n_qs.exists():
            latest_emergencies = EmergencyRequest.objects.all().order_by("-created_at")[:5]
            for em in latest_emergencies:
                Notification.objects.create(
                    receiver=user,
                    emergency=em,
                    title=f"{em.emergency_type or 'Emergency'} Alert",
                    message=f"Alert from {em.resident.get_full_name() or em.resident.username} at {em.location_address or 'Community'}",
                    is_read=False
                )
            n_qs = Notification.objects.filter(receiver=user).order_by("-created_at")[:10]

        for n in n_qs:
            notifications_list.append({
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "is_read": n.is_read,
                "time_str": n.created_at.strftime("%I:%M %p")
            })

    message_count = len([n for n in notifications_list if not n.get("is_read")]) if notifications_list else 0

    return {
        "resident_count": resident_count,
        "guardian_count": guardian_count,
        "society_member_count": society_member_count,
        "volunteer_count": volunteer_count,
        "security_count": security_count,
        "society_count": society_count,
        "block_count": block_count,
        "flat_count": flat_count,
        "res_week": res_week,
        "grd_week": grd_week,
        "soc_mem_week": soc_mem_week,
        "sec_week": sec_week,
        "vol_week": vol_week,
        "total_users_count": total_users_count,
        "active_alerts_count": active_alerts_count,
        "total_alerts_count": total_alerts_count,
        "resolution_rate": resolution_rate,
        "emergency_count": total_alerts_count,
        "message_count": message_count,
        "notifications_list": notifications_list,
        "recent_emergencies_formatted": emergencies_formatted,
    }


def dashboard(request):
    if request.user.is_authenticated:
        role = getattr(request.user, 'role', 'resident')
        if role == 'admin' or request.user.is_superuser:
            return redirect('admin_dashboard')
        elif role == 'resident':
            return redirect('resident_dashboard')
        elif role == 'guardian':
            return redirect('guardian_dashboard')
        elif role == 'society_member':
            return redirect('society_member_dashboard')
        elif role == 'security':
            return redirect('security_dashboard')
        elif role == 'volunteer':
            return redirect('volunteer_dashboard')
    context = get_common_dashboard_context(request.user)
    return render(request, "dashboard/dashboard.html", context)


@login_required
def admin_dashboard(request):
    user_role = (getattr(request.user, 'role', '') or '').lower().strip()
    if user_role != 'admin' and not request.user.is_superuser:
        return redirect('dashboard')
    context = get_common_dashboard_context(request.user)
    context["title"] = "Admin Management Dashboard"
    return render(request, "dashboard/admin_dashboard.html", context)


def admin_dashboard_stats_api(request):
    user = request.user if request.user.is_authenticated else None
    context = get_common_dashboard_context(user)
    return JsonResponse({
        "success": True,
        "stats": context
    })


@login_required
def resident_dashboard(request):
    user = request.user
    user_role = (getattr(user, 'role', '') or '').lower().strip()
    if user_role != 'resident' and user_role != 'admin' and not user.is_superuser:
        return redirect('dashboard')
    context = get_common_dashboard_context(user)
    context["title"] = "Resident Dashboard"

    guardians = Guardian.objects.filter(resident=user)
    primary_guardian = guardians.filter(is_primary=True).first()
    secondary_guardian = guardians.filter(is_primary=False).first()

    emergency_history = EmergencyRequest.objects.filter(resident=user).order_by("-created_at")

    context.update({
        "guardians": guardians,
        "primary_guardian": primary_guardian,
        "secondary_guardian": secondary_guardian,
        "emergency_history": emergency_history,
        "society_name": user.society.name if user.society else "CareConnect Society",
        "block_name": user.block.block_name if user.block else "Main Block",
        "flat_number": user.flat.flat_number if user.flat else "Flat 101",
    })
    return render(request, "dashboard/resident_dashboard.html", context)


@login_required
def guardian_dashboard(request):
    user = request.user
    user_role = (getattr(user, 'role', '') or '').lower().strip()
    if user_role != 'guardian' and user_role != 'admin' and not user.is_superuser:
        return redirect('dashboard')
    context = get_common_dashboard_context(user)
    context["title"] = "Guardian Dashboard"

    guardian_links = Guardian.objects.filter(Q(user=user) | Q(username=user.username) | Q(email=user.email) | Q(phone=user.phone))
    guardian_info = guardian_links.first()

    linked_residents = []
    if guardian_links.exists():
        for link in guardian_links:
            if link.resident and link.resident not in linked_residents:
                linked_residents.append(link.resident)

    guardian_emergencies = EmergencyRequest.objects.filter(
        resident__in=linked_residents
    ).order_by("-created_at")[:10]

    context.update({
        "guardian_info": guardian_info,
        "linked_residents": linked_residents,
        "guardian_links": guardian_links,
        "guardian_emergencies": guardian_emergencies,
    })
    return render(request, "dashboard/guardian_dashboard.html", context)


@login_required
def society_member_dashboard(request):
    user = request.user
    user_role = (getattr(user, 'role', '') or '').lower().strip()
    if user_role != 'society_member' and user_role != 'admin' and not user.is_superuser:
        return redirect('dashboard')
    context = get_common_dashboard_context(user)
    context["title"] = "Society Member Dashboard"

    society = user.society
    if society:
        res_count = User.objects.filter(role="resident", society=society).count()
        g_count = Guardian.objects.filter(resident__society=society).count()
        sec_count = SecurityPersonnel.objects.count()
        vol_count = Volunteer.objects.count()
        active_alerts = EmergencyRequest.objects.filter(
            resident__society=society
        ).exclude(status__in=['RESOLVED', 'CANCELLED']).count()
        society_emergencies = EmergencyRequest.objects.filter(
            resident__society=society
        ).order_by("-created_at")[:10]
    else:
        res_count = context["resident_count"]
        g_count = context["guardian_count"]
        sec_count = context["security_count"]
        vol_count = context["volunteer_count"]
        active_alerts = EmergencyRequest.objects.exclude(status__in=['RESOLVED', 'CANCELLED']).count()
        society_emergencies = EmergencyRequest.objects.all().order_by("-created_at")[:10]

    context.update({
        "society_residents_count": res_count,
        "society_guardians_count": g_count,
        "society_security_count": sec_count,
        "society_volunteers_count": vol_count,
        "society_active_alerts_count": active_alerts,
        "society_emergencies": society_emergencies,
        "society_obj": society,
    })
    return render(request, "dashboard/society_member_dashboard.html", context)


@login_required
def security_dashboard(request):
    user = request.user
    user_role = (getattr(user, 'role', '') or '').lower().strip()
    if user_role != 'security' and user_role != 'admin' and not user.is_superuser:
        return redirect('dashboard')
    context = get_common_dashboard_context(user)
    context["title"] = "Security Personnel Dashboard"

    security_info = SecurityPersonnel.objects.filter(Q(user=user) | Q(username=user.username) | Q(email=user.email)).first()

    security_alerts = EmergencyRequest.objects.exclude(
        status__in=['RESOLVED', 'CANCELLED']
    ).order_by("-created_at")

    context.update({
        "security_info": security_info,
        "security_alerts": security_alerts,
    })
    return render(request, "dashboard/security_dashboard.html", context)


@login_required
def volunteer_dashboard(request):
    user = request.user
    user_role = (getattr(user, 'role', '') or '').lower().strip()
    if user_role != 'volunteer' and user_role != 'admin' and not user.is_superuser:
        return redirect('dashboard')
    context = get_common_dashboard_context(user)
    context["title"] = "Volunteer Dashboard"

    volunteer_info = Volunteer.objects.filter(Q(user=user) | Q(username=user.username) | Q(email=user.email)).first()

    volunteer_alerts = EmergencyRequest.objects.exclude(
        status__in=['RESOLVED', 'CANCELLED']
    ).order_by("-created_at")

    context.update({
        "volunteer_info": volunteer_info,
        "volunteer_alerts": volunteer_alerts,
    })
    return render(request, "dashboard/volunteer_dashboard.html", context)