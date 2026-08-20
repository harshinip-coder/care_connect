from django.db import models
from accounts.models import User
from emergency.models import EmergencyRequest

class Notification(models.Model):

    receiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications"
    )

    emergency = models.ForeignKey(
        EmergencyRequest,
        on_delete=models.CASCADE
    )

    title = models.CharField(max_length=150)

    message = models.TextField()

    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
