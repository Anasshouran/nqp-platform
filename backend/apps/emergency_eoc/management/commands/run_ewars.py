from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'تشغيل محرك الإنذار المبكر (EWARS) وتوليد الإنذارات للأمراض واجبة الإبلاغ'

    def handle(self, *args, **options):
        from apps.emergency_eoc.services import compute_ewars

        alerts = compute_ewars()
        if alerts:
            self.stdout.write(self.style.SUCCESS(f'توليد {len(alerts)} إنذاراً (EWARS).'))
        else:
            self.stdout.write('لا توجد تجاوزات لعتبات الإنذار في هذه الجولة.')