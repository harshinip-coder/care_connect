import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'careconnect.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser
from emergency.views import create_sos_api

rf = RequestFactory()
req = rf.post('/api/emergency/sos/')
req.user = AnonymousUser()

res = create_sos_api(req)
print("Post Anonymous Status:", res.status_code)
print("Post Anonymous Content:", res.content.decode('utf-8'))

req_get = rf.get('/api/emergency/sos/')
req_get.user = AnonymousUser()
res_get = create_sos_api(req_get)
print("Get Anonymous Status:", res_get.status_code)
print("Get Anonymous Content:", res_get.content.decode('utf-8'))
