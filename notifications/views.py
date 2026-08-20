from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .models import EmergencyRequest

@login_required
def sos_request(request):

    if request.method == "POST":

        emergency = EmergencyRequest.objects.create(
            resident=request.user,
            emergency_type="Medical",
            message="",
            description="SOS Button Pressed",
            resolution_notes=""
        )

        return JsonResponse({

            "success": True,

            "message": "Emergency Created"

        })

    return JsonResponse({

        "success": False

    })