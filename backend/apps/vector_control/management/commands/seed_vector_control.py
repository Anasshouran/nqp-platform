from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.masterdata.models import EntryPoint
from apps.vector_control.models import (
    VectorChemical,
    VectorEquipment,
    VectorFocus,
    VectorInventoryItem,
    VectorRegistry,
    VectorReport,
    VectorSite,
    VectorSurvey,
    VectorTeam,
    VectorUnit,
)


class Command(BaseCommand):
    help = 'بذر بيانات مبدئية لنظام مكافحة النواقل (سجل النواقل، الوحدات، المواقع، الفرق، المبيدات، المعدات، بلاغات وبؤر)'

    VECTORS = [
        {'vector_type': 'MOSQUITO', 'species': 'Aedes aegypti', 'name_ar': 'بعوضة الزاعجة المصرية', 'disease_risk': 'حمى الضنك، زيكا، شيكونغونيا'},
        {'vector_type': 'MOSQUITO', 'species': 'Anopheles arabiensis', 'name_ar': 'أنوفيليس عربي', 'disease_risk': 'الملاريا'},
        {'vector_type': 'MOSQUITO', 'species': 'Culex pipiens', 'name_ar': 'كولكس بيبنس', 'disease_risk': 'التهاب الدماغ'},
        {'vector_type': 'RODENT', 'species': 'Rattus rattus', 'name_ar': 'جرذ المنزل الأسود', 'disease_risk': 'اللبتوسبيروزا، الطاعون'},
        {'vector_type': 'FLY', 'species': 'Musca domestica', 'name_ar': 'ذبابة المنزل', 'disease_risk': 'التيفود، الكوليرا'},
        {'vector_type': 'COCKROACH', 'species': 'Periplaneta americana', 'name_ar': 'صرشان أمريكية', 'disease_risk': 'حساسية وتلوث غذائي'},
        {'vector_type': 'TICK', 'species': 'Rhipicephalus sanguineus', 'name_ar': 'قراد الكلاب البني', 'disease_risk': 'حمى القراد'},
    ]

    UNITS = [
        ('VCU-SURV', 'وحدة الترصد الحشري', 'SURVEILLANCE'),
        ('VCU-MOSQ', 'وحدة مكافحة البعوض', 'MOSQUITO'),
        ('VCU-LAB', 'المختبر الحشري', 'LAB'),
        ('VCU-ROD', 'وحدة مكافحة القوارض', 'RODENT'),
    ]

    SITES = [
        # (entry_point_code, site_type, name_ar)
        ('EP_ARGIN', 'BUILDING', 'صالة الوصول الشرقية'),
        ('EP_ARGIN', 'YARD', 'الفناء الخلفي لصالة الوصول'),
        ('EP_WADI_HALFA', 'STORAGE', 'مخازن البضائع القديمة'),
        ('EP_WADI_HALFA', 'DUMP', 'منطقة النفايات المؤقتة'),
        ('EP_GALLABAT', 'WATER_BODY', 'بركة التصريف جنوب المعبر'),
        ('EP_GALLABAT', 'YARD', 'ساحة انتظار الشاحنات'),
        ('EP_MUTHALLATH', 'STORAGE', 'مخزن الأعلاف'),
    ]

    CHEMICALS = [
        {'name_ar': 'تيميفوس 1% حبيبات', 'active_ingredient': 'Temephos', 'concentration': '1%',
         'form': 'GR', 'hazard_class': 'WHO_U', 'target': 'LARVAE', 'unit': 'كجم', 'min_stock': 50, 'is_restricted': False},
        {'name_ar': 'دلتامثرين 2.5% مستحلب', 'active_ingredient': 'Deltamethrin', 'concentration': '2.5%',
         'form': 'EC', 'hazard_class': 'WHO_II', 'target': 'MOSQUITO', 'unit': 'لتر', 'min_stock': 100, 'is_restricted': True},
        {'name_ar': 'مالاثيون UL', 'active_ingredient': 'Malathion', 'concentration': '96%',
         'form': 'UL', 'hazard_class': 'WHO_III', 'target': 'MOSQUITO', 'unit': 'لتر', 'min_stock': 200, 'is_restricted': False},
        {'name_ar': 'ثنائي الفيناسيل 0.005% طعوم', 'active_ingredient': 'Brodifacoum', 'concentration': '0.005%',
         'form': 'BAIT', 'hazard_class': 'WHO_I', 'target': 'RODENT', 'unit': 'كجم', 'min_stock': 30, 'is_restricted': True},
        {'name_ar': 'ساي فلوتيرين + إيميداكلوبريد', 'active_ingredient': 'Cyfluthrin + Imidacloprid',
         'concentration': '2.5%', 'form': 'SC', 'hazard_class': 'WHO_II', 'target': 'COCKROACH', 'unit': 'لتر', 'min_stock': 40, 'is_restricted': False},
    ]

    EQUIPMENT = [
        ('SPRAYER', 'مرشة ظهرية بترولية', 'Solo 425'),
        ('ULV_FOGGER', 'جهاز ضباب محمول', 'MiniMist 20'),
        ('TRAP', 'مصيدة بيض Ovitrap', ''),
        ('RODENT_TRAP', 'مصيدة قوارض معدنية', 'Ketch-All'),
        ('PPE', 'طقم وقاية شخصي كامل', ''),
    ]

    REPORTS = [
        # (entry_point_code, report_type, source, site_idx_desc, vector_idx, severity, description, days_ago)
        ('EP_ARGIN', 'MOSQUITO', 'PUBLIC', 0, 0, 'HIGH', 'شكوى من مواطنين بظهور البعوض بكثافة حول صالة الوصول.', 1),
        ('EP_GALLABAT', 'MOSQUITO', 'INSPECTION', 2, 0, 'CRITICAL', 'رصد يرقات بأعداد كبيرة في بركة التصريف.', 2),
        ('EP_WADI_HALFA', 'RODENT', 'OFFICER', 1, 3, 'MEDIUM', 'أدلة قوارض حول أكياس الأعلاف في المخازن.', 3),
    ]

    # إحداثيات تقريبية للعرض على الخريطة (ميناء سودان، وادي حلفا، القلابات، الكرامة/الثلاث)
    COORDS = {
        'EP_ARGIN': (19.6156, 37.2164),
        'EP_WADI_HALFA': (21.7935, 31.3775),
        'EP_GALLABAT': (12.9000, 36.3000),
        'EP_MUTHALLATH': (19.6330, 37.2120),
    }

    def _entry_points(self):
        codes = [r[0] for r in self.REPORTS] + [s[0] for s in self.SITES]
        eps = list(EntryPoint.objects.filter(code__in=codes))
        if not eps:
            eps = list(EntryPoint.objects.all()[:1])
        return eps

    def handle(self, *args, **options):
        vectors = []
        for v in self.VECTORS:
            obj, _ = VectorRegistry.objects.update_or_create(
                name_ar=v['name_ar'], defaults=v
            )
            vectors.append(obj)

        eps = self._entry_points()
        if not eps:
            self.stderr.write(self.style.ERROR('لا توجد نقاط دخول في قاعدة البيانات'))
            return

        sectors = sorted({ep.sector for ep in eps if ep.sector}, key=lambda s: s.code)
        if not sectors:
            self.stderr.write(self.style.ERROR('لا توجد قطاعات مرتبطة بنقاط الدخول'))
            return

        units = []
        for code, name, kind in self.UNITS:
            for sector in sectors:
                obj, _ = VectorUnit.objects.update_or_create(
                    code=f'{code}-{sector.code}', sector=sector,
                    defaults={'name_ar': f'{name} — {sector.name_ar}', 'kind': kind},
                )
                units.append(obj)

        sites = {}
        for code, site_type, name in self.SITES:
            ep = EntryPoint.objects.filter(code=code).first() or eps[0]
            obj, _ = VectorSite.objects.update_or_create(
                entry_point=ep, name_ar=name,
                defaults={'site_type': site_type},
            )
            sites.setdefault(ep.code, []).append(obj)

        team_names = {0: 'فريق الترصد الشمالي', 1: 'فريق المكافحة الجنوبي', 2: 'فريق المختبر الحشري'}
        teams = []
        for i, (ep) in enumerate(eps):
            name = team_names[i % len(team_names)]
            obj, _ = VectorTeam.objects.update_or_create(
                code=f'VCT-{i + 1}', sector=ep.sector,
                defaults={
                    'name_ar': name,
                    'team_type': 'SURVEY' if i % 3 == 0 else 'CONTROL',
                    'entry_point': ep,
                },
            )
            teams.append(obj)

        chemicals = []
        for c in self.CHEMICALS:
            obj, created = VectorChemical.objects.update_or_create(name_ar=c['name_ar'], defaults=c)
            if created:
                for ep in eps:
                    VectorInventoryItem.objects.get_or_create(
                        chemical=obj, entry_point=ep, batch_number=f'B-{ep.code[:2]}',
                        defaults={
                            'quantity': c['min_stock'] * 3,
                            'unit': c['unit'],
                            'received_date': date.today() - timedelta(days=15),
                            'expiry_date': date.today() + timedelta(days=300),
                        },
                    )
            chemicals.append(obj)

        equipment = []
        for kind, name, model in self.EQUIPMENT:
            obj, _ = VectorEquipment.objects.update_or_create(
                name_ar=name,
                defaults={'kind': kind, 'model': model, 'quantity': 5, 'entry_point': eps[0]},
            )
            equipment.append(obj)

        rep_objs = []
        for (code, rtype, source, _sidx, vidx, severity, desc, days_ago) in self.REPORTS:
            ep = EntryPoint.objects.filter(code=code).first() or eps[0]
            site = sites.get(ep.code, [None])[0]
            obj, _ = VectorReport.objects.update_or_create(
                entry_point=ep,
                problem_description=desc,
                defaults={
                    'report_type': rtype,
                    'source': source,
                    'site': site,
                    'vector': vectors[min(vidx, len(vectors) - 1)],
                    'severity': severity,
                    'reported_at': timezone.now() - timedelta(days=days_ago),
                },
            )
            rep_objs.append(obj)

        focus = None
        for rep in rep_objs:
            if rep.severity in ('HIGH', 'CRITICAL') and rep.report_type == 'MOSQUITO':
                lat, lng = self.COORDS.get(rep.entry_point.code, (None, None))
                focus, _ = VectorFocus.objects.update_or_create(
                    source_report=rep,
                    defaults={
                        'entry_point': rep.entry_point,
                        'site': rep.site,
                        'vector': rep.vector,
                        'severity': rep.severity,
                        'status': 'ACTIVE',
                        'water_source': 'CONTAINERS',
                        'origin': 'REPORT',
                        'description': rep.problem_description,
                        'gps_latitude': lat,
                        'gps_longitude': lng,
                    },
                )
                rep.status = 'FOLLOW_UP'
                rep.save(update_fields=['status'])

        survey_count = 0
        s_ep = EntryPoint.objects.filter(code='EP_GALLABAT').first() or eps[0]
        s_rep = next((r for r in rep_objs if r.entry_point_id == s_ep.id), None)
        vs, created = VectorSurvey.objects.update_or_create(
            entry_point=s_ep,
            vector=vectors[0],
            area='بركة التصريف جنوب المعبر',
            defaults={
                'method': 'LARVAL_DIPPING',
                'survey_date': date.today() - timedelta(days=4),
                'breeding_sites': 14,
                'density': 'CRITICAL',
                'proposed_risk': 'CRITICAL',
                'environmental_conditions': 'مياه راكدة واسعة بعد الأمطار',
                'status': 'APPROVED',
                'suggested_focus': focus,
            },
        )
        survey_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'تم بذر مكافحة النواقل: نواقل={VectorRegistry.objects.count()}, وحدات={VectorUnit.objects.count()}, '
            f'مواقع={VectorSite.objects.count()}, فرق={VectorTeam.objects.count()}, '
            f'مبيدات={VectorChemical.objects.count()}, رصيد={VectorInventoryItem.objects.count()}, '
            f'معدات={VectorEquipment.objects.count()}, بلاغات={VectorReport.objects.count()}, '
            f'بؤر={VectorFocus.objects.count()}, مسوحات={VectorSurvey.objects.count()}'
        ))