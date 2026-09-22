import os
import uuid
from datetime import date, timedelta
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.carriers.models import HealthNotice
from apps.cms.models import CmsDocument, DirectorProfile, FaqItem, NewsArticle, Page, SiteSetting
from apps.laboratory.models import Disease
from apps.organization.models import Sector
from apps.public.models import HealthCertificate
from apps.travelers.models import Country, Traveler


DISEASES = [
    {
        'icd_11_code': '1A00',
        'name_ar': 'الكوليرا',
        'name_en': 'Cholera',
        'description': 'مرض إسهالي حاد تسببه بكتيريا ضمة الكوليرا، ينتقل عبر المياه والغذاء الملوثين.',
        'symptoms': ['إسهال مائي حاد', 'جفاف', 'قيء', 'تشنج عضلي'],
        'incubation_period_min': 1,
        'incubation_period_max': 5,
        'transmission_methods': ['ماء ملوث', 'غذاء ملوث'],
        'ihr_category': Disease.IhrCategory.SURVEILLANCE_ONLY,
    },
    {
        'icd_11_code': '1C44',
        'name_ar': 'الحمى الصفراء',
        'name_en': 'Yellow Fever',
        'description': 'مرض فيروسي حاد ينتقل عن طريق البعوض، ويتطلب تطعيم إلزامي لدخول بعض الدول.',
        'symptoms': ['حمى', 'يرقان', 'نزيف', 'صداع'],
        'incubation_period_min': 3,
        'incubation_period_max': 6,
        'transmission_methods': ['لدغة بعوضة الزاعجة'],
        'ihr_category': Disease.IhrCategory.PHEIC,
    },
    {
        'icd_11_code': '1F4Z',
        'name_ar': 'الملاريا',
        'name_en': 'Malaria',
        'description': 'مرض طفيلي ينتقل عن طريق بعوضة الأنوفيلس، ينتشر في المناطق المدارية وشبه المدارية.',
        'symptoms': ['حمى متقطعة', 'قشعريرة', 'تعرق', 'صداع'],
        'incubation_period_min': 7,
        'incubation_period_max': 30,
        'transmission_methods': ['لدغة بعوضة الأنوفيلس'],
        'ihr_category': Disease.IhrCategory.NOT_IHR,
    },
    {
        'icd_11_code': '1D6Y',
        'name_ar': 'حمى الضنك',
        'name_en': 'Dengue Fever',
        'description': 'مرض فيروسي ينتقل بواسطة بعوضة الزاعجة المصرية، من الأمراض المنتشرة في المناطق الاستوائية.',
        'symptoms': ['حمى عالية', 'ألم خلف العينين', 'طفح جلدي', 'ألم مفصلي'],
        'incubation_period_min': 4,
        'incubation_period_max': 10,
        'transmission_methods': ['لدغة بعوضة الزاعجة'],
        'ihr_category': Disease.IhrCategory.SURVEILLANCE_ONLY,
    },
    {
        'icd_11_code': '1C1Z',
        'name_ar': 'الحصبة',
        'name_en': 'Measles',
        'description': 'مرض فيروسي شديد العدوى يصيب الجهاز التنفسي، ويمكن الوقاية منه بالتطعيم.',
        'symptoms': ['حمى', 'سعال', 'التهاب ملتحمة', 'طفح جلدي'],
        'incubation_period_min': 10,
        'incubation_period_max': 12,
        'transmission_methods': ['رذاذ الجهاز التنفسي', 'مخالطة مباشرة'],
        'ihr_category': Disease.IhrCategory.TARGETED_ERADICATION,
    },
]

