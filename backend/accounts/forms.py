from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import User, Guardian, Volunteer, SecurityPersonnel


class RegisterForm(UserCreationForm):
    role = forms.ChoiceField(
        choices=[
            ('resident', 'Resident'),
            ('guardian', 'Guardian'),
            ('society_member', 'Society Member'),
            ('security', 'Security'),
            ('volunteer', 'Volunteer'),
        ],
        widget=forms.Select(attrs={'class': 'form-select', 'id': 'roleSelect'})
    )

    class Meta:
        model = User
        fields = [
            'username',
            'first_name',
            'last_name',
            'email',
            'phone',
            'role',
            'society',
            'block',
            'flat',
            'employee_id',
            'skills',
            'guardian_type',
            'blood_group',
            'address',
        ]
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Username'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'First Name'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Last Name'}),
            'email': forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'email@example.com'}),
            'phone': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '+91 9876543210'}),
            'society': forms.Select(attrs={'class': 'form-select'}),
            'block': forms.Select(attrs={'class': 'form-select'}),
            'flat': forms.Select(attrs={'class': 'form-select'}),
            'employee_id': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Employee ID / Badge No.'}),
            'skills': forms.Textarea(attrs={'rows': 2, 'class': 'form-control', 'placeholder': 'Special Skills'}),
            'guardian_type': forms.Select(attrs={'class': 'form-select'}),
            'blood_group': forms.Select(attrs={'class': 'form-select'}),
            'address': forms.Textarea(attrs={'rows': 2, 'class': 'form-control', 'placeholder': 'Address'}),
        }


class AdminUserCreateForm(UserCreationForm):
    role = forms.ChoiceField(
        choices=User.ROLE_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select', 'id': 'adminRoleSelect'})
    )

    class Meta:
        model = User
        fields = [
            'username',
            'first_name',
            'last_name',
            'email',
            'phone',
            'role',
            'society',
            'block',
            'flat',
            'employee_id',
            'skills',
            'guardian_type',
            'blood_group',
            'address',
        ]
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Username'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'First Name'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Last Name'}),
            'email': forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'email@example.com'}),
            'phone': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '+91 9876543210'}),
            'society': forms.Select(attrs={'class': 'form-select'}),
            'block': forms.Select(attrs={'class': 'form-select'}),
            'flat': forms.Select(attrs={'class': 'form-select'}),
            'employee_id': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Employee ID / Badge No.'}),
            'skills': forms.Textarea(attrs={'rows': 2, 'class': 'form-control', 'placeholder': 'Special Skills'}),
            'guardian_type': forms.Select(attrs={'class': 'form-select'}),
            'blood_group': forms.Select(attrs={'class': 'form-select'}),
            'address': forms.Textarea(attrs={'rows': 2, 'class': 'form-control', 'placeholder': 'Address'}),
        }


class ResidentForm(forms.ModelForm):

    class Meta:
        model = User

        fields = [
            'username',
            'first_name',
            'last_name',
            'email',
            'phone',
            'gender',
            'blood_group',
            'dob',
            'address',
            'society',
            'block',
            'flat',
            'profile_photo',
            'is_active',
        ]

        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Username'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'First Name'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Last Name'}),
            'email': forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'email@example.com'}),
            'phone': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '+91 9876543210'}),
            'gender': forms.Select(attrs={'class': 'form-select'}),
            'blood_group': forms.Select(attrs={'class': 'form-select'}),
            'dob': forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}),
            'address': forms.Textarea(attrs={'rows': 2, 'class': 'form-control', 'placeholder': 'Full Residential Address'}),
            'society': forms.Select(attrs={'class': 'form-select', 'id': 'id_society'}),
            'block': forms.Select(attrs={'class': 'form-select', 'id': 'id_block'}),
            'flat': forms.Select(attrs={'class': 'form-select', 'id': 'id_flat'}),
            'profile_photo': forms.FileInput(attrs={'class': 'form-control'}),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }


