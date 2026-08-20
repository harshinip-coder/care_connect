from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model

User = get_user_model()


class SafeAuthenticationMiddleware:
    """
    Middleware that catches User.DoesNotExist exceptions when evaluating request.user
    for stale/deleted user session keys in cookies.
    Flushes the invalid session and sets request.user to AnonymousUser safely,
    preventing HTTP 500 Server Error pages.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if hasattr(request, 'user'):
            try:
                # Force evaluation of SimpleLazyObject request.user
                _ = request.user.is_authenticated
            except (User.DoesNotExist, Exception):
                request.user = AnonymousUser()
                if hasattr(request, 'session'):
                    try:
                        request.session.flush()
                    except Exception:
                        pass

        response = self.get_response(request)
        return response
