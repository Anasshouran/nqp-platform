"""بذر قائمة الأمراض واجبة الإبلاغ للترصد الصحي.

ينشئ/يحدّث أمراض laboratory.Disease، وتعريفات الحالات (SUSPECTED/PROBABLE/CONFIRMED)
للأمراض الرئيسية، وسجلات ReportableDisease لكل مرض (زمن الإبلاغ + العتبة + الأدوار المُخطَر بها).
قابل لإعادة التشغيل (idempotent) عبر update_or_create.
"""

from django.core.management.base import BaseCommand
from django.db import models

from apps.emergency_eoc.models import ReportableDisease
from apps.laboratory.models import Disease, DiseaseCaseDefinition


def d(cl=None, lab=None, epi=None):
    return {'clinical': cl or [], 'lab': lab or [], 'epi': epi or []}


DISEASES = [
    {
        'icd_11': '1A00', 'name_ar': 'الكوليرا', 'name_en': 'Cholera',
        'ihr_category': Disease.IhrCategory.SURVEILLANCE_ONLY, 'pheic': False,
        'symptoms': ['إسهال مائي حاد', 'قيء', 'جفاف', 'تشنجات عضلية'],
        'incubation': (1, 5), 'transmission': ['ماء ملوث', 'أغذية ملوثة', 'براز'],
        'timeline': 'IMMEDIATE', 'mode': 'CASE_BASED', 'threshold': 1, 'roles': ['EPIDEMIC_CONTROL_MANAGER', 'EOC_OPERATOR', 'POE_MANAGER'],
        'defs': {
            'SUSPECTED': d('إسهال مائي حاد شديد لدى شخص يزيد عمره عن سنتين'),
            'PROBABLE': d('إسهال مائي حاد شديد + اختبار عجلات إيجابي لضمة الكوليرا'),
            'CONFIRMED': d('عزل ضمة الكوليرا O1/O139 من البراز'),
        },
    },
    {
        'icd_11': '1C44', 'name_ar': 'الحمى الصفراء', 'name_en': 'Yellow Fever',
        'ihr_category': Disease.IhrCategory.PHEIC, 'pheic': True,
        'symptoms': ['حمى', 'يرقان', 'نزف', 'ألم عضلي', 'صداع'],
        'incubation': (3, 6), 'transmission': ['بعوضة الزاعجة', 'بعوضة الحميراء'],
        'timeline': 'IMMEDIATE', 'mode': 'CASE_BASED', 'threshold': 1, 'roles': ['EPIDEMIC_CONTROL_MANAGER', 'EOC_OPERATOR'],
        'defs': {
            'SUSPECTED': d('حمى حادة + يرقان خلال 14 يوم من السفر لمنطقة موبوءة'),
            'CONFIRMED': d('إيجابية PCR أو IgM للحمى الصفراء'),
        },
    },
    {
        'icd_11': '1F4Z', 'name_ar': 'الملاريا', 'name_en': 'Malaria',
        'ihr_category': Disease.IhrCategory.NOT_IHR, 'pheic': False,
        'symptoms': ['حمى', 'قشعريرة', 'تعرق', 'صداع', 'فقر دم'],
        'incubation': (7, 30), 'transmission': ['بعوضة الأنوفيلس'],
        'timeline': 'WEEKLY', 'mode': 'AGGREGATE', 'threshold': 5, 'roles': ['EOC_OPERATOR'],
        'defs': {
            'SUSPECTED': d('حمى + صورة دموية مشتتب بها'),
            'CONFIRMED': d('إيجابية اللطاخة الدموية أو RDT للبلازموديوم'),
        },
    },
    {
        'icd_11': '1D6Y', 'name_ar': 'حمى الضنك', 'name_en': 'Dengue Fever',
        'ihr_category': Disease.IhrCategory.SURVEILLANCE_ONLY, 'pheic': False,
        'symptoms': ['حمى فجائية', 'صداع خلف العين', 'ألم مفصلي', 'طفح', 'نزف'],
        'incubation': (3, 14), 'transmission': ['بعوضة الزاعجة'],
        'timeline': 'WITHIN_24H', 'mode': 'CASE_BASED', 'threshold': 2, 'roles': ['EPIDEMIC_CONTROL_MANAGER', 'EOC_OPERATOR'],
        'defs': {
            'SUSPECTED': d('حمى + عرضان من أعراض الضنك'),
            'CONFIRMED': d('إيجابية NS1 أو IgM أو PCR'),
        },
    },
    {
        'icd_11': '1C1Z', 'name_ar': 'الحصبة', 'name_en': 'Measles',
        'ihr_category': Disease.IhrCategory.TARGETED_ERADICATION, 'pheic': False,
        'symptoms': ['حمى', 'طفح بقعي حطاطي', 'سعال', 'سيلان أنف', 'التهابات العين'],
        'incubation': (7, 21), 'transmission': ['رذاذ تنفسي', 'ملامسة'],
        'timeline': 'WITHIN_24H', 'mode': 'CASE_BASED', 'threshold': 1, 'roles': ['EPIDEMIC_CONTROL_MANAGER', 'EOC_OPERATOR'],
        'defs': {
            'SUSPECTED': d('حمى + طفح + سعال/سيلان/التهابات العين'),
            'CONFIRMED': d('إيجابية IgM الحصبة أو PCR'),
        },
    },
    {
        'icd_11': '1A80', 'name_ar': 'شلل الأطفال', 'name_en': 'Poliomyelitis (AFP)',
        'ihr_category': Disease.IhrCategory.TARGETED_ERADICATION, 'pheic': False,
        'symptoms': ['شلل رخو حاد', 'حمى', 'عدم تماثل الأطراف'],
        'incubation': (3, 35), 'transmission': ['برازي فموي', 'ماء ملوث'],
        'timeline': 'IMMEDIATE', 'mode': 'CASE_BASED', 'threshold': 1, 'roles': ['EPIDEMIC_CONTROL_MANAGER', 'EOC_OPERATOR'],
        'defs': {'SUSPECTED': d('شلل رخو حاد لدى من هم دون 15 سنة')},
    },
    {
        'icd_11': '1E10', 'name_ar': 'إيبولا', 'name_en': 'Ebola Virus Disease',
        'ihr_category': Disease.IhrCategory.PHEIC, 'pheic': True,
        'symptoms': ['حمى', 'نزف', 'قيء دموي', 'إسهال', 'ألم عضلي'],
        'incubation': (2, 21), 'transmission': ['سوائل الجسم', 'اتصال مباشر'],
        'timeline': 'IMMEDIATE', 'mode': 'CASE_BASED', 'threshold': 1, 'roles': ['EPIDEMIC_CONTROL_MANAGER', 'EOC_OPERATOR'],
        'defs': {'SUSPECTED': d('حمى + تاريخ سفر لمنطقة موبوءة'), 'CONFIRMED': d('PCR إيجابي')},
    },
    {
        'icd_11': '1A91', 'name_ar': 'فيروس كورونا (كوفيد-19)', 'name_en': 'COVID-19',
        'ihr_category': Disease.IhrCategory.SURVEILLANCE_ONLY, 'pheic': True,
        'symptoms': ['حمى', 'سعال', 'صعوبة تنفس', 'فقدان حاسة الشم', 'إرهاق'],
        'incubation': (1, 14), 'transmission': ['رذاذ تنفسي', 'ملامسة'],
        'timeline': 'WITHIN_24H', 'mode': 'CASE_BASED', 'threshold': 5, 'roles': ['EOC_OPERATOR'],
        'defs': {'SUSPECTED': d('حمى + سعال + اتصال بحالة مؤكدة'), 'CONFIRMED': d('PCR إيجابي')},
    },
    {
        'icd_11': '1B72', 'name_ar': 'الطاعون', 'name_en': 'Plague',
        'ihr_category': Disease.IhrCategory.PHEIC, 'pheic': True,
        'symptoms': ['حمى', 'تضخم عقد لمفية', 'التهاب رئوي', 'تسمم دموي'],
        'incubation': (1, 7), 'transmission': ['لدغ البرغوث', 'رذاذ تنفسي'],
        'timeline': 'IMMEDIATE', 'mode': 'CASE_BASED', 'threshold': 1, 'roles': ['EPIDEMIC_CONTROL_MANAGER', 'EOC_OPERATOR'],
        'defs': {'CONFIRMED': d('زرع وعزل يرسينيا الطاعون')},
    },
    {
        'icd_11': '1B60', 'name_ar': 'الكوليرا المكتسبة من مياه الشرب (الناشر)', 'name_en': 'Epidemic Typhus', 'skip_common': True,
        'ihr_category': Disease.IhrCategory.NOT_IHR, 'pheic': False,
        'symptoms': ['حمى', 'صداع', 'طفح', 'هذيان'],
        'incubation': (7, 14), 'transmission': ['قمل الجسم'],
        'timeline': 'WEEKLY', 'mode': 'SYNDROME', 'threshold': 3, 'roles': ['EOC_OPERATOR'],
    },
    {
        'icd_11': '1C13', 'name_ar': 'التيفوئيد', 'name_en': 'Typhoid Fever',
        'ihr_category': Disease.IhrCategory.SURVEILLANCE_ONLY, 'pheic': False,
        'symptoms': ['حمى مستمرة', 'صداع', 'إمساك أو إسهال', 'طفح وردي'],
        'incubation': (6, 30), 'transmission': ['ماء/طعام ملوث'],
        'timeline': 'WITHIN_24H', 'mode': 'CASE_BASED', 'threshold': 2, 'roles': ['EOC_OPERATOR'],
    },
    {
        'icd_11': '1B56', 'name_ar': 'حمى الوادي المتصدع', 'name_en': 'Rift Valley Fever',
        'ihr_category': Disease.IhrCategory.PHEIC, 'pheic': False,
        'symptoms': ['حمى', 'ألم مفصلي', 'نزف', 'التهاب دماغي'],
        'incubation': (2, 6), 'transmission': ['بعوض', 'ملامسة دماء حيوانات'],
        'timeline': 'IMMEDIATE', 'mode': 'CASE_BASED', 'threshold': 1, 'roles': ['EPIDEMIC_CONTROL_MANAGER'],
    },
    {
        'icd_11': '1E2Z', 'name_ar': 'الحمى النزفية الفيروسية', 'name_en': 'Viral Hemorrhagic Fever',
        'ihr_category': Disease.IhrCategory.PHEIC, 'pheic': True,
        'symptoms': ['نزف', 'حمى', 'فشل أعضاء'],
        'incubation': (2, 21), 'transmission': ['سوائل الجسم'],
        'timeline': 'IMMEDIATE', 'mode': 'CASE_BASED', 'threshold': 1, 'roles': ['EPIDEMIC_CONTROL_MANAGER'],
    },
    {
        'icd_11': '1D05', 'name_ar': 'الجدري المائي', 'name_en': 'Chickenpox',
        'ihr_category': Disease.IhrCategory.NOT_IHR, 'pheic': False,
        'symptoms': ['حمى', 'حويصلات جلدية', 'حكة'],
        'incubation': (10, 21), 'transmission': ['رذاذ', 'ملامسة'],
        'timeline': 'WEEKLY', 'mode': 'AGGREGATE', 'threshold': 5, 'roles': ['EOC_OPERATOR'],
    },
    {
        'icd_11': '1A60', 'name_ar': 'السعال الديكي', 'name_en': 'Pertussis',
        'ihr_category': Disease.IhrCategory.TARGETED_ERADICATION, 'pheic': False,
        'symptoms': ['سعال نوبي', 'شهقة', 'قيء بعد السعال'],
        'incubation': (5, 21), 'transmission': ['رذاذ'],
        'timeline': 'WITHIN_24H', 'mode': 'CASE_BASED', 'threshold': 2, 'roles': ['EOC_OPERATOR'],
    },
    {
        'icd_11': '1A21', 'name_ar': 'الدفتيريا', 'name_en': 'Diphtheria',
        'ihr_category': Disease.IhrCategory.TARGETED_ERADICATION, 'pheic': False,
        'symptoms': ['غشاء كاذب بلعومي', 'صعوبة بلع', 'حمى', 'تضخم عنق'],
        'incubation': (2, 5), 'transmission': ['رذاذ', 'ملامسة'],
        'timeline': 'WITHIN_24H', 'mode': 'CASE_BASED', 'threshold': 1, 'roles': ['EOC_OPERATOR'],
    },
    {
        'icd_11': '1C1Y', 'name_ar': 'الحصبة الألمانية', 'name_en': 'Rubella',
        'ihr_category': Disease.IhrCategory.TARGETED_ERADICATION, 'pheic': False,
        'symptoms': ['طفح', 'حمى خفيفة', 'تضخم غدد خلف الأذن'],
        'incubation': (12, 23), 'transmission': ['رذاذ'],
        'timeline': 'WITHIN_24H', 'mode': 'CASE_BASED', 'threshold': 2, 'roles': ['EOC_OPERATOR'],
    },
    {
        'icd_11': '1C93', 'name_ar': 'حمى غرب النيل', 'name_en': 'West Nile Fever',
        'ihr_category': Disease.IhrCategory.SURVEILLANCE_ONLY, 'pheic': False,
        'symptoms': ['حمى', 'صداع', 'تهاب سحايا', 'شلل'],
        'incubation': (2, 14), 'transmission': ['بعوضة الكيولكس'],
        'timeline': 'WEEKLY', 'mode': 'SYNDROME', 'threshold': 3, 'roles': ['EOC_OPERATOR'],
    },
    {
        'icd_11': '1A40', 'name_ar': 'التيتانوس', 'name_en': 'Tetanus Neonatorum',
        'ihr_category': Disease.IhrCategory.NOT_IHR, 'pheic': False,
        'symptoms': ['تشنج عضلي', 'صعوبة بلع', 'تقلص فكي'],
        'incubation': (3, 21), 'transmission': ['جرح ملوث'],
        'timeline': 'WEEKLY', 'mode': 'CASE_BASED', 'threshold': 1, 'roles': ['EOC_OPERATOR'],
    },
    {
        'icd_11': '1G00', 'name_ar': 'الحمى المخية الشوكية', 'name_en': 'Meningitis (Meningococcal)',
        'ihr_category': Disease.IhrCategory.PHEIC, 'pheic': True,
        'symptoms': ['حمى', 'تيبس رقبة', 'صداع شديد', 'طفح نزفي', 'قهقأة'],
        'incubation': (1, 10), 'transmission': ['رذاذ'],
        'timeline': 'WITHIN_24H', 'mode': 'CASE_BASED', 'threshold': 2, 'roles': ['EPIDEMIC_CONTROL_MANAGER'],
    },
    {
        'icd_11': '1F42', 'name_ar': 'وداء البلهارسيا', 'name_en': 'Schistosomiasis',
        'ihr_category': Disease.IhrCategory.NOT_IHR, 'pheic': False,
        'symptoms': ['دم في البول', 'ألم بطن', 'تضخم طحال'],
        'incubation': (14, 84), 'transmission': ['ماء ملوث'],
        'timeline': 'WEEKLY', 'mode': 'AGGREGATE', 'threshold': 5, 'roles': ['EOC_OPERATOR'],
    },
    {
        'icd_11': '1A70', 'name_ar': 'الأنفلونزا الموسمية', 'name_en': 'Seasonal Influenza (ILI/ARI)',
        'ihr_category': Disease.IhrCategory.SURVEILLANCE_ONLY, 'pheic': False,
        'symptoms': ['حمى', 'سعال', 'رشح', 'ألم عضلي'],
        'incubation': (1, 4), 'transmission': ['رذاذ'],
        'timeline': 'WEEKLY', 'mode': 'SYNDROME', 'threshold': 10, 'roles': ['EOC_OPERATOR'],
    },
    {
        'icd_11': '1E33', 'name_ar': 'الأنفلونزا الجائحة', 'name_en': 'Pandemic Influenza',
        'ihr_category': Disease.IhrCategory.PHEIC, 'pheic': True,
        'symptoms': ['حمى', 'ضيق تنفس', 'فشل تنفسي'],
        'incubation': (1, 4), 'transmission': ['رذاذ'],
        'timeline': 'IMMEDIATE', 'mode': 'CASE_BASED', 'threshold': 1, 'roles': ['EPIDEMIC_CONTROL_MANAGER'],
    },
    {
        'icd_11': '1A11', 'name_ar': 'الحمى المالطية', 'name_en': 'Brucellosis',
        'ihr_category': Disease.IhrCategory.NOT_IHR, 'pheic': False,
        'symptoms': ['حمى متموجة', 'تعرق ليلي', 'ألم مفصلي', 'إرهاق'],
        'incubation': (5, 60), 'transmission': ['حليب غير مبستر', 'ملامسة حيوانات'],
        'timeline': 'WEEKLY', 'mode': 'CASE_BASED', 'threshold': 2, 'roles': ['EOC_OPERATOR'],
    },
    {
        'icd_11': '1B95', 'name_ar': 'داء الكلب', 'name_en': 'Rabies',
        'ihr_category': Disease.IhrCategory.SURVEILLANCE_ONLY, 'pheic': False,
        'symptoms': ['خوف من الماء', 'تشنج بلعومي', 'فرط نشاط', 'شلل'],
        'incubation': (20, 90), 'transmission': ['عضة كلب/حيوان'],
        'timeline': 'IMMEDIATE', 'mode': 'CASE_BASED', 'threshold': 1, 'roles': ['EPIDEMIC_CONTROL_MANAGER'],
    },
    {
        'icd_11': '1D45', 'name_ar': 'الحمى النزفية بسبب حمى القرم الكونغو', 'name_en': 'Crimean-Congo Hemorrhagic Fever',
        'ihr_category': Disease.IhrCategory.PHEIC, 'pheic': True,
        'symptoms': ['حمى', 'نزف', 'ألم عضلي', 'قيء'],
        'incubation': (1, 13), 'transmission': ['قراد', 'ملامسة دم حيوانات'],
        'timeline': 'IMMEDIATE', 'mode': 'CASE_BASED', 'threshold': 1, 'roles': ['EPIDEMIC_CONTROL_MANAGER'],
    },
    {
        'icd_11': '1A61', 'name_ar': 'الكزاز الوليدي', 'name_en': 'Neonatal Tetanus',
        'ihr_category': Disease.IhrCategory.TARGETED_ERADICATION, 'pheic': False,
        'symptoms': ['تشنج حديث الولادة', 'صعوبة رضاعة', 'صراخ'],
        'incubation': (3, 14), 'transmission': ['حبل سر غير معقم'],
        'timeline': 'IMMEDIATE', 'mode': 'CASE_BASED', 'threshold': 1, 'roles': ['EPIDEMIC_CONTROL_MANAGER'],
    },
    {
        'icd_11': '1C40', 'name_ar': 'الحمى الصفراء المعدلة', 'name_en': 'Dengue-like fever', 'skip_common': True,
        'ihr_category': Disease.IhrCategory.NOT_IHR, 'pheic': False,
        'symptoms': ['حمى', 'طفح'],
        'incubation': (3, 10), 'transmission': ['بعوض'],
        'timeline': 'WEEKLY', 'mode': 'SYNDROME', 'threshold': 5, 'roles': ['EOC_OPERATOR'],
    },
    {
        'icd_11': '1C1T', 'name_ar': 'الحصبة النزفية / جدري القردة', 'name_en': 'Mpox',
        'ihr_category': Disease.IhrCategory.PHEIC, 'pheic': False,
        'symptoms': ['طفح حويصلي', 'حمى', 'تضخم عقد', 'صداع'],
        'incubation': (5, 21), 'transmission': ['ملامسة جلدية', 'سوائل الجسم'],
        'timeline': 'WITHIN_24H', 'mode': 'CASE_BASED', 'threshold': 1, 'roles': ['EPIDEMIC_CONTROL_MANAGER'],
    },
    {
        'icd_11': '1B52', 'name_ar': 'حمى مرض الخنازير الأفريقي (البشرية نادرة)', 'name_en': 'Lassa Fever',
        'ihr_category': Disease.IhrCategory.PHEIC, 'pheic': True,
        'symptoms': ['حمى', 'نزف', 'ألم عضلي', 'فشل أعضاء'],
        'incubation': (2, 21), 'transmission': ['سوائل الجسم', 'قوارض'],
        'timeline': 'IMMEDIATE', 'mode': 'CASE_BASED', 'threshold': 1, 'roles': ['EPIDEMIC_CONTROL_MANAGER'],
    },
]


