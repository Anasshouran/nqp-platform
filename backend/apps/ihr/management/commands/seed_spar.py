"""بذر مؤشرات القدرات الوطنية للصحة العامة وفق إطار SPAR (15 قدرة).

ينشئ/يحدّث 15 مؤشراً (C1..C15) مطابقة لقدرات SPAR المعتمدة دولياً،
قابل لإعادة التشغيل (idempotent) عبر update_or_create.
"""

from django.core.management.base import BaseCommand

from apps.ihr.models import SPARIndicator

CAPACITIES = [
    ('C1', 'التشريعات والسياسات والتمويل', 'Legislation, Policy and Financing'),
    ('C2', 'التنسيق الإقليمي', 'IHR Coordination and National Focal Point'),
    ('C3', 'الترصد الوبائي', 'Surveillance and Event Detection'),
    ('C4', 'الاستعداد الصحي', 'Health Emergency Preparedness'),
    ('C5', 'الجاهزية للاستجابة', 'Emergency Response Operations'),
    ('C6', 'تجهيز الاستجابة للطوارئ', 'Health Service Provision for Emergencies'),
    ('C7', 'التواصل مع المخاطر', 'Risk Communication and Community Engagement'),
    ('C8', 'نقاط الدخول', 'Points of Entry'),
    ('C9', 'التشخيص المعملي', 'Laboratory Capacity'),
    ('C10', 'البعد البشري للصحة', 'Human Resources and One Health Workforce'),
    ('C11', 'التنسيق الكيميائي', 'Chemical Emergencies'),
    ('C12', 'التنسيق الإشعاعي', 'Radiation Emergencies'),
    ('C13', 'سلامة الغذاء', 'Food Safety'),
    ('C14', 'اللقاحات والتطعيم', 'Vaccination and Immunization'),
    ('C15', 'الزونوز والأمراض الحيوانية', 'Zoonotic Diseases and One Health'),
]


class Command(BaseCommand):
    help = 'بذر مؤشرات SPAR (15 قدرة) لمؤشرات OHRC/SPAR'

    def handle(self, *args, **options):
        created = updated = 0
        for order, (code, name_ar, name_en) in enumerate(CAPACITIES, start=1):
            _, was_created = SPARIndicator.objects.update_or_create(
                code=code,
                defaults={
                    'name_ar': name_ar,
                    'name_en': name_en,
                    'max_score': 4.0,
                    'order': order,
                    'is_active': True,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1
        self.stdout.write(self.style.SUCCESS(
            f'تم بذر مؤشرات SPAR: {created} جديد و{updated} محدَّث (الإجمالي {SPARIndicator.objects.count()}).'
        ))