NOTICES = [
    {
        'title': 'إلزامية شهادة التطعيم ضد الحمى الصفراء',
        'description': 'يُشترط على القادمين من الدول الموبوءة تقديم شهادة تطعيم سارية ضد الحمى الصفراء.',
        'category': HealthNotice.NoticeCategory.ENTRY_REQUIREMENTS,
        'priority': HealthNotice.NoticePriority.HIGH,
    },
    {
        'title': 'متطلبات اختبار كوفيد-19',
        'description': 'يُوصى المسافرين القادمين بإبراز نتيجة اختبار كوفيد-19 سلبية لا تتجاوز 72 ساعة.',
        'category': HealthNotice.NoticeCategory.ENTRY_REQUIREMENTS,
        'priority': HealthNotice.NoticePriority.MEDIUM,
    },
    {
        'title': 'إنذار وبائي: تفشي الكوليرا',
        'description': 'تم تسجيل حالات كوليرا في بعض المناطق، وننصح المسافرين باتباع إرشادات النظافة وغسل اليدين.',
        'category': HealthNotice.NoticeCategory.EPIDEMIC_ALERT,
        'priority': HealthNotice.NoticePriority.HIGH,
    },
]

COUNTRIES = [
    ('SDN', 'Sudan', 'السودان', 'GREEN'),
    ('EGY', 'Egypt', 'مصر', 'YELLOW'),
    ('SAU', 'Saudi Arabia', 'المملكة العربية السعودية', 'YELLOW'),
    ('UAE', 'United Arab Emirates', 'الإمارات العربية المتحدة', 'GREEN'),
    ('IND', 'India', 'الهند', 'RED'),
    ('ETH', 'Ethiopia', 'إثيوبيا', 'RED'),
    ('CHN', 'China', 'الصين', 'YELLOW'),
    ('USA', 'United States', 'الولايات المتحدة الأمريكية', 'GREEN'),
]

NEWS = [
    {
        'title': 'المركز القومي للحجر الصحي يستقبل معدات حديثة للفحص',
        'content': 'استقبلت الإدارة الاتحادية للحجر الصحي دفعة جديدة من معدات الفحص الصحي الحديثة لتعزيز قدرات منافذ الدخول على مستوى البلاد.',
        'category': NewsArticle.Category.OFFICIAL,
        'days_ago': 2,
    },
    {
        'title': 'حملة توعوية حول الوقاية من الأمراض الوبائية',
        'content': 'أطلقت الإدارة حملة توعوية شاملة لتثقيف المسافرين حول إجراءات الوقاية من الأمراض الوبائية وطرق انتقالها.',
        'category': NewsArticle.Category.HEALTH,
        'days_ago': 5,
    },
    {
        'title': 'تحديث متطلبات السفر للقادمين من الخارج',
        'content': 'أعلنت الإدارة عن تحديث متطلبات السفر والدخول للمسافرين القادمين من الدول الموبوءة وفق أحدث الإرشادات الصحية.',
        'category': NewsArticle.Category.TRAVEL,
        'days_ago': 9,
    },
]

FAQ = [
    {
        'question': 'ما هي الوثائق المطلوبة لدخول السودان؟',
        'answer': 'يُشترط جواز سفر ساري المفعول، وبطاقة تطعيم الحمى الصفراء للقادمين من الدول الموبوءة، حسب متطلبات السفر المعلنة.',
    },
    {
        'question': 'كيف يمكنني الحصول على شهادة صحية دولية؟',
        'answer': 'تتم إصدار الشهادة الصحية الدولية من وحدات الحجر الصحي بعد الفحص الطبي واستيفاء الاشتراطات الصحية.',
    },
    {
        'question': 'ما هي مدة صلاحية شهادة تطعيم الحمى الصفراء؟',
        'answer': 'تبدأ سريان الشهادة بعد عشرة أيام من التطعيم وتكون سارية مدى الحياة حسب اللوائح الصحية الدولية.',
    },
    {
        'question': 'هل يلزم التسجيل المسبق للمسافرين القادمين؟',
        'answer': 'ينصح بالتسجيل المسبق في بوابة المسافرين لتسريع إجراءات الفحص وتقليل وقت الانتظار عند المنفذ.',
    },
]

