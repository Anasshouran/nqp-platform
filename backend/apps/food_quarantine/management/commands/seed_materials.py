from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.food_quarantine.models import (
    DisposalRequest,
    FoodSample,
    MaterialCatalog,
    MaterialIssue,
    MaterialLot,
    Solution,
    StorageLocation,
)
from apps.accounts.models import User

MATERIALS = [
    # name_ar, name_en, type, bench, manufacturer, catalog_number, cas, grade, unit, min, reorder, max, hazard
    ('ميثانول', 'Methanol', 'REAGENT', 'CHEMISTRY', 'Merck', '106009', '67-56-1', 'HPLC', 'L', 3, 4, 10, 'FLAMMABLE'),
    ('كلوريد الصوديوم', 'Sodium Chloride', 'REAGENT', 'CHEMISTRY', 'Sigma-Aldrich', 'S7653', '7647-14-5', 'ANALYTICAL', 'g', 500, 800, 2000, 'NONE'),
    ('ماء مقطر', 'Distilled Water', 'CHEMICAL', 'CHEMISTRY', 'In-house', '', '7732-18-5', 'ANALYTICAL', 'L', 5, 10, 30, 'NONE'),
    ('أغار ماكونكي', 'MacConkey Agar', 'CULTURE_MEDIA', 'MICROBIOLOGY', 'Oxoid', 'CM0007', '', 'MICROBIOLOGICAL', 'g', 100, 200, 500, 'NONE'),
    ('وسط بوفتون', 'Buffered Peptone Water', 'CULTURE_MEDIA', 'MICROBIOLOGY', 'Oxoid', 'CM0509', '', 'MICROBIOLOGICAL', 'g', 200, 300, 800, 'NONE'),
    ('أفلاتوكسين B1 قياسي', 'Aflatoxin B1 Standard', 'REFERENCE_STANDARD', 'CHEMISTRY', 'Supelco', '46304-U', '1162-65-8', 'ANALYTICAL', 'mg', 1, 2, 5, 'TOXIC'),
    ('حمض الهيدروكلوريك', 'Hydrochloric Acid', 'CHEMICAL', 'CHEMISTRY', 'Merck', '100317', '7647-01-0', 'ANALYTICAL', 'L', 1, 2, 5, 'CORROSIVE'),
    ('أنابيب اختبار', 'Test Tubes', 'CONSUMABLE', 'MICROBIOLOGY', 'Generic', '', '', 'OTHER', 'pcs', 100, 200, 1000, 'NONE'),
    ('هيدروكسيد الصوديوم', 'Sodium Hydroxide', 'CHEMICAL', 'CHEMISTRY', 'Sigma-Aldrich', 'S5881', '1310-73-2', 'ANALYTICAL', 'g', 250, 400, 1000, 'CORROSIVE'),
    ('بيئة قياسية معتمدة', 'CRM - Milk Powder', 'CRM', 'CHEMISTRY', 'NIST', 'SRM-1549a', '', 'ANALYTICAL', 'g', 10, 15, 50, 'NONE'),
]

LOTS = [
    # material_index, lot_number, batch, expiry_offset_days, quantity, storage, supplier, cert
    (0, 'MTH-2026-0458', 'B-458', 820, 5.0, 'Cabinet C-04 / Shelf 02', 'Merck', 'CoA-458'),
    (0, 'MTH-2025-002', 'B-002', -40, 2.0, 'Cabinet C-04 / Shelf 02', 'Merck', 'CoA-002'),
    (1, 'NaCl-2026-011', 'B-011', 300, 1500.0, 'Cabinet C-01 / Shelf 01', 'Sigma-Aldrich', 'CoA-011'),
    (2, 'DW-2026-030', 'B-030', 180, 20.0, 'Cabinet C-05', 'In-house', ''),
    (3, 'MAC-2026-001', 'B-001', 90, 300.0, 'Fridge M-01', 'Oxoid', 'CoA-001'),
    (4, 'BPW-2026-002', 'B-002', 60, 500.0, 'Fridge M-01', 'Oxoid', 'CoA-002'),
    (5, 'AFB1-2026-010', 'B-010', 400, 2.0, 'Cabinet C-02 (Cold)', 'Supelco', 'CoA-010'),
    (6, 'HCl-2026-005', 'B-005', 200, 3.0, 'Cabinet C-06 (Haz)', 'Merck', 'CoA-005'),
    (7, 'TT-2026-020', 'B-020', 700, 800.0, 'Shelf 03', 'Generic', ''),
    (8, 'NaOH-2026-008', 'B-008', 350, 800.0, 'Cabinet C-06 (Haz)', 'Sigma-Aldrich', 'CoA-008'),
    (9, 'CRM-MP-2025-001', 'B-001', 250, 20.0, 'Cabinet C-02 (Cold)', 'NIST', 'Cert-001'),
]


