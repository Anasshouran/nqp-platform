"""بذر بيانات اختبار للسجل التنظيمي — DEV فقط.

Idempotent. كل code يبدأ بـ TEST_.
يرفض العمل في الإنتاج (DEBUG=False).
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.masterdata.models import HealthFacility, State
from apps.organization.models import Department, Locality, Sector
from apps.registry.models import (
    HealthFacilityNodeAssignment,
    LocalityNodeAssignment,
    RegistryChangeLog,
    ReportingNode,
    StateMinistry,
    StateNodeAssignment,
)


class Command(BaseCommand):
    help = "بذر بيانات اختبار للسجل التنظيمي (DEV فقط، TEST_ prefix)"

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Refuses to run in non-DEBUG environment")

        today = timezone.localdate()

        # ------------------------------------------------------------------
        # 1. ReportingNode جذر
        # ------------------------------------------------------------------
        # إذا وُجد جذر مسبقاً (من تشغيل سابق)، استخدمه — لا تنشئ ثانياً
        root = ReportingNode.objects.filter(parent__isnull=True).first()
        if root is not None:
            print(f"Root node {root.code} already exists — reusing")
        else:
            root, created = ReportingNode.objects.get_or_create(
                code="TEST_FMOH",
                defaults={
                    "kind": ReportingNode.Kind.FEDERAL,
                    "name_ar": "وزارة الصحة الاتحادية (اختبار)",
                    "name_en": "Federal Ministry of Health (Test)",
                    "is_active": True,
                    "order": 1,
                },
            )
            if created:
                RegistryChangeLog.objects.create(
                    action=RegistryChangeLog.Action.CREATE,
                    entity_type="ReportingNode",
                    entity_id=root.id,
                    entity_label=root.code,
                    detail={"kind": "FEDERAL"},
                )
            print(f"Root node {root.code} ready")

        # ------------------------------------------------------------------
        # 2. الولايات الثلاث (TEST_STATE_*) — نستخدم State موجودة أو ننتظر
        # ------------------------------------------------------------------
        test_states_data = [
            ("TEST_STATE_KRT", "الخرطوم (اختبار)", "White Nile (Test)"),
            ("TEST_STATE_RS", "البحر الأحمر (اختبار)", "Red Sea (Test)"),
            ("TEST_STATE_KS", "كسلا (اختبار)", "Kassala (Test)"),
        ]
        test_states = []
        from apps.masterdata.models import Sector as MasterSector
        master_sector = MasterSector.objects.filter(is_active=True).first()
        if master_sector is None:
            raise CommandError(
                "No masterdata.Sector found — cannot create test states. "
                "Run seed_masterdata or create a sector first."
            )
        for code, name_ar, name_en in test_states_data:
            # State.sector مطلوب — نوفر القطاع في defaults عند الإنشاء
            state, was = State.objects.get_or_create(
                code=code,
                defaults={
                    "name_ar": name_ar,
                    "name_en": name_en,
                    "sector": master_sector,
                },
            )

            node, node_created = ReportingNode.objects.get_or_create(
                code=code.replace("STATE", "NODE"),
                defaults={
                    "kind": ReportingNode.Kind.STATE,
                    "name_ar": name_ar,
                    "name_en": name_en,
                    "parent": root,
                    "is_active": True,
                    "order": 1,
                },
            )
            if node_created:
                RegistryChangeLog.objects.create(
                    action=RegistryChangeLog.Action.CREATE,
                    entity_type="ReportingNode",
                    entity_id=node.id,
                    entity_label=node.code,
                )
            assign, a_created = StateNodeAssignment.objects.get_or_create(
                state=state,
                valid_from=today,
                defaults={"node": node, "is_primary": True},
            )
            if a_created:
                RegistryChangeLog.objects.create(
                    action=RegistryChangeLog.Action.ASSIGN,
                    entity_type="StateNodeAssignment",
                    entity_id=assign.id,
                    entity_label=f"{state.code} → {node.code}",
                )
            test_states.append((state, node))

        print(f"Created {len(test_states)} test state nodes")

        # ------------------------------------------------------------------
        # 3. المحليات الستة (TEST_LOCALITY_*) — 2 لكل ولاية
        # ------------------------------------------------------------------
        # نحتاج قطاع إداري — استخدم آخر قطاع موجود أو أنشئ للاختبار (لا ينبغي أن نُنشِئ Sector)
        test_localities = []
        org_sector = Sector.objects.filter(is_active=True).first()
        if org_sector is None:
            raise CommandError(
                "No organization.Sector found — cannot create test localities. "
                "Run seed_organization or create a sector first."
            )
        for state, node in test_states:
            for i in (1, 2):
                loc_code = f"TEST_LOCALITY_{state.code}_{i}"
                locality, l_created = Locality.objects.get_or_create(
                    code=loc_code,
                    defaults={
                        "name_ar": f"محلية اختبار {i}",
                        "name_en": f"Test Locality {i}",
                        "sector": org_sector,
                    },
                )

                loc_node, ln_created = ReportingNode.objects.get_or_create(
                    code=loc_code.replace("LOCALITY", "NODE"),
                    defaults={
                        "kind": ReportingNode.Kind.LOCALITY,
                        "name_ar": locality.name_ar,
                        "name_en": locality.name_en,
                        "parent": node,
                        "is_active": True,
                        "order": i,
                    },
                )
                if ln_created:
                    RegistryChangeLog.objects.create(
                        action=RegistryChangeLog.Action.CREATE,
                        entity_type="ReportingNode",
                        entity_id=loc_node.id,
                        entity_label=loc_node.code,
                    )
                assign, a_created = LocalityNodeAssignment.objects.get_or_create(
                    locality=locality,
                    valid_from=today,
                    defaults={"node": loc_node, "is_primary": True},
                )
                if a_created:
                    RegistryChangeLog.objects.create(
                        action=RegistryChangeLog.Action.ASSIGN,
                        entity_type="LocalityNodeAssignment",
                        entity_id=assign.id,
                        entity_label=f"{locality.code} → {loc_node.code}",
                    )
                test_localities.append((locality, loc_node))

        print(f"Created {len(test_localities)} test localities")

        # ------------------------------------------------------------------
        # 4. المنشآت الصحية (TEST_FACILITY_*) — 2 لكل محلية
        # ------------------------------------------------------------------
        test_facilities = []
        for idx, (locality, loc_node) in enumerate(test_localities):
            for i in (1, 2):
                # أكواد قصيرة لتفادي تجاوز 40 حرفاً
                fac_code = f"TST_FAC_{idx+1}_{i}"
                facility, f_created = HealthFacility.objects.get_or_create(
                    code=fac_code,
                    defaults={
                        "name_ar": f"منشأة اختبار {i}",
                        "name_en": f"Test Facility {i}",
                        "kind": "HEALTH_CENTER",
                        "locality": locality,
                        "sector": locality.sector,
                    },
                )
                fac_node, fn_created = ReportingNode.objects.get_or_create(
                    code=f"TST_NOD_FAC_{idx+1}_{i}",
                    defaults={
                        "kind": ReportingNode.Kind.FACILITY,
                        "name_ar": facility.name_ar,
                        "name_en": facility.name_en,
                        "parent": loc_node,
                        "is_active": True,
                        "order": i,
                    },
                )
                if fn_created:
                    RegistryChangeLog.objects.create(
                        action=RegistryChangeLog.Action.CREATE,
                        entity_type="ReportingNode",
                        entity_id=fac_node.id,
                        entity_label=fac_node.code,
                    )
                assign, a_created = HealthFacilityNodeAssignment.objects.get_or_create(
                    facility=facility,
                    valid_from=today,
                    defaults={"node": fac_node, "is_primary": True},
                )
                if a_created:
                    RegistryChangeLog.objects.create(
                        action=RegistryChangeLog.Action.ASSIGN,
                        entity_type="HealthFacilityNodeAssignment",
                        entity_id=assign.id,
                        entity_label=f"{facility.code} → {fac_node.code}",
                    )
                test_facilities.append((facility, fac_node))

        print(f"Created {len(test_facilities)} test facilities")

        # ------------------------------------------------------------------
        # 5. الأقسام (TEST_DEPT_*) — Department.facility (M1-addon)
        # ------------------------------------------------------------------
        # يفترض تنفيذ M1-addon — إن لم يكن ممكناً، تُتخطَّى صامتاً
        has_facility_fk = hasattr(Department, "facility")
        if has_facility_fk and len(test_facilities) >= 3:
            # 3 أقسام تحت أول 3 منشآت
            dept_count = 0
            for facility, fac_node in test_facilities[:3]:
                dept_code = f"TEST_DEPT_{facility.code}"
                dept, d_created = Department.objects.get_or_create(
                    code=dept_code,
                    defaults={
                        "name_ar": f"إدارة {facility.name_ar}",
                        "facility": facility,
                        "sector": facility.sector,
                    },
                )
                if d_created:
                    RegistryChangeLog.objects.create(
                        action=RegistryChangeLog.Action.CREATE,
                        entity_type="Department",
                        entity_id=dept.id,
                        entity_label=dept.code,
                    )
                    dept_count += 1
            print(f"Created {dept_count} test departments (Department.facility addon)")
        else:
            print("Department.facility not available (M1-addon not executed) - departments skipped")

        # ------------------------------------------------------------------
        # 6. وزارات الولايات
        # ------------------------------------------------------------------
        min_count = 0
        for state, node in test_states:
            ministry, created = StateMinistry.objects.get_or_create(
                state=state,
                defaults={
                    "ministry_name_ar": f"وزارة الصحة — {state.name_ar}",
                    "ministry_name_en": f"Ministry of Health — {state.name_en}",
                    "address": f"المقر الرئيسي — {state.name_ar}",
                },
            )
            if created:
                RegistryChangeLog.objects.create(
                    action=RegistryChangeLog.Action.CREATE,
                    entity_type="StateMinistry",
                    entity_id=ministry.id,
                    entity_label=ministry.ministry_name_ar,
                )
                min_count += 1
        print(f"Created {min_count} StateMinistry records")

        print("\nSeed completed successfully (idempotent).")
