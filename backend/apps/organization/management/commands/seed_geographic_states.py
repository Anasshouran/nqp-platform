from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.organization.models import GeographicState

STATES = [
    ('SD-KH', 'الخرطوم', 'Khartoum', 1),
    ('SD-GZ', 'الجزيرة', 'Gezira', 2),
    ('SD-NW', 'النيل الأبيض', 'White Nile', 3),
    ('SD-NB', 'النيل الأزرق', 'Blue Nile', 4),
    ('SD-SI', 'سنار', 'Sennar', 5),
    ('SD-GD', 'القضارف', 'Gedaref', 6),
    ('SD-KA', 'كسلا', 'Kassala', 7),
    ('SD-RS', 'البحر الأحمر', 'Red Sea', 8),
    ('SD-NO', 'الشمالية', 'Northern', 9),
    ('SD-NR', 'نهر النيل', 'River Nile', 10),
    ('SD-KN', 'شمال كردفان', 'North Kordofan', 11),
    ('SD-KS', 'جنوب كردفان', 'South Kordofan', 12),
    ('SD-GK', 'غرب كردفان', 'West Kordofan', 13),
    ('SD-DN', 'شمال دارفور', 'North Darfur', 14),
    ('SD-DS', 'جنوب دارفور', 'South Darfur', 15),
    ('SD-DW', 'غرب دارفور', 'West Darfur', 16),
    ('SD-DC', 'وسط دارفور', 'Central Darfur', 17),
    ('SD-DE', 'شرق دارفور', 'East Darfur', 18),
]


class Command(BaseCommand):
    help = 'Seed the 18 geographic states (idempotent; no update; no delete; stop on conflict).'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **opts):
        created = skipped = 0
        conflicts = []
        with transaction.atomic():
            for code, ar, en, order in STATES:
                obj, was_created = GeographicState.objects.get_or_create(
                    code=code,
                    defaults={'name_ar': ar, 'name_en': en, 'order': order, 'is_active': True},
                )
                if was_created:
                    created += 1
                elif (obj.name_ar, obj.name_en, obj.order) != (ar, en, order):
                    conflicts.append(
                        f"{code}: existing=({obj.name_ar!r},{obj.name_en!r},order={obj.order}) "
                        f"expected=({ar!r},{en!r},order={order})"
                    )
                else:
                    skipped += 1
            if conflicts:
                transaction.set_rollback(True)
                raise CommandError('Conflict(s), aborting, no changes:\n  ' + '\n  '.join(conflicts))
            if opts['dry_run']:
                transaction.set_rollback(True)
                self.stdout.write(self.style.WARNING(f'DRY RUN: created={created}, skipped={skipped}'))
            else:
                self.stdout.write(self.style.SUCCESS(f'Done: created={created}, skipped={skipped}'))
