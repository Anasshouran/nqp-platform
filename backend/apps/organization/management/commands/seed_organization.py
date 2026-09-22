from django.core.management.base import BaseCommand

from apps.organization.models import Department, OrgPosition, Sector, Station


class Command(BaseCommand):
    help = 'بذر الهيكل الإداري الحقيقي (المناصب الوطنية، القطاعات، قالب الإدارات القياسي، المحطات، نقاط الدخول)'

    POSITIONS = [
        {'code': 'MINISTRY', 'name_ar': 'وزارة الصحة', 'level': 1, 'order': 1},
        {'code': 'VICE_MINISTER', 'name_ar': 'وكيل وزارة', 'level': 2, 'order': 1},
        {'code': 'DG_EMERGENCY', 'name_ar': 'المدير العام للطوارئ والاوبئة', 'level': 3, 'order': 1},
        {'code': 'DG_QUARANTINE', 'name_ar': 'المدير الحجر الصحي القومي', 'level': 4, 'order': 1},
        {'code': 'SECTOR_DIRECTOR', 'name_ar': 'مدير القطاع', 'level': 5, 'order': 1},
        {'code': 'DEPT_DIRECTOR', 'name_ar': 'مدير الإدارة', 'level': 6, 'order': 1},
        {'code': 'STATION_HEAD', 'name_ar': 'رئيس المحطة', 'level': 7, 'order': 1},
        {'code': 'SECTION_HEAD', 'name_ar': 'رئيس قسم', 'level': 8, 'order': 1},
    ]

    SECTORS = [
        {
            'code': 'RED_SEA',
            'name_ar': 'قطاع البحر الأحمر',
            'region': 'البحر الأحمر',
            'color': '#e63946',
            'order': 1,
            'description': (
                'قطاع البحر الأحمر هو قطاع إداري تابع للإدارة العامة للحجر الصحي القومي بوزارة الصحة الاتحادية، '
                'ويتخذ من مدينة بورتسودان مركزاً إدارياً له، ويُعد عاملاً محورياً في تطبيق اللوائح الصحية الدولية '
                '(IHR 2005) عبر منافذ الدخول الجوية والبحرية والبرية على ساحل البحر الأحمر. '
                'يضم القطاع مطار بورتسودان الدولي، وميناء بورتسودان (بمنشآته الميناء الشمالي والميناء الجنوبي)، '
                'وميناء الأمير عثمان دقنة – سواكن، إضافة إلى موانئ ومرافئ متخصصة كمرسى بشاير وميناء الخير '
                'وميناء الزبير محمد صالح، والمعابر البرية الحدودية أوسيف وقباتيت. '
                'يضطلع القطاع برصد الأمراض الوبائية ومكافحة الأوبئة والنواقل، وضمان سلامة الأغذية القادمة عبر الموانئ، '
                'والفحص الصحي للمسافرين والوافدين والعاملين، بما يصون الصحة العامة وفق أعلى المعايير الوطنية والدولية.'
            ),
            'address': 'قطاع البحر الأحمر – الحجر الصحي القومي، بورتسودان – ولاية البحر الأحمر – السودان',
            'latitude': '19.6166000',
            'longitude': '37.2164000',
        },
        {'code': 'KHARTOUM', 'name_ar': 'قطاع الخرطوم', 'region': 'الخرطوم', 'color': '#2a9d8f', 'order': 2},
        {'code': 'NORTHERN', 'name_ar': 'القطاع الشمالي', 'region': 'الشمالية', 'color': '#264653', 'order': 3},
        {'code': 'KASSALA', 'name_ar': 'قطاع كسلا', 'region': 'كسلا', 'color': '#e9c46a', 'order': 4},
        {'code': 'GEDAREF', 'name_ar': 'قطاع القضارف', 'region': 'القضارف', 'color': '#f4a261', 'order': 5},
        {'code': 'KORDOFAN', 'name_ar': 'قطاع كردفان', 'region': 'كردفان', 'color': '#a8dadc', 'order': 6},
        {
            'code': 'EL_OBEID',
            'name_ar': 'قطاع الأبيض',
            'region': 'شمال كردفان',
            'color': '#8d99ae',
            'order': 7,
            'description': (
                'قطاع الأبيض هو القطاع الإداري التابع للإدارة العامة للحجر الصحي القومي بوزارة الصحة الاتحادية، '
                'ويتخذ من مدينة الأبيض – عاصمة ولاية شمال كردفان – مركزاً إدارياً له، ويُعد المعمل المركزي للقطاع '
                'نقطة إسناد للمعابر البرية الغربية (أدري وتينة والمعابر مع جنوب السودان) داخل إطار '
                'اللوائح الصحية الدولية (IHR 2005).'
            ),
            'address': 'قطاع الأبيض – الحجر الصحي القومي، الأبيض – ولاية شمال كردفان – السودان',
            'latitude': '13.1844000',
            'longitude': '30.2166667',
        },
    ]

    # قالب الإدارات القياسي: يُكرَّر في كل قطاع (البيانات تختلف، لا المنطق)
    DEPARTMENT_TEMPLATE = [
        {'code': 'FOOD', 'name_ar': 'إدارة رقابة الأغذية', 'order': 1},
        {'code': 'PORT_HEALTH', 'name_ar': 'إدارة صحة الموانئ', 'order': 2},
        {'code': 'AIRPORT_HEALTH', 'name_ar': 'إدارة صحة المطارات', 'order': 3},
        {'code': 'LAND_PORTS', 'name_ar': 'إدارة المعابر البرية', 'order': 4},
        {'code': 'SURVEILLANCE', 'name_ar': 'إدارة الترصد الوبائي', 'order': 5},
        {'code': 'LABORATORIES', 'name_ar': 'إدارة المختبرات', 'order': 6},
        {'code': 'ENV_HEALTH', 'name_ar': 'إدارة صحة البيئة', 'order': 7},
        {'code': 'FINANCE_ADMIN', 'name_ar': 'الإدارة المالية والإدارية', 'order': 8},
    ]

    # محطات كل إدارة داخل قالب الإدارات (نموذج لقطاع البحر الأحمر)
    DEPARTMENT_STATIONS = {
        'FOOD': [
            {'code': 'NORTH_PORT', 'name_ar': 'محطة الميناء الشمالي', 'location': 'ميناء بورتسودان'},
            {'code': 'SOUTH_PORT', 'name_ar': 'محطة الميناء الجنوبي', 'location': 'ميناء بورتسودان'},
            {'code': 'OTHMANDEGNA', 'name_ar': 'محطة ميناء الأمير عثمان دقنة', 'location': 'ميناء بورتسودان'},
            {'code': 'OSEIF', 'name_ar': 'محطة أوسيف البرية', 'location': 'أوسيف'},
            {'code': 'AIRPORT', 'name_ar': 'محطة مطار بورتسودان', 'location': 'مطار بورتسودان الدولي'},
        ],
        'PORT_HEALTH': [
            {'code': 'PORT_SUDAN', 'name_ar': 'محطة ميناء بورتسودان', 'location': 'ميناء بورتسودان'},
            {'code': 'SUAKIN', 'name_ar': 'محطة ميناء سواكن', 'location': 'سواكن'},
        ],
        'AIRPORT_HEALTH': [
            {'code': 'PORT_SUDAN_INTL', 'name_ar': 'محطة مطار بورتسودان الدولي', 'location': 'مطار بورتسودان الدولي'},
        ],
        'LAND_PORTS': [
            {'code': 'ARGIN', 'name_ar': 'محطة أرقين الحدودية', 'location': 'أرقين'},
            {'code': 'OSEIF_LAND', 'name_ar': 'محطة أوسيف البرية', 'location': 'أوسيف'},
        ],
        'LABORATORIES': [
            {'code': 'CENTRAL_LAB', 'name_ar': 'المختبر المركزي للرقابة الغذائية', 'location': 'بورتسودان'},
        ],
    }

    UNIT_STAFF_POSITIONS = [
        ('STATION_HEAD', 'رئيس المحطة'),
        ('CLERK', 'كاتب'),
        ('ACCOUNTANT', 'محاسب'),
        ('FIELD_INSPECTOR', 'مفتش ميداني'),
        ('LAB_OFFICER', 'مسؤول المختبر'),
        ('LAB_TECHNICIAN', 'فني المختبر'),
    ]

    def handle(self, *args, **options):
        created = {'positions': 0, 'sectors': 0, 'departments': 0, 'stations': 0, 'staff': 0}

        positions = {}
        for i, pos in enumerate(self.POSITIONS):
            parent_code = self.POSITIONS[i - 1]['code'] if i > 0 else None
            obj, was_created = OrgPosition.objects.update_or_create(
                code=pos['code'],
                defaults={
                    'name_ar': pos['name_ar'],
                    'name_en': '',
                    'level': pos['level'],
                    'parent': positions.get(parent_code),
                    'order': pos['order'],
                    'is_active': True,
                },
            )
            positions[pos['code']] = obj
            if was_created:
                created['positions'] += 1

        sectors = {}
        for sec in self.SECTORS:
            obj, was_created = Sector.objects.update_or_create(
                code=sec['code'],
                defaults={
                    'name_ar': sec['name_ar'],
                    'name_en': sec.get('name_en', ''),
                    'region': sec['region'],
                    'color': sec['color'],
                    'order': sec['order'],
                    'description': sec.get('description', ''),
                    'address': sec.get('address', ''),
                    'latitude': sec.get('latitude'),
                    'longitude': sec.get('longitude'),
                    'is_active': True,
                },
            )
            sectors[sec['code']] = obj
            if was_created:
                created['sectors'] += 1

        # القالب القياسي للإدارات يُطبَّق على قطاع البحر الأحمر الآن (يُكرَّر لاحقاً لباقي القطاعات)
        template_sector = sectors['RED_SEA']
        departments = {}
        for dep in self.DEPARTMENT_TEMPLATE:
            code = f'RED_SEA_{dep["code"]}'
            obj, was_created = Department.objects.update_or_create(
                code=code,
                defaults={
                    'name_ar': dep['name_ar'],
                    'name_en': '',
                    'sector': template_sector,
                    'parent': None,
                    'kind': 'DEPARTMENT',
                    'order': dep['order'],
                    'is_active': True,
                },
            )
            departments[code] = obj
            if was_created:
                created['departments'] += 1

        # تعطيل الإدارات القديمة غير القياسية (تُستبدل بالقالب)
        legacy_codes = [
            'RED_SEA_QUARANTINE', 'RED_SEA_IT', 'RED_SEA_PLANNING', 'RED_SEA_ACCOUNTS',
            'RED_SEA_VECTOR', 'RED_SEA_HR', 'RED_SEA_WAREHOUSE', 'RED_SEA_FOOD_LAB',
        ]
        Department.objects.filter(code__in=legacy_codes).update(is_active=False)

        # إعادة تعيين الوحدات الغذائية القديمة إلى محطات في إدارة رقابة الأغذية
        Department.objects.filter(code__startswith='RED_SEA_FOOD_').exclude(
            code__in=list(departments.keys()) + legacy_codes
        ).update(is_active=False)

        # المحطات داخل كل إدارة
        for dep_code_suffix, station_list in self.DEPARTMENT_STATIONS.items():
            parent_dept = departments[f'RED_SEA_{dep_code_suffix}']
            for station in station_list:
                code = f"RED_SEA_{dep_code_suffix}_{station['code']}"
                obj, was_created = Station.objects.update_or_create(
                    code=code,
                    defaults={
                        'name_ar': station['name_ar'],
                        'name_en': '',
                        'department': parent_dept,
                        'sector': template_sector,
                        'location': station['location'],
                        'order': station['order'] if 'order' in station else 0,
                        'is_active': True,
                    },
                )
                if was_created:
                    created['stations'] += 1

        # وظائف المحطة (رئيس محطة، كاتب، محاسب، مفتش، مسؤول/فني مختبر)
        for staff_code, staff_name in self.UNIT_STAFF_POSITIONS:
            OrgPosition.objects.update_or_create(
                code=f'STATION_STAFF_{staff_code}',
                defaults={
                    'name_ar': staff_name,
                    'name_en': '',
                    'level': 9,
                    'parent': positions['STATION_HEAD'],
                    'department': None,
                    'order': 1,
                    'is_active': True,
                },
            )
            created['staff'] += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'تم بذر الهيكل الإداري: {len(self.POSITIONS)} منصباً وطنياً، '
                f'{len(self.SECTORS)} قطاعاً، {len(self.DEPARTMENT_TEMPLATE)} إدارة قياسية '
                f'في قطاع البحر الأحمر، {sum(len(v) for v in self.DEPARTMENT_STATIONS.values())} محطة، '
                f'و{len(self.UNIT_STAFF_POSITIONS)} وظيفة محطة '
                f'({created["positions"]} منصباً، {created["sectors"]} قطاعاً، '
                f'{created["departments"]} إدارة، {created["stations"]} محطة جديدة)'
            )
        )