class Command(BaseCommand):
    help = 'بذر نظام إدارة الكواشف والمحاليل — كتالوج مواد + تشغيلات + محاليل + صرف + تخلص'

    def handle(self, *args, **options):
        # مواقع التخزين
        store, _ = StorageLocation.objects.get_or_create(name='المخزن المركزي', location_type='STORE')
        chem_room, _ = StorageLocation.objects.get_or_create(
            name='غرفة الكيمياء', location_type='ROOM', parent=store, temperature='20-25°C', humidity='≤60%'
        )
        micro_room, _ = StorageLocation.objects.get_or_create(
            name='غرفة الأحياء الدقيقة', location_type='ROOM', parent=store, temperature='4-8°C', humidity='≤70%'
        )
        cabinets = {}
        for cab, room in [('Cabinet C-04 / Shelf 02', chem_room), ('Cabinet C-01 / Shelf 01', chem_room),
                          ('Cabinet C-05', chem_room), ('Cabinet C-06 (Haz)', chem_room),
                          ('Cabinet C-02 (Cold)', chem_room), ('Fridge M-01', micro_room), ('Shelf 03', micro_room)]:
            cabinets[cab], _ = StorageLocation.objects.get_or_create(name=cab, location_type='CABINET', parent=room)

        # المواد
        materials = []
        for i, (name_ar, name_en, mtype, bench, mfr, cat, cas, grade, unit, mn, re, mx, haz) in enumerate(MATERIALS):
            m, _ = MaterialCatalog.objects.update_or_create(
                name_ar=name_ar,
                defaults={
                    'name_en': name_en, 'material_type': mtype, 'bench': bench, 'manufacturer': mfr,
                    'catalog_number': cat, 'cas_number': cas, 'grade': grade, 'unit': unit,
                    'min_stock': mn, 'reorder_level': re, 'max_stock': mx, 'hazard_class': haz,
                },
            )
            materials.append(m)

        # التشغيلات
        today = timezone.now().date()
        for (mi, lot, batch, exp_days, qty, storage_key, supplier, cert) in LOTS:
            expiry = today + timedelta(days=exp_days)
            status = MaterialLot.LotStatus.EXPIRED if exp_days < 0 else (
                MaterialLot.LotStatus.EXPIRING_SOON if exp_days <= 30 else MaterialLot.LotStatus.VALID
            )
            MaterialLot.objects.update_or_create(
                material=materials[mi], lot_number=lot,
                defaults={
                    'batch_number': batch, 'expiry_date': expiry, 'quantity': qty,
                    'unit': materials[mi].unit, 'storage': cabinets.get(storage_key),
                    'supplier': supplier, 'certificate_ref': cert, 'received_date': today,
                    'status': status,
                },
            )

        # محاليل
        director = User.objects.filter(role_assignments__role__name='Laboratory Director').first()
        qa = User.objects.filter(role_assignments__role__name='Quality Assurance Officer').first()
        methanol = MaterialCatalog.objects.filter(name_ar='ميثانول').first()
        naoh = MaterialCatalog.objects.filter(name_ar='هيدروكسيد الصوديوم').first()
        water = MaterialCatalog.objects.filter(name_ar='ماء مقطر').first()
        sol_data = [
            ('ميثانول 80%', methanol, '80%', 'ماء مقطر', 1000, 'MTH-2026-0458', today, today + timedelta(days=45), Solution.SolutionStatus.PENDING_VERIFICATION),
            ('هيدروكسيد الصوديوم 0.1N', naoh, '0.1 N', 'ماء مقطر', 1000, 'NaOH-2026-008', today - timedelta(days=1), today + timedelta(days=30), Solution.SolutionStatus.APPROVED),
            ('ماء معقم', water, '', '', 500, 'DW-2026-030', today - timedelta(days=5), today + timedelta(days=60), Solution.SolutionStatus.APPROVED),
        ]
        for (name, mat, conc, solvent, vol, lot_num, prep, exp, st) in sol_data:
            lot = MaterialLot.objects.filter(lot_number=lot_num).first()
            Solution.objects.update_or_create(
                name=name,
                defaults={
                    'material': mat, 'concentration': conc, 'solvent': solvent,
                    'final_volume': vol, 'source_lot': lot, 'batch_number': f'SOL-{name[:3]}-{prep.strftime("%m%y")}',
                    'preparation_date': prep, 'expiry_date': exp,
                    'prepared_by': director, 'verified_by': qa if st == Solution.SolutionStatus.APPROVED else None,
                    'verified_at': (prep + timedelta(hours=2)) if st == Solution.SolutionStatus.APPROVED else None,
                    'storage': cabinets.get('Cabinet C-05'), 'status': st,
                },
            )

        # صرف (استهلاك) لبعض التشغيلات
        sample = FoodSample.objects.order_by('-created_at').first()
        for lot_number, qty_used in [('MTH-2026-0458', 0.025), ('MAC-2026-001', 10), ('HCl-2026-005', 0.05)]:
            lot = MaterialLot.objects.filter(lot_number=lot_number).first()
            if lot:
                MaterialIssue.objects.get_or_create(
                    material=lot.material, lot=lot,
                    defaults={
                        'sample': sample, 'issue_type': MaterialIssue.IssueType.CONSUMPTION,
                        'quantity_used': qty_used, 'unit': lot.unit,
                        'purpose': 'استهلاك تحليلي للعينات', 'issued_by': director,
                    },
                )

        # طلب تخلص لتشغيلة منتهية
        expired_lot = MaterialLot.objects.filter(lot_number='MTH-2025-002').first()
        if expired_lot and not DisposalRequest.objects.filter(lot=expired_lot).exists():
            DisposalRequest.objects.create(
                material=expired_lot.material, lot=expired_lot, quantity=expired_lot.quantity,
                unit=expired_lot.unit, reason='انتهاء الصلاحية', detail='تشغيلة منتهية — منع الاستخدام',
                requested_by=qa, status=DisposalRequest.DisposalStatus.PENDING,
            )

        self.stdout.write(self.style.SUCCESS(f'تم البذر: {MaterialCatalog.objects.count()} مادة، '
                                             f'{MaterialLot.objects.count()} تشغيلة، {Solution.objects.count()} محلول، '
                                             f'{MaterialIssue.objects.count()} صرف، '
                                             f'{DisposalRequest.objects.count()} طلب تخلص، '
                                             f'{StorageLocation.objects.count()} موقع تخزين'))