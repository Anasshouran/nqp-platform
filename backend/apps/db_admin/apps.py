from django.apps import AppConfig


class DbAdminConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.db_admin'
    verbose_name = 'إدارة قواعد البيانات'