PAGES = [
    {
        'slug': 'about-us',
        'title': 'من نحن',
        'content': (
            'الإدارة العامة للحجر الصحي القومي هي الجهاز الرسمي المعني بحماية صحة المواطنين والمسافرين '
            'عبر تطبيق اللوائح الصحية الدولية (IHR 2005) في جميع منافذ الدخول الحدودية - الجوية والبحرية والبرية - '
            'بجمهورية السودان. تتبع الإدارة لوزارة الصحة الاتحادية، وتعمل على الرصد الوبائي للأمراض المعدية، '
            'وإجراء الفحص الصحي للمسافرين والوافدين، وإصدار الشهادات الصحية الدولية، ومكافحة نواقل الأمراض '
            'داخل نطاق المنافذ، والتنسيق مع المنظمات الصحية الإقليمية والدولية لضمان الاستجابة السريعة لأي خطر صحي '
            'عام يهدد صحة الإنسان والسلامة الوطنية.'
        ),
    },
]


class Command(BaseCommand):
    help = 'يضيف بيانات تجريبية للموقع العام (أمراض، إشعارات، دول، أخبار، أسئلة، وثائق)'

    def handle(self, *args, **options):
        for entry in DISEASES:
            obj, created = Disease.objects.get_or_create(
                icd_11_code=entry['icd_11_code'], defaults={k: v for k, v in entry.items() if k != 'icd_11_code'}
            )
            self.stdout.write(f"{'تم إنشاء' if created else 'موجود'} مرض: {obj.name_ar}")

        for code, name, name_ar, risk in COUNTRIES:
            obj, created = Country.objects.get_or_create(
                code=code, defaults={'name': name, 'name_ar': name_ar, 'risk_level': risk}
            )
            self.stdout.write(f"{'تم إنشاء' if created else 'موجود'} دولة: {obj.name_ar}")

        for entry in NOTICES:
            obj, created = HealthNotice.objects.get_or_create(
                title=entry['title'], defaults={k: v for k, v in entry.items() if k != 'title'}
            )
            self.stdout.write(f"{'تم إنشاء' if created else 'موجود'} إشعار: {obj.title}")

        for entry in NEWS:
            obj, created = NewsArticle.objects.get_or_create(
                title=entry['title'],
                defaults={
                    'content': entry['content'],
                    'category': entry['category'],
                    'is_published': True,
                    'published_at': timezone.now() - timedelta(days=entry['days_ago']),
                },
            )
            if created:
                self.stdout.write(f'تم إنشاء خبر: {obj.title}')

        for entry in FAQ:
            obj, created = FaqItem.objects.get_or_create(
                question=entry['question'], defaults={'answer': entry['answer']}
            )
            self.stdout.write(f"{'تم إنشاء' if created else 'موجود'} سؤال: {obj.question}")

        for entry in PAGES:
            obj, created = Page.objects.get_or_create(
                slug=entry['slug'], defaults={k: v for k, v in entry.items() if k != 'slug'}
            )
            self.stdout.write(f"{'تم إنشاء' if created else 'موجود'} صفحة: {obj.title}")

        certificates = [
            {
                'certificate_number': 'NQP-YF-2026-0001',
                'traveler_name': 'محمد أحمد',
                'passport_number': 'P1234567',
                'certificate_type': HealthCertificate.CertificateType.VACCINATION,
                'disease': 'الحمى الصفراء',
                'issued_date': date.today() - timedelta(days=30),
                'expiry_date': date.today() + timedelta(days=335),
                'is_valid': True,
            },
            {
                'certificate_number': 'NQP-YF-2025-0099',
                'traveler_name': 'سارة خالد',
                'passport_number': 'P7654321',
                'certificate_type': HealthCertificate.CertificateType.VACCINATION,
                'disease': 'الحمى الصفراء',
                'issued_date': date.today() - timedelta(days=400),
                'expiry_date': None,
                'is_valid': True,
            },
        ]
        for entry in certificates:
            obj, created = HealthCertificate.objects.get_or_create(
                certificate_number=entry['certificate_number'], defaults=entry
            )
            self.stdout.write(f"{'تم إنشاء' if created else 'موجود'} شهادة: {obj.certificate_number}")

        demo_traveler, created = Traveler.objects.get_or_create(
            passport_number='P1234567',
            defaults={
                'id': uuid.UUID('00000000-0000-0000-0000-000000000001'),
                'first_name': 'محمد',
                'last_name': 'أحمد',
                'date_of_birth': date(1990, 1, 1),
                'nationality': Country.objects.get_or_create(
                    code='SDN', defaults={'name': 'Sudan', 'name_ar': 'السودان'}
                )[0],
                'phone': '0912345678',
                'email': 'demo@nqp.gov.sd',
                'registration_status': Traveler.RegistrationStatus.COMPLETED,
            },
        )
        if not created:
            demo_traveler.registration_status = Traveler.RegistrationStatus.COMPLETED
            demo_traveler.save(update_fields=['registration_status', 'updated_at'])
        self.stdout.write(f"{'تم إنشاء' if created else 'تحديث'} مسافر تجريبي: {demo_traveler.full_name} ({demo_traveler.passport_number})")

        media_dir = Path(settings.MEDIA_ROOT)
        media_dir.mkdir(parents=True, exist_ok=True)
        doc_files = [
            ('قانون الحجر الصحي السوداني', 'LAW', 'law-of-quarantine.pdf'),
        ]
        for title, category, filename in doc_files:
            if CmsDocument.objects.filter(title=title).exists():
                self.stdout.write(f'موجود وثيقة: {title}')
                continue
            file_path = media_dir / 'documents' / filename
            file_path.parent.mkdir(parents=True, exist_ok=True)
            if not file_path.exists():
                file_path.write_text(f'وثيقة تجريبية: {title}', encoding='utf-8')
            CmsDocument.objects.create(
                title=title,
                description='وثيقة تجريبية للموقع العام.',
                category=category,
                file=os.path.join('documents', filename),
            )
            self.stdout.write(f'تم إنشاء وثيقة: {title}')

        self._seed_red_sea_sector_content()

        self.stdout.write(self.style.SUCCESS('اكتملت إضافة البيانات التجريبية للموقع العام.'))

    def _seed_red_sea_sector_content(self):
        """بذر محتوى قطاع البحر الأحمر (سيرة المدير وبيانات التواصل)."""
        red_sea = Sector.objects.filter(code__iexact='RED_SEA').first()
        if red_sea is None:
            self.stdout.write(self.style.WARNING('تم تخطي محتوى قطاع البحر الأحمر: القطاع غير موجود.'))
            return

        director, was_created = DirectorProfile.objects.update_or_create(
            sector=red_sea,
            defaults={
                'name_ar': 'د. أحمد محمد عثمان دِرير',
                'name_en': 'Dr. Ahmed Mohamed Othman Dirar',
                'title': 'مدير الحجر الصحي – قطاع البحر الأحمر',
                'qualification': '',
                'specialization': '',
                'summary': (
                    'تولى د. أحمد محمد عثمان دِرير إدارة الحجر الصحي بقطاع البحر الأحمر، '
                    'وورد اسمه في منشورات رسمية وإعلامية (2024) حين تحدث باسم المعنيين بإجراءات '
                    'الحجر الصحي والفحص والتطعيم في نقاط دخول البحر الأحمر ببورتسودان. '
                    'لا تزال البيانات المؤكدة عن المؤهل الأكاديمي والمناصب السابقة بحاجة إلى '
                    'اعتماد من الإدارة العامة للحجر الصحي القومي.'
                ),
                'message': '',
                'is_active': True,
                'is_confirmed': False,
                'confirmation_note': (
                    'الاسم منشور في مصادر رسمية وإعلامية (2024)، ويحتاج إلى تأكيد إداري حديث '
                    'من الإدارة العامة للحجر الصحي القومي قبل اعتماده نهائياً.'
                ),
            },
        )
        if was_created:
            self.stdout.write(f'تم إنشاء سيرة مدير قطاع البحر الأحمر: {director.name_ar}')

        setting, was_created = SiteSetting.objects.update_or_create(
            key='contact',
            sector=red_sea,
            defaults={
                'value': {
                    'address': 'قطاع البحر الأحمر – الحجر الصحي القومي، بورتسودان – ولاية البحر الأحمر – السودان',
                    'official_phone': '',
                    'official_email': '',
                    'website': '',
                },
            },
        )
        if was_created:
            self.stdout.write(f'تم إنشاء بيانات التواصل لقطاع البحر الأحمر: {setting.key}')
