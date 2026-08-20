from django import forms
from .models import Society, Block, Flat


class SocietyForm(forms.ModelForm):
    class Meta:
        model = Society
        fields = ['name', 'address', 'city', 'state', 'pincode']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Society Name'}),
            'address': forms.Textarea(attrs={'rows': 2, 'class': 'form-control', 'placeholder': 'Full Society Address'}),
            'city': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'City'}),
            'state': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'State'}),
            'pincode': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Pincode'}),
        }


class BlockForm(forms.ModelForm):
    class Meta:
        model = Block
        fields = ['society', 'block_name', 'total_floors']
        widgets = {
            'society': forms.Select(attrs={'class': 'form-select'}),
            'block_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. Block A'}),
            'total_floors': forms.NumberInput(attrs={'class': 'form-control', 'placeholder': 'Total Floors'}),
        }


class FlatForm(forms.ModelForm):
    society = forms.ModelChoiceField(
        queryset=Society.objects.all(),
        required=False,
        widget=forms.Select(attrs={'class': 'form-select', 'id': 'id_society_select'}),
        help_text="Select society to filter blocks"
    )

    class Meta:
        model = Flat
        fields = ['society', 'block', 'flat_number', 'floor', 'occupied']
        widgets = {
            'block': forms.Select(attrs={'class': 'form-select', 'id': 'id_block_select'}),
            'flat_number': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. 101, A-202'}),
            'floor': forms.NumberInput(attrs={'class': 'form-control', 'placeholder': 'Floor Number'}),
            'occupied': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk and self.instance.block:
            self.fields['society'].initial = self.instance.block.society

    def clean(self):
        cleaned_data = super().clean()
        society = cleaned_data.get('society')
        block = cleaned_data.get('block')

        if society and block and block.society != society:
            raise forms.ValidationError(f"Block '{block.block_name}' does not belong to Society '{society.name}'. Please choose a block within the selected society.")
        return cleaned_data