import urllib.request
import json

try:
    req = urllib.request.Request("http://127.0.0.1:8000/api/auth/me/")
    res = urllib.request.urlopen(req)
    print("Live Server Status:", res.status)
    print("Response Content:", res.read().decode('utf-8'))
except Exception as e:
    print("Live Server Check Result:", e)
