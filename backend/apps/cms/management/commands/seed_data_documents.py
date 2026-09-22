import os
import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.cms.models import CmsDocument
from apps.organization.models import Sector

DATA_ENTRIES = [
    {
        'source': 'ICD11.md',
        'title': 'التصنيف الدولي للأمراض (ICD-11)',
        'description': 'التصنيف الدولي للأمراض (ICD-11) الصادر عن منظمة الصحة العالمية - دليل كامل لرموز الأمراض.',
        'category': CmsDocument.Category.GUIDE,
    },
    {
        'source': 'ISO3166.md',
        'title': 'معيار ISO 3166 للدول',
        'description': 'معيار ISO 3166 الدولي لرموز الدول (Alpha-2, Alpha-3, Numeric).',
        'category': CmsDocument.Category.GUIDE,
    },
    {
        'source': 'Health-Regulations-Umrah.pdf',
        'title': 'اللوائح الصحية - الحج والعمرة',
        'description': 'اللوائح الصحية الخاصة بالحج والعمرة.',
        'category': CmsDocument.Category.REGULATION,
    },
    {
        'source': 'IHR3ar (1).pdf',
        'title': 'اللوائح الصحية الدولية (النسخة العربية)',
        'description': 'اللوائح الصحية الدولية (IHR) 2005 - النسخة العربية.',
        'category': CmsDocument.Category.REGULATION,
    },
    {
        'source': 'IHR ENGLISH ad 3.pdf',
        'title': 'International Health Regulations (IHR) - English',
        'description': 'International Health Regulations (2005) - English version.',
        'category': CmsDocument.Category.REGULATION,
    },
    {
        'source': 'إيكاو.pdf',
        'title': 'إيكاو (ICAO)',
        'description': 'وثيقة منظمة الطيران المدني الدولي (إيكاو ICAO).',
        'category': CmsDocument.Category.REGULATION,
    },
    {
        'source': 'تقييم نقاط الدخول - البحر الأحمر 2024م.pdf',
        'title': 'تقييم نقاط الدخول - البحر الأحمر 2024م',
        'description': 'تقرير تقييم نقاط الدخول بالبحر الأحمر لعام 2024.',
        'category': CmsDocument.Category.OTHER,
    },
    {
        'source': 'قانون الحجر الصحى 1974م.pdf',
        'title': 'قانون الحجر الصحي 1974م',
        'description': 'قانون الحجر الصحي لسنة 1974م.',
        'category': CmsDocument.Category.LAW,
    },
    {
        'source': 'قانون رقابة الأطعمة لسنة 1973م.pdf',
        'title': 'قانون رقابة الأطعمة لسنة 1973م',
        'description': 'قانون رقابة الأطعمة لسنة 1973م.',
        'category': CmsDocument.Category.LAW,
    },
    {
        'source': 'GC Risk Assessment Tool Portsudan AirPort.xlsx',
        'title': 'أداة تقييم المخاطر GC - مطار بورتسودان',
        'description': 'أداة تقييم المخاطر (GC) لمطار بورتسودان.',
        'category': CmsDocument.Category.OTHER,
    },
]


class Command(BaseCommand):
    help = 'إضافة وثائق البيانات المرجعية من docs/Data إلى مكتبة الوثائق.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--sector',
            dest='sector',
            help='رمز القطاع الإداري (مثل red-sea / RED_SEA) لإسناد الوثائق إليه.',
        )

    def _resolve_source_dir(self):
        candidate = settings.BASE_DIR.parent / 'docs' / 'Data'
        if candidate.exists():
            return candidate
        raise FileNotFoundError(f'لم يتم العثور على مجلد البيانات: {candidate}')

    def _resolve_sector(self, code):
        if not code:
            return None
        sec = Sector.objects.filter(code__iexact=code).first()
        if not sec:
            raise CommandError(f'لم يتم العثور على قطاع بالرمز: {code}')
        return sec

    def handle(self, *args, **options):
        source_dir = self._resolve_source_dir()
        sector = self._resolve_sector(options.get('sector'))
        media_dir = Path(settings.MEDIA_ROOT)
        dest_dir = media_dir / 'documents' / 'data'
        dest_dir.mkdir(parents=True, exist_ok=True)

        added = 0
        updated = 0
        for entry in DATA_ENTRIES:
            source_path = source_dir / entry['source']
            if not source_path.exists():
                self.stdout.write(self.style.WARNING(f'الملف المصدر غير موجود: {entry["source"]}'))
                continue

            title = entry['title']
            doc = CmsDocument.objects.filter(title=title).first()
            if doc:
                if sector and doc.sector_id != sector.id:
                    doc.sector = sector
                    doc.save(update_fields=['sector', 'updated_at'])
                    self.stdout.write(self.style.WARNING(f'تم إسناد القطاع لوثيقة: {title}'))
                    updated += 1
                else:
                    self.stdout.write(self.style.WARNING(f'موجود وثيقة: {title}'))
                continue

            dest_path = dest_dir / source_path.name
            shutil.copy2(source_path, dest_path)
            CmsDocument.objects.create(
                title=title,
                description=entry['description'],
                category=entry['category'],
                file=os.path.join('documents', 'data', source_path.name),
                sector=sector,
            )
            self.stdout.write(self.style.SUCCESS(f'تم إنشاء وثيقة: {title}'))
            added += 1

        self.stdout.write(self.style.SUCCESS(
            f'اكتملت الإضافة - تمت إضافة {added} وثيقة وتحديث {updated} وثيقة.'
            + (f' (القطاع: {sector.name_ar})' if sector else '')
        ))
