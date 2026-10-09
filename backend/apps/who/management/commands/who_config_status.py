"""تشخيص إعدادات تكامل WHO — قراءة فقط، بلا شبكة وبلا قاعدة بيانات.

الاستخدام:
    python manage.py who_config_status
    python manage.py who_config_status --json

رمز الخروج: 0 إذا لم تكن هناك إعدادات مشوّهة (INVALID)، و1 عند وجودها.
"""

import json

from django.core.management.base import BaseCommand, CommandError

from apps.who.config import ConfigurationState, describe_configurations


class Command(BaseCommand):
    help = 'يعرض حالة إعدادات WHO / ICD-11 / IHR بدون أي اتصال خارجي أو كتابة.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--json',
            action='store_true',
            dest='as_json',
            help='إخراج JSON صالح للمعالجة الآلية.',
        )

    def handle(self, *args, **options):
        report = describe_configurations()
        invalid = any(
            section.get('state') == ConfigurationState.INVALID.value
            for key, section in report.items()
            if isinstance(section, dict) and 'state' in section
        )

        if options['as_json']:
            self.stdout.write(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True))
        else:
            self.stdout.write(
                f"WHO_ENABLED = {report['enabled']}   |   WHO_TIMEOUT = {report['timeout_seconds']}s"
            )
            for key in ('icd11', 'ihr'):
                section = report[key]
                self.stdout.write('')
                self.stdout.write(f"[{section['namespace']}] state={section['state']}")
                for field, value in section.items():
                    if field == 'namespace':
                        continue
                    self.stdout.write(f'  {field}: {value}')

        if invalid:
            raise CommandError('إعدادات WHO غير صالحة (INVALID) — راجع issues أعلاه.')
