from datetime import date

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.finance.models import Fee, ServiceType
from apps.food_quarantine.models import FoodFee, QuarantineFee

QUARANTINE_CATEGORY_TO_SERVICE = {
    QuarantineFee.Category.SHIP_INSPECTION: ServiceType.INSPECTION,
    QuarantineFee.Category.HEALTH_SERVICES: ServiceType.OTHER,
    QuarantineFee.Category.VACCINATION: ServiceType.OTHER,
    QuarantineFee.Category.MEDICAL_FITNESS: ServiceType.OTHER,
    QuarantineFee.Category.PEST_CONTROL: ServiceType.PEST_CONTROL,
    QuarantineFee.Category.CERTIFICATE: ServiceType.CERTIFICATE,
    QuarantineFee.Category.VIOLATION: ServiceType.OTHER,
    QuarantineFee.Category.FOOD_IMPORT: ServiceType.FOOD_CONTROL,
    QuarantineFee.Category.FOOD_EXPORT: ServiceType.FOOD_CONTROL,
    QuarantineFee.Category.UNLOADING: ServiceType.INSPECTION,
    QuarantineFee.Category.MICRO_TEST: ServiceType.LAB,
    QuarantineFee.Category.CHEMICAL_TEST: ServiceType.LAB,
}

FOOD_FEE_TO_SERVICE = {
    FoodFee.FeeType.INSPECTION: ServiceType.INSPECTION,
    FoodFee.FeeType.SAMPLE: ServiceType.SAMPLING,
    FoodFee.FeeType.ANALYSIS: ServiceType.LAB,
    FoodFee.FeeType.CERTIFICATE: ServiceType.CERTIFICATE,
    FoodFee.FeeType.ADMIN: ServiceType.OTHER,
}


class Command(BaseCommand):
    help = 'بناء بنود الرسوم (Master Data) من تعرفة الكرنتينة 2025 وبنود رقابة الأغذية الحالية.'

    def add_arguments(self, parser):
        parser.add_argument('--year', type=int, default=2025, help='سنة التعرفة (افتراضي 2025)')

    @transaction.atomic
    def handle(self, *args, **options):
        year = options['year']
        created = 0
        skipped = 0

        quarantine_fees = QuarantineFee.objects.filter(year=year).order_by('category', 'order', 'id')
        for qf in quarantine_fees:
            code = f'QT-{qf.id}'
            service_type = QUARANTINE_CATEGORY_TO_SERVICE.get(qf.category, ServiceType.OTHER)
            if Fee.objects.filter(code=code).exists():
                skipped += 1
                continue
            Fee.objects.create(
                code=code,
                name_ar=qf.name_ar,
                service_type=service_type,
                unit='',
                amount_sdg=qf.amount_sdg,
                amount_usd=qf.amount_usd,
                currency='SDG' if qf.amount_sdg else 'USD',
                effective_from=date(year, 1, 1),
                effective_to=None,
                approved_by=qf.currency_note or '',
                legal_reference=f'تعرفة رسوم الكرنتينة {year}',
                year=year,
                is_active=qf.is_active,
            )
            created += 1

        for ff in FoodFee.objects.all():
            code = f'FF-{ff.id}'
            if Fee.objects.filter(code=code).exists():
                skipped += 1
                continue
            Fee.objects.create(
                code=code,
                name_ar=ff.name_ar,
                service_type=FOOD_FEE_TO_SERVICE.get(ff.fee_type, ServiceType.OTHER),
                unit=ff.unit or '',
                amount_sdg=ff.amount,
                amount_usd=None,
                currency='SDG',
                effective_from=date(ff.year or 2025, 1, 1) if hasattr(ff, 'year') and ff.year else date(2025, 1, 1),
                effective_to=None,
                approved_by='',
                legal_reference='بنود خاصة برقابة الأغذية',
                year=2025,
                is_active=ff.is_active,
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(f'بنود الرسوم: أنشئ {created}، تخطّى (موجود) {skipped}'))