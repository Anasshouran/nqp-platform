import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.laboratory.models import (
    LabEquipment,
    LabSection,
    LabTestCatalog,
    Reagent,
    ReagentLot,
    SampleNumberCounter,
    StorageLocation,
)


SECTIONS = [
    ('NQL-REC', 'استقبال العينات', 'Sample Reception', 'RECEPTION'),
    ('NQL-MIC', 'الأمراض المعدية والأحياء الدقيقة', 'Infectious Diseases & Microbiology', 'MICROBIOLOGY'),
    ('NQL-MOL', 'الأحياء الجزيئية', 'Molecular Biology', 'MOLECULAR'),
    ('NQL-FOO', 'سلامة الأغذية', 'Food Safety', 'FOOD'),
    ('NQL-WAT', 'المياه والبيئة', 'Water & Environment', 'WATER'),
    ('NQL-REF', 'المختبر المرجعي', 'Reference Laboratory', 'REFERENCE'),
]

TEST_CATALOG = [
    # (code, name_ar, name_en, section_code, order)
    ('NQL-MIC-CUL', 'زراعة وتنمية', 'Culture', 'NQL-MIC', 1),
    ('NQL-MIC-BAC', 'فحص بكتيري', 'Bacteriology', 'NQL-MIC', 2),
    ('NQL-MIC-PAR', 'فحص طفيليات', 'Parasitology', 'NQL-MIC', 3),
    ('NQL-MIC-MYC', 'فحص فطريات', 'Mycology', 'NQL-MIC', 4),
    ('NQL-MOL-PCR', 'PCR', 'PCR', 'NQL-MOL', 1),
    ('NQL-MOL-RTP', 'RT-PCR', 'RT-PCR', 'NQL-MOL', 2),
    ('NQL-MOL-GEN', 'كشف جزيئي', 'Molecular Detection', 'NQL-MOL', 3),
    ('NQL-MOL-SEQ', 'تتابع جيني', 'Sequencing', 'NQL-MOL', 4),
    ('NQL-FOO-SAL', 'Salmonella', 'Salmonella', 'NQL-FOO', 1),
    ('NQL-FOO-ECO', 'E. coli', 'E. coli', 'NQL-FOO', 2),
    ('NQL-FOO-COL', 'بكتيريا القولون الكلية', 'Total Coliform', 'NQL-FOO', 3),
    ('NQL-FOO-YEA', 'فطريات وخمائر', 'Yeast & Mold', 'NQL-FOO', 4),
    ('NQL-FOO-AFL', 'السموم الفطرية Aflatoxin', 'Aflatoxin', 'NQL-FOO', 5),
    ('NQL-FOO-CHM', 'فحص كيميائي', 'Chemical Analysis', 'NQL-FOO', 6),
    ('NQL-WAT-DRW', 'مياه الشرب', 'Drinking Water', 'NQL-WAT', 1),
    ('NQL-WAT-MIC', 'ميكروبيولوجي المياه', 'Water Microbiology', 'NQL-WAT', 2),
    ('NQL-WAT-CHM', 'كيمياء المياه', 'Water Chemistry', 'NQL-WAT', 3),
    ('NQL-WAT-ENV', 'عينات بيئية', 'Environmental Samples', 'NQL-WAT', 4),
]

EQUIPMENT = [
    # (name_ar, name_en, model, serial, section_code, last_cal, next_cal)
    ('جهاز PCR', 'PCR Analyzer', 'AriaMx', 'PCR-01', 'NQL-MOL', 30, 330),
    ('جهاز RT-PCR', 'RT-PCR System', 'CFX96', 'RTP-01', 'NQL-MOL', 45, 320),
    ('حاضنة ميكروبيولوجية', 'Microbiology Incubator', 'INC-200', 'INC-01', 'NQL-MIC', 20, 340),
    ('أوتوكلاف تعقيم', 'Autoclave', 'AST-4', 'ATC-01', 'NQL-MIC', 15, 350),
    ('ميكروسكوب', 'Microscope', 'BX43', 'MIC-01', 'NQL-MIC', 60, 300),
    ('مطياف ضوئي', 'Spectrophotometer', 'UV-1900', 'SPC-01', 'NQL-FOO', 40, 320),
    ('جهاز قياس pH', 'pH Meter', 'pH-700', 'PH-01', 'NQL-WAT', 25, 335),
    ('جهاز مطياف الكتلة', 'Mass Spectrometer', 'LCMS-8050', 'MS-01', 'NQL-REF', 90, 270),
]