DEFAULTS_NOTIFIABLE_TIMELINE = {
    'IMMEDIATE': 'فوري',
    'WITHIN_24H': 'خلال 24 ساعة',
    'WEEKLY': 'أسبوعي',
}


class Command(BaseCommand):
    help = 'بذر الأمراض واجبة الإبلاغ وتعريفات حالاتها وإعداد الترصد لكل منها'

    def handle(self, *args, **options):
        created_d = updated_d = created_r = updated_r = created_def = 0

        for item in DISEASES:
            defaults = {
                'name_ar': item['name_ar'],
                'name_en': item['name_en'],
                'description': item.get('description', ''),
                'symptoms': item.get('symptoms', []),
                'incubation_period_min': item['incubation'][0] if item.get('incubation') else None,
                'incubation_period_max': item['incubation'][1] if item.get('incubation') else None,
                'transmission_methods': item.get('transmission', []),
                'is_public_health_emergency': item.get('pheic', False),
                'ihr_category': item.get('ihr_category', Disease.IhrCategory.NOT_IHR),
                'is_active': True,
            }
            disease, created = Disease.objects.update_or_create(
                icd_11_code=item['icd_11'], defaults=defaults
            )
            if created:
                created_d += 1
            else:
                updated_d += 1

            reportable_defaults = {
                'notification_timeline': item['timeline'],
                'surveillance_mode': item['mode'],
                'ewars_threshold': item['threshold'],
                'window_days': 7,
                'baseline_weeks': 8,
                'notified_roles': item.get('roles', []),
                'is_enabled': True,
            }
            _, r_created = ReportableDisease.objects.update_or_create(
                disease=disease, defaults=reportable_defaults
            )
            if r_created:
                created_r += 1
            else:
                updated_r += 1

            max_version = (
                disease.case_definitions.aggregate(m=models.Max('version'))['m'] or 0
            )
            for case_type, criteria in item.get('defs', {}).items():
                _, def_created = DiseaseCaseDefinition.objects.update_or_create(
                    disease=disease,
                    case_type=case_type,
                    version=max_version,
                    defaults={
                        'clinical_criteria': criteria['clinical'],
                        'lab_criteria': criteria['lab'],
                        'epidemiological_criteria': criteria['epi'],
                    },
                )
                if def_created:
                    created_def += 1

        self.stdout.write(self.style.SUCCESS(
            f'تم بذر الأمراض واجبة الإبلاغ: {created_d} جديد و{updated_d} محدَّث، '
            f'{created_r} + {updated_r} سجل ترصد، و{created_def} تعريف حالة.'
        ))
        self.stdout.write(
            f'الإجمالي: {Disease.objects.count()} مرضاً، '
            f'{DiseaseCaseDefinition.objects.count()} تعريف حالة، '
            f'{ReportableDisease.objects.count()} سجل ترصد.'
        )