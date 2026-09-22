from django.core.management.base import BaseCommand, CommandError

from apps.surveillance.services.ewars_engine import EWARSEngine
from apps.surveillance.models.alert import AlertRule


class Command(BaseCommand):
    help = 'تشغيل تقييم قواعد الإنذار المبكر (EWARS) وإعادة حساب الإحصاءات الأساسية.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--sector', type=str, default=None,
            help='تقييد التقييم على قطاع معين (بالـ UUID).',
        )
        parser.add_argument(
            '--rule', type=str, default=None,
            help='تقييد التقييم على قاعدة واحدة (بالـ UUID).',
        )
        parser.add_argument(
            '--date-from', type=str, default=None,
            help='تاريخ بداية نافذة الرصد (YYYY-MM-DD).',
        )
        parser.add_argument(
            '--date-to', type=str, default=None,
            help='تاريخ نهاية نافذة الرصد (YYYY-MM-DD).',
        )
        parser.add_argument(
            '--baseline-only', action='store_true',
            help='إعادة حساب خطوط الأساس فقط دون توليد إنذارات.',
        )

    def handle(self, *args, **options):
        from datetime import date
        from django.utils.dateparse import parse_date

        sector = options.get('sector')
        rule_id = options.get('rule')
        date_from = parse_date(options['date_from']) if options.get('date_from') else None
        date_to = parse_date(options['date_to']) if options.get('date_to') else None

        if options['baseline_only']:
            rules = AlertRule.objects.filter(is_active=True)
            if rule_id:
                rules = rules.filter(id=rule_id)
            for rule in rules:
                stats = EWARSEngine.compute_baseline_statistics(
                    rule.disease, sector=sector, weeks=rule.baseline_weeks
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f'خط الأساس [{rule.name}]: {stats.get("cases", 0)} حالة، '
                        f'متوسط = {stats.get("mean", 0)}، انحراف = {stats.get("std_dev", 0)}'
                    )
                )
            return

        try:
            result = EWARSEngine.run_all_rules(
                sector=sector,
                date_from=date_from,
                date_to=date_to,
            )
        except Exception as exc:
            raise CommandError(f'فشل تشغيل EWARS: {exc}') from exc

        evaluated = result.get('evaluated_rules', 0)
        created = result.get('alerts_created', 0)
        self.stdout.write(
            self.style.SUCCESS(
                f'EWARS: تم تقييم {evaluated} قاعدة، وتم توليد {created} إنذار.'
            )
        )
        if created:
            self.stdout.write(self.style.SUCCESS('تم إرسال الإشعارات تلقائياً.'))