STORAGE = [
    ('مخزن الكواشف الرئيسي', 'STORE', '25°C', '30-60%'),
    ('غرفة التبريد -20°', 'ROOM', '-20°C', 'var'),
    ('ثلاجة 4°', 'CABINET', '4°C', '40%'),
    ('رف المواد القياسية', 'SHELF', '25°C', '30-60%'),
]

REAGENTS = [
    # (name_ar, material_type, section_code, unit, min, reorder, max, lot, qty, expiry_days)
    ('مزيج PCR', 'REAGENT', 'NQL-MOL', 'ml', 5, 8, 50, 'PCR-LOT-001', 40, 120),
    ('وسط زرعي أجار', 'CULTURE_MEDIA', 'NQL-MIC', 'g', 10, 20, 200, 'AGAR-LOT-011', 150, 200),
    ('وسط ماكونكي', 'CULTURE_MEDIA', 'NQL-FOO', 'g', 10, 15, 150, 'MCK-LOT-021', 120, 180),
    ('مذيب أسيتونتريل', 'CHEMICAL', 'NQL-FOO', 'L', 2, 4, 40, 'ACN-LOT-031', 8, 240),
    ('محلول معايرة pH', 'SOLUTION', 'NQL-WAT', 'L', 1, 2, 15, 'PH-LOT-041', 6, 90),
    ('مادة مرجعية Aflatoxin', 'CRM', 'NQL-REF', 'mg', 1, 1, 10, 'AFL-LOT-051', 3, 60),
]


class Command(BaseCommand):
    help = 'زرع بنية المعمل القومي للحجر الصحي (NQLIS): الأقسام، الفحوص، الأجهزة، المخزون، والمحاليل.'

    def handle(self, *args, **options):
        today = timezone.localdate()

        section_by_code = {}
        for code, name_ar, name_en, kind in SECTIONS:
            section, created = LabSection.objects.update_or_create(
                code=code,
                defaults={
                    'name_ar': name_ar,
                    'name_en': name_en,
                    'kind': kind,
                    'order': SECTIONS.index((code, name_ar, name_en, kind)) + 1,
                    'is_active': True,
                },
            )
            section_by_code[code] = section

        catalog_count = 0
        for code, name_ar, name_en, sec_code, order in TEST_CATALOG:
            _, created = LabTestCatalog.objects.update_or_create(
                code=code,
                defaults={
                    'name_ar': name_ar,
                    'name_en': name_en,
                    'section': section_by_code[sec_code],
                    'sort_order': order,
                    'is_active': True,
                },
            )
            catalog_count += 1 if created else 0

        for name_ar, name_en, model, serial, sec_code, last_cal, next_cal in EQUIPMENT:
            LabEquipment.objects.update_or_create(
                serial_number=serial,
                defaults={
                    'name_ar': name_ar,
                    'name_en': name_en,
                    'model_number': model,
                    'section': section_by_code[sec_code],
                    'status': LabEquipment.EquipmentStatus.OPERATIONAL,
                    'last_calibrated': today - datetime.timedelta(days=last_cal),
                    'next_calibration_due': today + datetime.timedelta(days=next_cal),
                },
            )

        storage_by_name = {}
        for name, loc_type, temp, humidity in STORAGE:
            loc, _ = StorageLocation.objects.get_or_create(
                name=name,
                defaults={
                    'location_type': loc_type,
                    'temperature': temp,
                    'humidity': humidity,
                },
            )
            storage_by_name[name] = loc

        reagent_count = 0
        for (name_ar, material_type, sec_code, unit, minimum, reorder, maximum,
             lot, qty, expiry_days) in REAGENTS:
            reagent, created = Reagent.objects.update_or_create(
                name_ar=name_ar,
                defaults={
                    'material_type': material_type,
                    'section': section_by_code[sec_code],
                    'unit': unit,
                    'min_stock': minimum,
                    'reorder_level': reorder,
                    'max_stock': maximum,
                },
            )
            reagent_count += 1 if created else 0
            ReagentLot.objects.get_or_create(
                reagent=reagent,
                lot_number=lot,
                defaults={
                    'expiry_date': today + datetime.timedelta(days=expiry_days),
                    'quantity': qty,
                    'unit': unit,
                    'status': ReagentLot.LotStatus.VALID,
                },
            )

        counter, _ = SampleNumberCounter.objects.get_or_create(
            year=today.year, defaults={'last_sequence': 0}
        )

        self.stdout.write(self.style.SUCCESS(
            f'تم زرع NQLIS: {len(SECTIONS)} قسم، {catalog_count} فحص متاح، '
            f'{len(EQUIPMENT)} جهاز، {len(STORAGE)} موقع تخزين، '
            f'{reagent_count} مادة، عداد {counter.year} عند {counter.last_sequence}.'
        ))