"""بيانات عرض لتقرير الترصد حسب الولاية (M7-A2b-lite).

ينشئ ~50 حالة ترصد موزّعة عمداً على ثلاث فئات، حتى يُثبت التقرير مصالحته
(reconciliation) بدل أن يعرض أصفاراً:

- 80%: منشأة صحية + تعيين عقدة نشط  → matched (تُجمَّع على ولاية)
- 10%: منشأة صحية بلا تعيين نشط     → unassigned_node
- 10%: بلا منشأة صحية               → unassigned_facility

**لا migrations ولا تغيير مخطط** — صفوف بيانات فقط، وكلها بأسماء `SEED_`
حتى يستطيع `--clean` حذف ما أنشأه بالضبط.

الاستخدام:
    python manage.py seed_surveillance_testcases --count 50
    python manage.py seed_surveillance_testcases --clean
"""

import datetime

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.laboratory.models import Disease
from apps.masterdata.models import HealthFacility
from apps.organization.models import Locality as OrgLocality
from apps.registry.models import HealthFacilityNodeAssignment, ReportingNode
from apps.surveillance.models.case import HealthCase

CASE_PREFIX = 'SEED_BY_STATE_'
FAC_MATCHED_PREFIX = 'SEED_FAC_MATCHED_'
FAC_UNASSIGNED_PREFIX = 'SEED_FAC_UNASSIGNED_'
NODE_FED = 'SEED_FED'
STATE_PREFIX = 'SEED_STATE_'
LOCALITY_PREFIX = 'SEED_LOC_'

MATCHED_RATIO = 0.8


