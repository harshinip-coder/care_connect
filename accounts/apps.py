from django.apps import AppConfig
from django.db.models.signals import post_migrate


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        def run_seed(sender, **kwargs):
            try:
                from .auto_seed import seed_default_users
                seed_default_users()
            except Exception as e:
                print(f"Auto seed error: {e}")

        post_migrate.connect(run_seed, sender=self)

