from django import forms
from .models import EmergencyRequest


from accounts.models import User


class EmergencyRequestForm(forms.ModelForm):

    class Meta:
        model = EmergencyRequest

        fields = [
            'resident',
            'society',
            'block',
            'flat',
            'emergency_type',
            'location_address',
            'description',
            'status',
            'assigned_responder',
            'assigned_volunteer',
            'assigned_security',
            'resolution_notes',
        ]

        widgets = {
            'resident': forms.Select(attrs={'class': 'form-select'}),
            'society': forms.Select(attrs={'class': 'form-select'}),
            'block': forms.Select(attrs={'class': 'form-select'}),
            'flat': forms.Select(attrs={'class': 'form-select'}),
            'emergency_type': forms.Select(attrs={'class': 'form-select'}),
            'location_address': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. Block A, Flat 101'}),
            'description': forms.Textarea(attrs={'rows': 3, 'class': 'form-control', 'placeholder': 'Emergency Details'}),
            'status': forms.Select(attrs={'class': 'form-select'}),
            'assigned_responder': forms.Select(attrs={'class': 'form-select'}),
            'assigned_volunteer': forms.Select(attrs={'class': 'form-select'}),
            'assigned_security': forms.Select(attrs={'class': 'form-select'}),
            'resolution_notes': forms.Textarea(attrs={'rows': 2, 'class': 'form-control', 'placeholder': 'Resolution summary / notes'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['resident'].queryset = User.objects.filter(role='resident')