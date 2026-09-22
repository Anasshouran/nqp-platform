from django.core.management.base import BaseCommand

from apps.food_quarantine.models import LabParameter

PARAMETERS = [
    # الأحياء الدقيقة
    ('SALMONELLA', 'السالمونيلا', 'Salmonella', 'MICROBIOLOGY', '', 'ISO 6579', 'غائب / 25 جم'),
    ('ESCHERICHIA_COLI', 'الإشريكية القولونية', 'E. coli', 'MICROBIOLOGY', 'CFU/g', 'ISO 16649', '≤ 10'),
    ('LISTERIA', 'الليستيريا', 'Listeria monocytogenes', 'MICROBIOLOGY', '', 'ISO 11290', 'غائب / 25 جم'),
    ('COLIFORM', 'البكتيريا القولونية', 'Coliforms', 'MICROBIOLOGY', 'MPN/g', 'ISO 4832', '≤ 100'),
    ('YEAST_MOLD', 'الخمائر والعفن', 'Yeast & Mold', 'MICROBIOLOGY', 'CFU/g', 'ISO 21527', '≤ 100'),
    ('TOTAL_PLATE_COUNT', 'العدد الكلي للبكتيريا', 'Total Plate Count', 'MICROBIOLOGY', 'CFU/g', 'ISO 4833', '≤ 1000'),
    # الكيمياء
    ('MOISTURE', 'الرطوبة', 'Moisture', 'CHEMISTRY', '%', 'AOAC 925.10', 'حسب النوع'),
    ('FAT', 'الدهون', 'Fat', 'CHEMISTRY', '%', 'AOAC 922.06', 'حسب النوع'),
    ('PROTEIN', 'البروتين', 'Protein', 'CHEMISTRY', '%', 'AOAC 984.13', 'حسب النوع'),
    ('HEAVY_METALS', 'المعادن الثقيلة', 'Heavy Metals', 'CHEMISTRY', 'mg/kg', 'ICP-MS', 'حسب الحدود'),
    ('PESTICIDE_RESIDUE', 'بقايا المبيدات', 'Pesticide Residues', 'CHEMISTRY', 'mg/kg', 'GC-MS/MS', 'MRL'),
    ('FOOD_ADDITIVES', 'الإضافات الغذائية', 'Food Additives', 'CHEMISTRY', '', 'HPLC', 'حسب الحدود'),
    ('AFLATOXIN', 'السموم الفطرية (أفلاتوكسين)', 'Aflatoxins', 'CHEMISTRY', 'µg/kg', 'HPLC-FLD', '≤ 10'),
    # السموم
    ('CHEMICAL_TOXINS', 'السموم الكيميائية', 'Chemical Toxins', 'TOXICOLOGY', 'mg/kg', 'LC-MS/MS', 'حسب الحدود'),
    ('ENV_CONTAMINANTS', 'الملوثات البيئية', 'Environmental Contaminants', 'TOXICOLOGY', 'mg/kg', 'GC-MS', 'حسب الحدود'),
    # الجزيئي
    ('PCR_PATHOGEN', 'الكشف الجزيئي (PCR)', 'PCR Pathogen Detection', 'MOLECULAR', '', 'Real-Time PCR', 'سلبي'),
]


class Command(BaseCommand):
    help = 'بذر معاملات التحليل المخبري لمعمل رقابة الأغذية (FCLIS)'

    def handle(self, *args, **options):
        created = 0
        for i, (code, name_ar, name_en, bench, unit, method, reference) in enumerate(PARAMETERS):
            _, was_created = LabParameter.objects.update_or_create(
                code=code,
                defaults={
                    'name_ar': name_ar,
                    'name_en': name_en,
                    'bench': bench,
                    'unit': unit,
                    'method': method,
                    'reference_limit': reference,
                    'order': i + 1,
                    'is_active': True,
                },
            )
            if was_created:
                created += 1
        self.stdout.write(
            self.style.SUCCESS(f'تم بذر معاملات التحليل ({created} جديدة من أصل {len(PARAMETERS)})')
        )