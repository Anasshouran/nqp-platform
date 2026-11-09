from django.apps import AppConfig


class RegistryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.registry"
    label = "registry"
    verbose_name = "السجل التنظيمي الوطني"

    def ready(self):
        # تسجيل signals للتدقيق التلقائي (M2 — D-1)
        from . import signals  # noqa: F401

