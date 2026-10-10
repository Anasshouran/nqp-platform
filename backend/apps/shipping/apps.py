from django.apps import AppConfig


class ShippingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.shipping'
    verbose_name = 'شركات الملاحة والوكلاء'

    def ready(self):
        import apps.shipping.signals  # noqa: F401