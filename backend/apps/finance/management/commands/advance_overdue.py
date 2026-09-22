from django.core.management.base import BaseCommand

from apps.finance.services import run_overdue_sweep


class Command(BaseCommand):
    help = 'تحويل الفواتير المتجاوزة لمدّة الاستحقاق إلى حالة OVERDUE (المتأخرات).'

    def handle(self, *args, **options):
        updated = run_overdue_sweep()
        self.stdout.write(self.style.SUCCESS(f'فواتير أصبحت متأخرة: {updated}'))