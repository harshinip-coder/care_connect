import urllib.request
import json

urls_to_test = [
    "http://127.0.0.1:8000/api/emergency/sos/",
    "http://127.0.0.1:8000/api/auth/me/",
]

for url in urls_to_test:
    req = urllib.request.Request(url)
    try:
        res = urllib.request.urlopen(req)
        print(f"URL: {url} -> Status {res.status}")
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f"URL: {url} -> HTTP {e.code} | Body: {body[:200]}")
    except Exception as e:
        print(f"URL: {url} -> ERROR {e}")
