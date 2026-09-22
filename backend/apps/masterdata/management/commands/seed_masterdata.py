from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.masterdata.models import EntryPoint, Section, SectionMember, Sector, State, Station, Terminal
from apps.organization.models import Sector as OrgSector


class Command(BaseCommand):
    help = 'بذر البيانات الأساسية (الهيكل النوعي): القطاع ← الولاية ← منفذ الدخول ← المنشأة ← محطة الحجر ← القسم ← المستخدمون'

    def handle(self, *args, **options):
        User = get_user_model()
        created = {'sectors': 0, 'org_sectors': 0, 'states': 0, 'entry_points': 0, 'terminals': 0, 'stations': 0, 'sections': 0, 'members': 0}

        def get_or(name, code, cls, defaults, key=None):
            obj, was = cls.objects.update_or_create(code=code, defaults=defaults)
            return obj, was

        # ============ القطاعات الإدارية (organization.Sector) ============
        org_sectors = {}
        for s in [
            {'code': 'RED_SEA', 'name_ar': 'قطاع البحر الأحمر', 'region': 'البحر الأحمر', 'color': '#e63946', 'order': 1},
            {'code': 'KHARTOUM', 'name_ar': 'قطاع الخرطوم', 'region': 'الخرطوم', 'color': '#2a9d8f', 'order': 2},
            {'code': 'NORTHERN', 'name_ar': 'القطاع الشمالي', 'region': 'الشمالية', 'color': '#264653', 'order': 3},
            {'code': 'KASSALA', 'name_ar': 'قطاع كسلا', 'region': 'كسلا', 'color': '#e9c46a', 'order': 4},
            {'code': 'GEDAREF', 'name_ar': 'قطاع القضارف', 'region': 'القضارف', 'color': '#f4a261', 'order': 5},
            {'code': 'KORDOFAN', 'name_ar': 'قطاع كردفان', 'region': 'كردفان', 'color': '#a8dadc', 'order': 6},
            {'code': 'EL_OBEID', 'name_ar': 'قطاع الأبيض', 'region': 'شمال كردفان', 'color': '#8d99ae', 'order': 7},
        ]:
            obj, was = get_or(s['name_ar'], s['code'], OrgSector, s)
            org_sectors[s['code']] = obj
            created['org_sectors'] += int(was)

        # ============ القطاعات (الأنواع) ============
        sectors = {}
        for s in [
            {'code': 'SEA', 'name_ar': 'القطاع البحري', 'name_en': 'Maritime Sector', 'color': '#0B5CAD', 'order': 1},
            {'code': 'LAND', 'name_ar': 'القطاع البري', 'name_en': 'Land Border Sector', 'color': '#16855B', 'order': 2},
            {'code': 'AIR', 'name_ar': 'القطاع الجوي', 'name_en': 'Aviation Sector', 'color': '#7C3AED', 'order': 3},
        ]:
            obj, was = get_or(s['name_ar'], s['code'], Sector, s)
            sectors[s['code']] = obj
            created['sectors'] += int(was)

        # ============ الولايات ============
        states = {}

        def ensure_state(code, name, sector_code, order=1):
            obj, was = get_or(name, code, State, {
                'code': code, 'name_ar': name, 'name_en': '', 'sector': sectors[sector_code], 'order': order,
            })
            states[code] = obj
            created['states'] += int(was)
            return obj

        states['RED_SEA'] = ensure_state('MD_RED_SEA', 'ولاية البحر الأحمر', 'SEA', 1)
        states['NORTHERN'] = ensure_state('MD_NORTHERN', 'الولاية الشمالية', 'LAND', 2)
        states['KASSALA'] = ensure_state('MD_KASSALA', 'ولاية كسلا', 'LAND', 3)
        states['GEDAREF'] = ensure_state('MD_GEDAREF', 'ولاية القضارف', 'LAND', 4)
        states['BLUE_NILE'] = ensure_state('MD_BLUE_NILE', 'ولاية النيل الأزرق', 'LAND', 5)
        states['W_DARFUR'] = ensure_state('MD_W_DARFUR', 'ولاية غرب دارفور', 'LAND', 6)
        states['KHARTOUM'] = ensure_state('MD_KHARTOUM', 'ولاية الخرطوم', 'AIR', 7)
        # ولاية البحر الأحمر تظهر ضمن القطاع الجوي أيضاً (مطار بورتسودان الدولي)
        states['RED_SEA_AIR'] = ensure_state('MD_RED_SEA_AIR', 'ولاية البحر الأحمر', 'AIR', 8)
        # المعابر البرية الحدودية لقطاع البحر الأحمر (أوسيف، قباتيت)
        states['RED_SEA_LAND'] = ensure_state('MD_RED_SEA_LAND', 'ولاية البحر الأحمر', 'LAND', 9)

        # ============ منافذ الدخول ============
        entry_points = {}

        def ensure_entry(code, name, kind, state_code, location='', order=1, org_sector_code=None, address=None, phone='', email=''):
            obj, was = get_or(name, code, EntryPoint, {
                'code': code, 'name_ar': name, 'name_en': '', 'kind': kind,
                'state': states[state_code], 'location': location, 'order': order,
                'address': address if address is not None else location,
                'phone': phone, 'email': email,
                'sector': org_sectors.get(org_sector_code),
            })
            entry_points[code] = obj
            created['entry_points'] += int(was)
            return obj

        # — البحري: ميناء بورتسودان + منشآته
        ep_port_sudan = ensure_entry('EP_PORT_SUDAN', 'ميناء بورتسودان', 'SEAPORT', 'RED_SEA', 'بورتسودان', 1, 'RED_SEA')
        entry_points['SUAKIN'] = ensure_entry('EP_SUAKIN', 'ميناء الأمير عثمان دقنة – سواكن', 'SEAPORT', 'RED_SEA', 'سواكن', 2, 'RED_SEA')
        entry_points['MARSABASHAIR'] = ensure_entry('EP_MARSABASHAIR', 'ميناء مرسى بشاير', 'SEAPORT', 'RED_SEA', 'مرسى بشاير', 4, 'RED_SEA')
        entry_points['ELKHAIR'] = ensure_entry('EP_ELKHAIR', 'ميناء الخير', 'SEAPORT', 'RED_SEA', 'ميناء الخير', 5, 'RED_SEA')
        entry_points['ZUBEIR'] = ensure_entry('EP_ZUBEIR', 'ميناء الزبير محمد صالح', 'SEAPORT', 'RED_SEA', 'بورتسودان', 6, 'RED_SEA')

        # — البري
        entry_points['ARGIN'] = ensure_entry('EP_ARGIN', 'معبر أرقين', 'LAND_PORT', 'NORTHERN', 'أرقين', 1, 'NORTHERN')
        entry_points['WADI_HALFA'] = ensure_entry('EP_WADI_HALFA', 'معبر وادي حلفا', 'LAND_PORT', 'NORTHERN', 'وادي حلفا', 2, 'NORTHERN')
        entry_points['MUTHALLATH'] = ensure_entry('EP_MUTHALLATH', 'معبر المثلث', 'LAND_PORT', 'NORTHERN', 'المثلث', 3, 'NORTHERN')
        entry_points['ERITREA_BORDER'] = ensure_entry('EP_ERITREA_BORDER', 'المعابر الحدودية مع إريتريا', 'LAND_PORT', 'KASSALA', '', 4, 'KASSALA')
        entry_points['GALLABAT'] = ensure_entry('EP_GALLABAT', 'معبر القلابات', 'LAND_PORT', 'GEDAREF', 'القلابات', 5, 'GEDAREF')
        entry_points['SOUTH_SUDAN_BORDER'] = ensure_entry('EP_SOUTH_SUDAN_BORDER', 'المعابر الحدودية مع جنوب السودان', 'LAND_PORT', 'BLUE_NILE', '', 6, 'EL_OBEID')
        entry_points['ADRE'] = ensure_entry('EP_ADRE', 'معبر أدري', 'LAND_PORT', 'W_DARFUR', 'أدري', 7, 'EL_OBEID')
        entry_points['TINE'] = ensure_entry('EP_TINE', 'معبر تينة', 'LAND_PORT', 'W_DARFUR', 'تينة', 8, 'EL_OBEID')
        # معابر قطاع البحر الأحمر البرية (الحدود مع مصر)
        entry_points['OSEIF'] = ensure_entry('EP_OSEIF', 'معبر أوسيف', 'LAND_PORT', 'RED_SEA_LAND', 'أوسيف', 9, 'RED_SEA')
        entry_points['GABAIT'] = ensure_entry('EP_GABAIT', 'معبر قباتيت', 'LAND_PORT', 'RED_SEA_LAND', 'قباتيت', 10, 'RED_SEA')

        # — الجوي
        entry_points['KRT_AIRPORT'] = ensure_entry('EP_KRT_AIRPORT', 'مطار الخرطوم الدولي', 'AIRPORT', 'KHARTOUM', 'الخرطوم', 1, 'KHARTOUM')
        entry_points['PZU_AIRPORT'] = ensure_entry('EP_PZU_AIRPORT', 'مطار بورتسودان الدولي', 'AIRPORT', 'RED_SEA_AIR', 'بورتسودان', 2, 'RED_SEA')

        # ============ المنشآت / الطرفيات ============
        terminals = {}

        def ensure_terminal(code, name, entry_code, order=1):
            obj, was = get_or(name, code, Terminal, {
                'code': code, 'name_ar': name, 'name_en': '', 'entry_point': entry_points[entry_code], 'order': order,
            })
            terminals[code] = obj
            created['terminals'] += int(was)
            return obj

        # منشآت ميناء بورتسودان
        t_south = ensure_terminal('T_SOUTH', 'الميناء الجنوبي', 'EP_PORT_SUDAN', 1)
        terminals['NORTH'] = ensure_terminal('T_NORTH', 'الميناء الشمالي', 'EP_PORT_SUDAN', 2)
        terminals['GREEN'] = ensure_terminal('T_GREEN', 'الميناء الأخضر', 'EP_PORT_SUDAN', 3)
        # منشآت ميناء سواكن
        terminals['OTHMANDEGNA'] = ensure_terminal('T_OTHMANDEGNA', 'ميناء الأمير عثمان دقنة', 'EP_SUAKIN', 1)

        # ============ محطات الحجر الصحي ============
        stations = {}

        def ensure_station(code, name, terminal_code=None, entry_code=None, location='', order=1):
            obj, was = get_or(name, code, Station, {
                'code': code, 'name_ar': name, 'name_en': '',
                'terminal': terminals.get(terminal_code),
                'entry_point': entry_points.get(entry_code),
                'location': location, 'order': order,
            })
            stations[code] = obj
            created['stations'] += int(was)
            return obj

        # النافذة الواحدة ونقطة الإشعاع = وحدات تشغيلية ضمن الميناء الجنوبي (ليست منافذ مستقلة)
        s_south_window = ensure_station('S_SOUTH_WINDOW', 'وحدة النافذة الواحدة', 'T_SOUTH', None, 'الميناء الجنوبي', 1)
        s_south_radiation = ensure_station('S_SOUTH_RADIATION', 'نقطة الإشعاع', 'T_SOUTH', None, 'الميناء الجنوبي', 2)
        ensure_station('S_NORTH', 'محطة الميناء الشمالي', 'T_NORTH', None, 'الميناء الشمالي', 3)
        ensure_station('S_GREEN', 'محطة الميناء الأخضر', 'T_GREEN', None, 'الميناء الأخضر', 4)
        ensure_station('S_OTHMANDEGNA', 'محطة ميناء الأمير عثمان دقنة', 'T_OTHMANDEGNA', None, 'سواكن', 5)
        # محطات مباشرة تحت منافذ (مطارات)
        ensure_station('S_KRT_AIRPORT', 'محطة الحجر الصحي بمطار الخرطوم الدولي', None, 'EP_KRT_AIRPORT', 'الخرطوم', 6)
        ensure_station('S_PZU_AIRPORT', 'محطة الحجر الصحي بالمطار', None, 'EP_PZU_AIRPORT', 'مطار بورتسودان الدولي', 7)

        # ============ الأقسام ============
        sections = {}

        def ensure_section(code, name, station_obj, order=1):
            obj, was = get_or(name, code, Section, {
                'code': code, 'name_ar': name, 'name_en': '', 'station': station_obj, 'order': order,
            })
            sections[code] = obj
            created['sections'] += int(was)
            return obj

        # أقسام النافذة الواحدة ونقطة الإشعاع (الميناء الجنوبي)
        ensure_section('SCT_WINDOW_OPERATIONS', 'قسم تشغيل النافذة الواحدة', s_south_window, 1)
        ensure_section('SCT_WINDOW_DATA', 'قسم تسجيل البيانات', s_south_window, 2)
        ensure_section('SCT_RADIATION_SCREENING', 'قسم الفحص الإشعاعي', s_south_radiation, 1)
        # أقسام محطات المطارات
        sct_pzu = ensure_section('SCT_PZU_PASSENGER', 'قسم صحة المسافرين', stations['S_PZU_AIRPORT'], 1)
        sct_pzu_food = ensure_section('SCT_PZU_FOOD', 'قسم رقابة الأغذية', stations['S_PZU_AIRPORT'], 2)
        ensure_section('SCT_PZU_LAB', 'قسم المختبر', stations['S_PZU_AIRPORT'], 3)
        ensure_section('SCT_KRT_PASSENGER', 'قسم صحة المسافرين', stations['S_KRT_AIRPORT'], 1)
        ensure_section('SCT_KRT_FOOD', 'قسم رقابة الأغذية', stations['S_KRT_AIRPORT'], 2)

        # ============ المستخدمون (أعضاء الأقسام) ============
        def ensure_member(email, section_obj, role_label):
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return
            obj, was = SectionMember.objects.update_or_create(
                user=user, section=section_obj,
                defaults={'role_label': role_label, 'is_active': True},
            )
            created['members'] += int(was)

        ensure_member('airport.director@nqp.gov.sd', sct_pzu, 'مديرة الحجر الصحي بالمطار')
        ensure_member('mohamed.dora@nqp.gov.sd', sct_pzu_food, 'مدير ادارة رقابة الأغذية')
        ensure_member('admin@nqp.gov.sd', sct_pzu, 'مدير النظام — مؤسس')

        self.stdout.write(
            self.style.SUCCESS(
                f'تم بذر البيانات الأساسية: {created["sectors"]} قطاعاً نوعياً، {created["org_sectors"]} قطاعاً إدارياً، {created["states"]} ولاية، '
                f'{created["entry_points"]} منفذ دخول، {created["terminals"]} منشأة، '
                f'{created["stations"]} محطة، {created["sections"]} قسماً، {created["members"]} عضواً '
                f'(جديدة: قطاعات={created["sectors"]} ولايات={created["states"]} منافذ={created["entry_points"]} '
                f'منشآت={created["terminals"]} محطات={created["stations"]} أقسام={created["sections"]} أعضاء={created["members"]})'
            )
        )