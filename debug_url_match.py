import os
import django
from django.urls import resolve, reverse

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'careconnect.settings')
django.setup()

paths_to_test = [
    '/api/emergency/sos/',
    '/api/emergency/sos',
    '/api/sos/',
    '/api/emergency/my-active/',
    '/api/notifications/',
    '/api/emergency/notifications/'
]

print("=== TESTING DJANGO URL RESOLVER ===")
for p in paths_to_test:
    try:
        match = resolve(p)
        print(f"Path '{p}' RESOLVED to view: {match.func.__name__} (url_name: {match.url_name})")
    except Exception as e:
        print(f"Path '{p}' FAILED TO RESOLVE: {e}")