class ResidentAddForm(UserCreationForm):
    role = forms.CharField(widget=forms.HiddenInput(), initial='resident')

    class Meta:
        model = User
        fields = [
            'username',
            'first_name',
            'last_name',
            'email',
            'phone',
            'gender',
            'blood_group',
            'dob',
            'address',
            'society',
            'block',
            'flat',
            'profile_photo',
        ]
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Username'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'First Name'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Last Name'}),
            'email': forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'email@example.com'}),
            'phone': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '+91 9876543210'}),
            'gender': forms.Select(attrs={'class': 'form-select'}),
            'blood_group': forms.Select(attrs={'class': 'form-select'}),
            'dob': forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}),
            'address': forms.Textarea(attrs={'rows': 2, 'class': 'form-control', 'placeholder': 'Full Address'}),
            'society': forms.Select(attrs={'class': 'form-select', 'id': 'id_society'}),
            'block': forms.Select(attrs={'class': 'form-select', 'id': 'id_block'}),
            'flat': forms.Select(attrs={'class': 'form-select', 'id': 'id_flat'}),
            'profile_photo': forms.FileInput(attrs={'class': 'form-control'}),
        }


class ProfileUpdateForm(forms.ModelForm):

    class Meta:
        model = User

        fields = [
            'first_name',
            'last_name',
            'email',
            'phone',
            'gender',
            'blood_group',
            'dob',
            'address',
            'society',
            'block',
            'flat',
            'profile_photo',
        ]

        widgets = {
            'first_name': forms.TextInput(attrs={'class': 'form-control'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'phone': forms.TextInput(attrs={'class': 'form-control'}),
            'gender': forms.Select(attrs={'class': 'form-select'}),
            'blood_group': forms.Select(attrs={'class': 'form-select'}),
            'dob': forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}),
            'address': forms.Textarea(attrs={'rows': 2, 'class': 'form-control'}),
            'society': forms.Select(attrs={'class': 'form-select'}),
            'block': forms.Select(attrs={'class': 'form-select'}),
            'flat': forms.Select(attrs={'class': 'form-select'}),
            'profile_photo': forms.FileInput(attrs={'class': 'form-control'}),
        }


class GuardianForm(forms.ModelForm):
    class Meta:
        model = Guardian
        fields = [
            'resident',
            'first_name',
            'last_name',
            'email',
            'phone',
            'relationship',
            'address',
            'is_primary',
            'availability',
        ]

        widgets = {
            'resident': forms.Select(attrs={'class': 'form-select'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'First Name'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Last Name'}),
            'email': forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'guardian@example.com'}),
            'phone': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '+91 9876543210'}),
            'relationship': forms.Select(attrs={'class': 'form-select'}),
            'address': forms.Textarea(attrs={'rows': 2, 'class': 'form-control', 'placeholder': 'Guardian Address'}),
            'is_primary': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'availability': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Availability'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['resident'].queryset = User.objects.filter(role='resident')


class VolunteerForm(forms.ModelForm):
    class Meta:
        model = Volunteer
        fields = [
            'first_name',
            'last_name',
            'email',
            'phone',
            'society',
            'block',
            'blood_group',
            'volunteer_type',
            'skills',
            'experience',
            'address',
            'availability',
        ]

        widgets = {
            'first_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'First Name'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Last Name'}),
            'email': forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'volunteer@example.com'}),
            'phone': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '+91 9876543210'}),
            'society': forms.Select(attrs={'class': 'form-select'}),
            'block': forms.Select(attrs={'class': 'form-select'}),
            'blood_group': forms.Select(choices=User.BLOOD_GROUP_CHOICES, attrs={'class': 'form-select'}),
            'volunteer_type': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. Emergency Volunteer'}),
            'skills': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. First Aid, CPR'}),
            'experience': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Experience'}),
            'address': forms.Textarea(attrs={'rows': 2, 'class': 'form-control', 'placeholder': 'Volunteer Address'}),
            'availability': forms.Select(attrs={'class': 'form-select'}),
        }


class SecurityPersonnelForm(forms.ModelForm):
    class Meta:
        model = SecurityPersonnel
        fields = [
            'first_name',
            'last_name',
            'email',
            'phone',
            'society',
            'shift',
            'status',
            'assigned_block',
            'gate_location',
            'emergency_phone',
        ]

        widgets = {
            'first_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'First Name'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Last Name'}),
            'email': forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'security@example.com'}),
            'phone': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '+91 9876543210'}),
            'society': forms.Select(attrs={'class': 'form-select'}),
            'shift': forms.Select(attrs={'class': 'form-select'}),
            'status': forms.Select(attrs={'class': 'form-select'}),
            'assigned_block': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. Block A'}),
            'gate_location': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. Main Gate 1'}),
            'emergency_phone': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Emergency Phone'}),
        }