class Command(BaseCommand):
    help = 'ينشئ حالات عرض (matched / unassigned_node / unassigned_facility) لتقرير by-state.'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=50, help='عدد الحالات (افتراضي 50)')
        parser.add_argument('--clean', action='store_true', help='احذف كل صفوف SEED_ ثم أعد الإنشاء')

    # ------------------------------------------------------------------ guards
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError(
                'هذا الأمر بيانات عرض فقط ويرفض العمل مع DEBUG=False (حماية الإنتاج).'
            )

        count = options['count']
        if count < 10:
            raise CommandError('--count يجب أن يكون 10 على الأقل (حتى تُغطى الفئات الثلاث).')

        if options['clean']:
            removed = self._clean()
            self.stdout.write(f'--clean: حُذفت {removed} صفاً من بيانات العرض.')

        root = self._ensure_root()
        states = self._ensure_states(root)
        matched_pool = self._ensure_matched_facilities(states)
        unassigned_pool = self._ensure_unassigned_facilities()

        matched_n = int(count * MATCHED_RATIO)
        remaining = count - matched_n
        node_n = remaining // 2
        facility_n = remaining - node_n

        disease = Disease.objects.order_by('icd_11_code').first()
        today = timezone.localdate()
        created = 0

        for index in range(1, count + 1):
            if index <= matched_n:
                facility = matched_pool[(index - 1) % len(matched_pool)]
            elif index <= matched_n + node_n:
                facility = unassigned_pool[(index - matched_n - 1) % len(unassigned_pool)]
            else:
                facility = None

            defaults = self._case_fields(index, facility, disease, today)
            _, was_created = HealthCase.objects.get_or_create(
                case_number=f'{CASE_PREFIX}{index:03d}',
                defaults=defaults,
            )
            created += int(was_created)

        self.stdout.write(self.style.SUCCESS(
            f'Created {created} cases across {len(matched_pool) + len(unassigned_pool)} facilities, '
            f'{len(states)} states '
            f'(matched={matched_n}, unassigned_node={node_n}, unassigned_facility={facility_n}).'
        ))

    # ------------------------------------------------------------------- tree
    def _ensure_root(self):
        """يعيد استخدام الجذر القائم. لا ينشئ جذراً ثانياً (قيد single_root)."""
        root = ReportingNode.objects.filter(parent__isnull=True).first()
        if root is not None:
            return root
        return ReportingNode.objects.create(
            code=NODE_FED,
            name_ar='وزارة الصحة الاتحادية (بيانات عرض)',
            kind=ReportingNode.Kind.FEDERAL,
        )

    def _ensure_states(self, root, wanted=2):
        states = list(
            ReportingNode.objects.filter(kind=ReportingNode.Kind.STATE, parent=root)
            .order_by('code')[:wanted]
        )
        while len(states) < wanted:
            number = len(states) + 1
            states.append(ReportingNode.objects.create(
                code=f'{STATE_PREFIX}{number}',
                name_ar=f'ولاية عرض {number}',
                kind=ReportingNode.Kind.STATE,
                parent=root,
            ))
        return states

    def _ensure_locality(self, state, number):
        locality_node = (
            ReportingNode.objects
            .filter(kind=ReportingNode.Kind.LOCALITY, parent=state)
            .order_by('code')
            .first()
        )
        if locality_node is not None:
            return locality_node
        return ReportingNode.objects.create(
            code=f'{LOCALITY_PREFIX}{number}',
            name_ar=f'محلية عرض {number}',
            kind=ReportingNode.Kind.LOCALITY,
            parent=state,
        )

    def _ensure_facility_node(self, locality_node, number):
        code = f'SEED_NODE_FAC_{number}'
        node = ReportingNode.objects.filter(code=code).first()
        if node is not None:
            return node
        return ReportingNode.objects.create(
            code=code,
            name_ar=f'منشأة عرض {number}',
            kind=ReportingNode.Kind.FACILITY,
            parent=locality_node,
        )

    # -------------------------------------------------------------- facilities
    def _ensure_matched_facilities(self, states):
        """منشآت لها تعيين عقدة نشط — تُعاد استخدامها إن وُجدت."""
        existing = list(
            HealthFacility.objects
            .filter(
                # `node_assignments__isnull=False` إلزامي: بدونه LEFT JOIN
                # يجعل المنشآت بلا أي تعيين تطابق `valid_to__isnull=True`.
                node_assignments__isnull=False,
                node_assignments__valid_to__isnull=True,
            )
            .distinct()
            .order_by('code')[:6]
        )
        if len(existing) >= 2:
            return existing

        org_locality = OrgLocality.objects.order_by('code').first()
        pool = list(existing)
        for number in range(1, 3):
            facility, _ = HealthFacility.objects.get_or_create(
                code=f'{FAC_MATCHED_PREFIX}{number}',
                defaults={'name_ar': f'منشأة عرض مرتبطة {number}', 'locality': org_locality},
            )
            locality_node = self._ensure_locality(states[(number - 1) % len(states)], number)
            node = self._ensure_facility_node(locality_node, number)
            HealthFacilityNodeAssignment.objects.get_or_create(
                facility=facility,
                node=node,
                valid_from=datetime.date(2020, 1, 1),
                defaults={'is_primary': True},
            )
            pool.append(facility)
        return pool

    def _ensure_unassigned_facilities(self, wanted=5):
        """منشآت بلا أي تعيين نشط — تُنشأ دائماً بأسماء SEED_."""
        org_locality = OrgLocality.objects.order_by('code').first()
        pool = []
        for number in range(1, wanted + 1):
            facility, _ = HealthFacility.objects.get_or_create(
                code=f'{FAC_UNASSIGNED_PREFIX}{number}',
                defaults={'name_ar': f'منشأة عرض بلا تعيين {number}', 'locality': org_locality},
            )
            pool.append(facility)
        return pool

    # ------------------------------------------------------------------ cases
    def _case_fields(self, index, facility, disease, today):
        fields = {
            'person_name': f'حالة عرض {index}',
            'disease': disease,
            'reported_date': today - datetime.timedelta(days=index % 30),
            'health_facility': facility,
        }
        if facility is not None:
            fields['port'] = facility.entry_point
            if facility.locality_id:
                fields['locality'] = facility.locality
                fields['sector'] = facility.locality.sector
        return fields

    # ------------------------------------------------------------------ clean
    def _clean(self):
        removed = HealthCase.objects.filter(case_number__startswith=CASE_PREFIX).delete()[0]
        removed += HealthFacility.objects.filter(
            code__startswith=FAC_MATCHED_PREFIX
        ).delete()[0] + HealthFacility.objects.filter(
            code__startswith=FAC_UNASSIGNED_PREFIX
        ).delete()[0]

        seed_nodes = ReportingNode.objects.filter(code=NODE_FED) | ReportingNode.objects.filter(
            code__startswith=STATE_PREFIX
        ) | ReportingNode.objects.filter(code__startswith=LOCALITY_PREFIX) | ReportingNode.objects.filter(
            code__startswith='SEED_NODE_FAC_'
        )
        # parent محمي (PROTECT): احذف الأعمق أولاً.
        for node in seed_nodes.order_by('-depth'):
            removed += node.delete()[0]
        return removed
