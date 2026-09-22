from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.food_quarantine.models import (
    AnalyticalMethod,
    FoodProduct,
    LabParameter,
    Microorganism,
    ProductCategory,
    RegulatoryRule,
    SamplingPolicy,
    Standard,
    StandardRequirement,
    StandardVersion,
)


class Command(BaseCommand):
    help = 'بذر المواصفات والمعايير — قواعد التطبيق، الطرق التحليلية، المواصفات، الإصدارات، المتطلبات'

    def handle(self, *args, **options):
        self.stdout.write('=== بذر قواعد التطبيق التنظيمية ===')
        rules_data = [
            ('RULE_NATIONAL_LAW', 'قانون/تشريع وطني', 'القانون الوطني والتشريعات الملزمة', 1, RegulatoryRule.SourceType.NATIONAL_LAW),
            ('RULE_SSMO', 'المواصفة السودانية SSMO', 'المواصفة السودانية المعتمدة', 2, RegulatoryRule.SourceType.SUDANESE_STANDARD),
            ('RULE_REG_DECISION', 'قرار تنظيمي/سياسة الجهة', 'قرارات الجهة التنظيمية وسياساتها المعتمدة', 3, RegulatoryRule.SourceType.REGULATORY_DECISION),
            ('RULE_CONTRACT', 'اشتراط تعاقدي/بلد المقصد', 'متطلبات البلد المستورد أو العقد', 4, RegulatoryRule.SourceType.CONTRACT_DESTINATION),
            ('RULE_GSO', 'مرجع GSO معتمد', 'المواصفة الخليجية عند اعتمادها كمرجع', 5, RegulatoryRule.SourceType.GSO_REFERENCE),
            ('RULE_CODEX', 'مرجع Codex', 'معيار Codex Alimentarius كمرجع دولي', 6, RegulatoryRule.SourceType.CODEX_REFERENCE),
        ]
        for code, name_ar, desc, priority, src in rules_data:
            RegulatoryRule.objects.update_or_create(
                code=code,
                defaults={
                    'name_ar': name_ar, 'description': desc, 'priority': priority,
                    'source_type': src, 'is_active': True,
                },
            )
        self.stdout.write('  تم: 6 قواعد تطبيق')

        self.stdout.write('=== بذر الطرق التحليلية (ISO/AOAC/Codex) ===')
        methods_data = [
            ('AOAC-991.31', 'AOAC Official Method 991.31 — بروتين (Kjeldahl)', 'AOAC', '2019', 'Food', '', '0.1', '0.3', '%', 'VALIDATED', 'AOAC OMA'),
            ('AOAC-990.03', 'AOAC Official Method 990.03 — رطوبة', 'AOAC', '2019', 'Food', '', '0.05', '0.1', '%', 'VALIDATED', 'AOAC OMA'),
            ('AOAC-970.44', 'AOAC Official Method 970.44 — أفلاتوكسين B1 (HPLC)', 'AOAC', '2019', 'Food', '', '0.1', '0.5', 'µg/kg', 'VALIDATED', 'AOAC OMA'),
            ('AOAC-2000.08', 'AOAC Official Method 2000.08 — أفلاتوكسين M1 (ELISA)', 'AOAC', '2019', 'Milk', '', '0.01', '0.05', 'µg/kg', 'PERFORMANCE_TESTED', 'AOAC OMA'),
            ('ISO-8968-1', 'ISO 8968-1 — بروتين (Kjeldahl)', 'ISO', '2001', 'Milk', '', '0.1', '0.3', '%', 'VALIDATED', 'ISO'),
            ('ISO-6731', 'ISO 6731 — رطوبة (تجفيف)', 'ISO', '2010', 'Milk', '', '0.05', '0.1', '%', 'VALIDATED', 'ISO'),
            ('ISO-11816', 'ISO 11816 — أفلاتوكسين M1 (HPLC)', 'ISO', '2012', 'Milk', '', '0.01', '0.05', 'µg/kg', 'VALIDATED', 'ISO'),
            ('ISO-6579-1', 'ISO 6579-1 — Salmonella (PCR/Traditional)', 'ISO', '2017', 'Food', 'Salmonella', '', '', 'cfu/25g', 'VALIDATED', 'ISO'),
            ('ISO-4833-1', 'ISO 4833-1 — Aerobic Plate Count', 'ISO', '2013', 'Food', 'Aerobic bacteria', '', '', 'cfu/g', 'VALIDATED', 'ISO'),
            ('ISO-6888-1', 'ISO 6888-1 — S. aureus', 'ISO', '1999', 'Food', 'Staphylococcus aureus', '', '', 'cfu/g', 'VALIDATED', 'ISO'),
            ('CODEX-STAN-192', 'CXS 192-1995 — General Standard for Food Additives', 'CODEX', '1995', 'Food', '', '', '', '', 'VALIDATED', 'Codex'),
            ('CODEX-STAN-234', 'CXS 234-1999 — Recommended Methods of Analysis and Sampling', 'CODEX', '1999', 'Food', '', '', '', '', 'VALIDATED', 'Codex'),
            ('SSMO-MILK-001', 'المواصفة السودانية للحليب المجفف', 'SSMO', '2026', 'Milk Powder', '', '', '', '', 'VALIDATED', 'SSMO'),
        ]
        for code, name_ar, src, ver, matrix, org, lod, loq, unit, val, ref in methods_data:
            AnalyticalMethod.objects.update_or_create(
                code=code,
                defaults={
                    'name_ar': name_ar, 'name_en': name_ar.split('—')[-1].strip() if '—' in name_ar else name_ar,
                    'source': src, 'version': ver, 'matrix': matrix, 'applicable_organism': org,
                    'lod': lod or '', 'loq': loq or '', 'unit': unit,
                    'validation_status': val, 'reference_standard': ref, 'active': True,
                },
            )
        self.stdout.write('  تم: 13 طريقة تحليلية')

        self.stdout.write('=== بذر المنتجات والفئات ===')
        dairy_cat, _ = ProductCategory.objects.update_or_create(
            code='DAIRY', defaults={'name_ar': 'منتجات الألبان', 'name_en': 'Dairy Products', 'order': 1, 'active': True}
        )
        milk_powder, _ = FoodProduct.objects.update_or_create(
            name_ar='حليب مجفف كامل الدسم',
            defaults={
                'code': 'MP-001', 'name_en': 'Whole Milk Powder',
                'category': 'منتجات الألبان', 'subcategory': 'مساحيق الحليب',
                'risk_group': SamplingPolicy.RiskGroup.R1, 'reference_quantity': '500g',
                'micro_category': dairy_cat, 'order': 1, 'is_active': True,
            },
        )
        self.stdout.write(f'  تم: {milk_powder.name_ar}')

        self.stdout.write('=== بذر المواصفات (SSMO/GSO/Codex) ===')
        # SSMO Milk Powder
        ssmo_milk, _ = Standard.objects.update_or_create(
            code='SSMO-MP-2026',
            defaults={
                'title_ar': 'المواصفة السودانية للحليب المجفف',
                'title_en': 'Sudanese Standard for Milk Powder',
                'source': Standard.Source.SSMO, 'country': 'Sudan',
                'document_reference': 'SSMO 2026', 'product': milk_powder,
                'product_category': dairy_cat, 'mandatory': True,
                'status': Standard.Status.ACTIVE, 'approval_date': timezone.now(),
                'notes': 'المواصفة الوطنية الملزمة للحليب المجفف',
            },
        )
        # GSO Milk Powder
        gso_milk, _ = Standard.objects.update_or_create(
            code='GSO-1654-2023',
            defaults={
                'title_ar': 'المواصفة الخليجية للحليب المجفف',
                'title_en': 'GSO Standard for Milk Powder',
                'source': Standard.Source.GSO, 'country': 'GCC',
                'document_reference': 'GSO 1654/2023', 'product': milk_powder,
                'product_category': dairy_cat, 'mandatory': True,
                'status': Standard.Status.ACTIVE, 'approval_date': timezone.now(),
                'notes': 'المواصفة الخليجية للحليب ومساحيق الحليب',
            },
        )
        # Codex Milk Powder
        codex_milk, _ = Standard.objects.update_or_create(
            code='CXS-207-1999',
            defaults={
                'title_ar': 'معيار Codex للحليب المجفف',
                'title_en': 'Codex Standard for Milk Powders',
                'source': Standard.Source.CODEX, 'country': 'International',
                'document_reference': 'CXS 207-1999', 'product': milk_powder,
                'product_category': dairy_cat, 'mandatory': False,
                'status': Standard.Status.ACTIVE, 'approval_date': timezone.now(),
                'notes': 'معيار Codex Alimentarius للحليب المجفف ومساحيق الحليب',
            },
        )
        # ISO Milk Powder (methods)
        iso_milk, _ = Standard.objects.update_or_create(
            code='ISO-8968-1-2001',
            defaults={
                'title_ar': 'ISO 8968-1 — بروتين الحليب',
                'title_en': 'ISO 8968-1 Milk Protein (Kjeldahl)',
                'source': Standard.Source.ISO, 'country': 'International',
                'document_reference': 'ISO 8968-1:2001', 'product': milk_powder,
                'product_category': dairy_cat, 'mandatory': False,
                'status': Standard.Status.ACTIVE, 'approval_date': timezone.now(),
                'notes': 'طريقة ISO لبروتين الحليب',
            },
        )
        self.stdout.write('  تم: 4 مواصفات (SSMO/GSO/Codex/ISO)')

        self.stdout.write('=== بذر إصدارات المواصفات ===')
        today = date.today()
        ssmo_v1, _ = StandardVersion.objects.update_or_create(
            standard=ssmo_milk, version='2026',
            defaults={
                'effective_from': today - timedelta(days=365),
                'effective_to': None, 'issue_date': today - timedelta(days=400),
                'document_reference': 'SSMO 2026', 'approval_date': timezone.now(),
                'notes': 'الإصدار الحالي الساري',
            },
        )
        gso_v1, _ = StandardVersion.objects.update_or_create(
            standard=gso_milk, version='2023',
            defaults={
                'effective_from': today - timedelta(days=730),
                'effective_to': None, 'issue_date': today - timedelta(days=800),
                'document_reference': 'GSO 1654/2023', 'approval_date': timezone.now(),
                'notes': 'إصدار 2023 الساري',
            },
        )
        codex_v1, _ = StandardVersion.objects.update_or_create(
            standard=codex_milk, version='1999',
            defaults={
                'effective_from': date(1999, 1, 1),
                'effective_to': None, 'issue_date': date(1999, 1, 1),
                'document_reference': 'CXS 207-1999', 'approval_date': timezone.now(),
                'notes': 'معيار Codex 1999',
            },
        )
        iso_v1, _ = StandardVersion.objects.update_or_create(
            standard=iso_milk, version='2001',
            defaults={
                'effective_from': date(2001, 1, 1),
                'effective_to': None, 'issue_date': date(2001, 1, 1),
                'document_reference': 'ISO 8968-1:2001', 'approval_date': timezone.now(),
                'notes': 'ISO 8968-1:2001',
            },
        )
        self.stdout.write('  تم: 4 إصدارات')

        self.stdout.write('=== بذر المعامل (LabParameter) للاستخدام في المتطلبات ===')
        protein, _ = LabParameter.objects.update_or_create(
            code='PROTEIN', defaults={'name_ar': 'البروتين', 'name_en': 'Protein', 'bench': 'CHEMISTRY', 'unit': '%', 'method': 'Kjeldahl', 'reference_limit': '>= 34.0', 'is_active': True}
        )
        moisture, _ = LabParameter.objects.update_or_create(
            code='MOISTURE', defaults={'name_ar': 'الرطوبة', 'name_en': 'Moisture', 'bench': 'CHEMISTRY', 'unit': '%', 'method': 'Drying', 'reference_limit': '<= 4.0', 'is_active': True}
        )
        aflatoxin_b1, _ = LabParameter.objects.update_or_create(
            code='AFLATOXIN_B1', defaults={'name_ar': 'أفلاتوكسين B1', 'name_en': 'Aflatoxin B1', 'bench': 'CHEMISTRY', 'unit': 'µg/kg', 'method': 'HPLC', 'reference_limit': '<= 0.5', 'is_active': True}
        )
        aflatoxin_m1, _ = LabParameter.objects.update_or_create(
            code='AFLATOXIN_M1', defaults={'name_ar': 'أفلاتوكسين M1', 'name_en': 'Aflatoxin M1', 'bench': 'CHEMISTRY', 'unit': 'µg/kg', 'method': 'ELISA/HPLC', 'reference_limit': '<= 0.05', 'is_active': True}
        )
        self.stdout.write('  تم: 4 معامل كيميائية')

        self.stdout.write('=== بذر الكائنات الدقيقة ===')
        salmonella, _ = Microorganism.objects.update_or_create(
            code='SALMONELLA', defaults={'name_ar': 'السالمونيلا', 'name_en': 'Salmonella', 'scientific_name': 'Salmonella spp.', 'category': 'Pathogen', 'detection_type': 'PRESENCE_ABSENCE', 'default_unit': 'cfu/25g', 'active': True}
        )
        ecoli, _ = Microorganism.objects.update_or_create(
            code='ECOLI', defaults={'name_ar': 'إي كولاي', 'name_en': 'E. coli', 'scientific_name': 'Escherichia coli', 'category': 'Hygiene Indicator', 'detection_type': 'QUANTITATIVE', 'default_unit': 'cfu/g', 'active': True}
        )
        saureus, _ = Microorganism.objects.update_or_create(
            code='SAUREUS', defaults={'name_ar': 'المكورات العنقودية الذهبية', 'name_en': 'S. aureus', 'scientific_name': 'Staphylococcus aureus', 'category': 'Pathogen', 'detection_type': 'QUANTITATIVE', 'default_unit': 'cfu/g', 'active': True}
        )
        apc, _ = Microorganism.objects.update_or_create(
            code='APC', defaults={'name_ar': 'العد الكلي الهوائي', 'name_en': 'Aerobic Plate Count', 'scientific_name': '', 'category': 'Hygiene Indicator', 'detection_type': 'QUANTITATIVE', 'default_unit': 'cfu/g', 'active': True}
        )
        self.stdout.write('  تم: 4 كائنات دقيقة')

        self.stdout.write('=== بذر المتطلبات (StandardRequirement) ===')
        method_aoac_protein = AnalyticalMethod.objects.get(code='AOAC-991.31')
        method_aoac_moisture = AnalyticalMethod.objects.get(code='AOAC-990.03')
        method_aoac_afb1 = AnalyticalMethod.objects.get(code='AOAC-970.44')
        method_iso_protein = AnalyticalMethod.objects.get(code='ISO-8968-1')
        method_iso_moisture = AnalyticalMethod.objects.get(code='ISO-6731')
        method_codex = AnalyticalMethod.objects.get(code='CODEX-STAN-234')
        method_iso_salmonella = AnalyticalMethod.objects.get(code='ISO-6579-1')
        method_iso_apc = AnalyticalMethod.objects.get(code='ISO-4833-1')
        method_iso_saureus = AnalyticalMethod.objects.get(code='ISO-6888-1')

        # --- SSMO 2026 requirements ---
        reqs_ssmo = [
            # Chemical limits
            (ssmo_v1, protein, None, method_aoac_protein, 'MINIMUM', '34.0', None, '%', 0, 0, None, None, 'THREE_CLASS', {}),
            (ssmo_v1, moisture, None, method_aoac_moisture, 'MAXIMUM', None, '4.0', '%', 0, 0, None, None, 'THREE_CLASS', {}),
            (ssmo_v1, aflatoxin_b1, None, method_aoac_afb1, 'MAXIMUM', None, '0.5', 'µg/kg', 0, 0, None, None, 'THREE_CLASS', {}),
            # Micro limits
            (ssmo_v1, None, salmonella, method_iso_salmonella, 'PRESENCE_ABSENCE', None, None, 'cfu/25g', 5, 0, None, None, 'PRESENCE_ABSENCE', {}),
            (ssmo_v1, None, ecoli, method_iso_apc, 'MAXIMUM', None, '10', 'cfu/g', 5, 2, '10', '100', 'THREE_CLASS', {'m_op': 'gt', 'M_op': 'gt'}),
            (ssmo_v1, None, saureus, method_iso_saureus, 'MAXIMUM', None, '100', 'cfu/g', 5, 2, '100', '1000', 'THREE_CLASS', {'m_op': 'gt', 'M_op': 'gt'}),
        ]
        for (ver, param, micro, method, ltype, minv, maxv, unit, n, c, m, M, plan, rule) in reqs_ssmo:
            StandardRequirement.objects.update_or_create(
                version=ver, parameter=param, microorganism=micro,
                defaults={'method': method, 'limit_type': ltype, 'min_value': minv, 'max_value': maxv, 'unit': unit,
                          'n': n, 'c': c, 'm': m, 'M': M, 'plan': plan, 'rule_json': rule, 'active': True},
            )

        # --- GSO 2023 requirements ---
        reqs_gso = [
            (gso_v1, protein, None, method_iso_protein, 'MINIMUM', '34.0', None, '%', 0, 0, None, None, 'THREE_CLASS', {}),
            (gso_v1, moisture, None, method_iso_moisture, 'MAXIMUM', None, '5.0', '%', 0, 0, None, None, 'THREE_CLASS', {}),
            (gso_v1, aflatoxin_b1, None, method_aoac_afb1, 'MAXIMUM', None, '1.0', 'µg/kg', 0, 0, None, None, 'THREE_CLASS', {}),
            (gso_v1, None, salmonella, method_iso_salmonella, 'PRESENCE_ABSENCE', None, None, 'cfu/25g', 5, 0, None, None, 'PRESENCE_ABSENCE', {}),
            (gso_v1, None, ecoli, method_iso_apc, 'MAXIMUM', None, '10', 'cfu/g', 5, 2, '10', '100', 'THREE_CLASS', {'m_op': 'gt', 'M_op': 'gt'}),
        ]
        for (ver, param, micro, method, ltype, minv, maxv, unit, n, c, m, M, plan, rule) in reqs_gso:
            StandardRequirement.objects.update_or_create(
                version=ver, parameter=param, microorganism=micro,
                defaults={'method': method, 'limit_type': ltype, 'min_value': minv, 'max_value': maxv, 'unit': unit,
                          'n': n, 'c': c, 'm': m, 'M': M, 'plan': plan, 'rule_json': rule, 'active': True},
            )

        # --- Codex requirements ---
        reqs_codex = [
            (codex_v1, protein, None, method_codex, 'MINIMUM', '34.0', None, '%', 0, 0, None, None, 'THREE_CLASS', {}),
            (codex_v1, moisture, None, method_codex, 'MAXIMUM', None, '5.0', '%', 0, 0, None, None, 'THREE_CLASS', {}),
            (codex_v1, aflatoxin_b1, None, method_codex, 'MAXIMUM', None, '0.5', 'µg/kg', 0, 0, None, None, 'THREE_CLASS', {}),
            (codex_v1, None, salmonella, method_codex, 'PRESENCE_ABSENCE', None, None, 'cfu/25g', 5, 0, None, None, 'PRESENCE_ABSENCE', {}),
        ]
        for (ver, param, micro, method, ltype, minv, maxv, unit, n, c, m, M, plan, rule) in reqs_codex:
            StandardRequirement.objects.update_or_create(
                version=ver, parameter=param, microorganism=micro,
                defaults={'method': method, 'limit_type': ltype, 'min_value': minv, 'max_value': maxv, 'unit': unit,
                          'n': n, 'c': c, 'm': m, 'M': M, 'plan': plan, 'rule_json': rule, 'active': True},
            )

        # --- ISO requirements ---
        reqs_iso = [
            (iso_v1, protein, None, method_iso_protein, 'MINIMUM', '34.0', None, '%', 0, 0, None, None, 'THREE_CLASS', {}),
            (iso_v1, moisture, None, method_iso_moisture, 'MAXIMUM', None, '5.0', '%', 0, 0, None, None, 'THREE_CLASS', {}),
        ]
        for (ver, param, micro, method, ltype, minv, maxv, unit, n, c, m, M, plan, rule) in reqs_iso:
            StandardRequirement.objects.update_or_create(
                version=ver, parameter=param, microorganism=micro,
                defaults={'method': method, 'limit_type': ltype, 'min_value': minv, 'max_value': maxv, 'unit': unit,
                          'n': n, 'c': c, 'm': m, 'M': M, 'plan': plan, 'rule_json': rule, 'active': True},
            )

        self.stdout.write(self.style.SUCCESS(
            f'اكتمل بذر المواصفات: '
            f'{Standard.objects.count()} مواصفة، '
            f'{StandardVersion.objects.count()} إصدار، '
            f'{StandardRequirement.objects.count()} متطلب، '
            f'{AnalyticalMethod.objects.count()} طريقة، '
            f'{RegulatoryRule.objects.count()} قاعدة تطبيق'
        ))