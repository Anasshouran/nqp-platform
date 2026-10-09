"""فحص اتصال WHO المُتحقَّق منه — يُجري الفحص Controlled ويسجّله.

الاستخدام:
    python manage.py who_verify_connectivity
    python manage.py who_verify_connectivity --json
    python manage.py who_verify_connectivity --no-record   # تشخيص بلا كتابة

الافتراضي يكتب سجلاً واحداً في ``WHOSyncLog`` بعملية ``STATUS_CHECK``.
لا يرسل أي حدث IHR ولا يزامن أي مرض — طلب واحد مصادَق فقط.

رمز الخروج: 0 عند ``READY``، و1 عند ``ERROR`` أو أي حالة غير متحقَّق منها.
"""

import json

from django.core.management.base import BaseCommand, CommandError

from apps.who.services.connectivity import (
    ConnectivityState,
    record_connectivity_check,
    verify_icd11_connectivity,
)


class Command(BaseCommand):
    help = 'يجري فحص اتصال WHO الموثّق (OAuth + مورد ICD) ويسجّل النتيجة دون أي إرسال بيانات.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--json',
            action='store_true',
            dest='as_json',
            help='إخراج JSON صالح للمعالجة الآلية.',
        )
        parser.add_argument(
            '--no-record',
            action='store_true',
            dest='no_record',
            help='لا يكتب أي سجل — تشخيص قراءة فقط.',
        )

    def handle(self, *args, **options):
        result = verify_icd11_connectivity()
        if not options['no_record']:
            record_connectivity_check(result)

        payload = result.as_payload()
        if options['no_record']:
            payload['recorded'] = False
        else:
            payload['recorded'] = not options['no_record']

        if options['as_json']:
            # checked_at يُسلسَل كنص قبل الطباعة.
            serialised = dict(payload)
            serialised['checked_at'] = payload['checked_at'].isoformat() if payload['checked_at'] else None
            self.stdout.write(json.dumps(serialised, ensure_ascii=False, indent=2, sort_keys=True))
        else:
            self.stdout.write(f"state            : {payload['state']}")
            self.stdout.write(f"verified         : {payload['verified']}")
            self.stdout.write(f"oauth_verified   : {payload['oauth_verified']}")
            self.stdout.write(f"api_verified     : {payload['api_verified']}")
            self.stdout.write(f"endpoint         : {payload['endpoint'] or '—'}")
            self.stdout.write(f"http_status      : {payload['http_status'] or '—'}")
            self.stdout.write(f"latency_ms       : {payload['latency_ms'] or '—'}")
            self.stdout.write(f"checked_at       : {payload['checked_at'] or '—'}")
            self.stdout.write(f"recorded         : {payload['recorded']}")
            self.stdout.write(f"message          : {payload['message'] or '—'}")

        if result.state is not ConnectivityState.READY:
            raise CommandError(
                f'لم يتحقق الاتصال (state={result.state.value}) — لم تُرسل أي بيانات.'
            )
