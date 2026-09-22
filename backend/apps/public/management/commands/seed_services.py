from django.core.management.base import BaseCommand

from apps.public.models import Service, ServiceCategory


# الفئات التسع المعتمدة لبوابة الخدمات (/services)
CATEGORIES = [
    {'code': 'travelers', 'name_ar': 'خدمات المسافرين', 'name_en': 'Traveler Services', 'icon': 'luggage', 'sort_order': 1},
    {'code': 'food-safety', 'name_ar': 'خدمات سلامة الأغذية', 'name_en': 'Food Safety', 'icon': 'food', 'sort_order': 2},
    {'code': 'carriers', 'name_ar': 'خدمات شركات الطيران ووسائل النقل', 'name_en': 'Carrier Services', 'icon': 'flight', 'sort_order': 3},
    {'code': 'poe-health', 'name_ar': 'خدمات صحة نقاط الدخول', 'name_en': 'Point of Entry Health', 'icon': 'health', 'sort_order': 4},
    {'code': 'vector-control', 'name_ar': 'خدمات مكافحة النواقل', 'name_en': 'Vector Control', 'icon': 'insect', 'sort_order': 5},
    {'code': 'surveillance', 'name_ar': 'خدمات الترصد الصحي', 'name_en': 'Health Surveillance', 'icon': 'monitor', 'sort_order': 6},
    {'code': 'laboratory', 'name_ar': 'خدمات المختبرات', 'name_en': 'Laboratory Services', 'icon': 'lab', 'sort_order': 7},
    {'code': 'government', 'name_ar': 'خدمات الجهات الحكومية', 'name_en': 'Government Services', 'icon': 'account', 'sort_order': 8},
    {'code': 'public', 'name_ar': 'الخدمات العامة والتحقق', 'name_en': 'Public & Verification', 'icon': 'verified', 'sort_order': 9},
    {'code': 'assistant', 'name_ar': 'المساعد الذكي', 'name_en': 'NQP Smart Assistant', 'icon': 'smart_toy', 'sort_order': 10},
]

# الكود، الفئة، الاسم، الوصف، الأيقونة، المسار، الجمهور، يتطلب مصادقة، الهوية، النظام، الحالة، الترتيب
SERVICES = [
    # ── المسافرون ──
    ('traveler-registration', 'travelers', 'التسجيل الصحي المسبق',
     'سجّل بياناتك الصحية وبيانات رحلتك قبل الوصول إلى نقطة الدخول للحصول على شهادة QR.',
     'luggage', '/services/travelers/registration', 'INDIVIDUAL', True, 'CREDENTIALS', 'TRAVELER_PORTAL', 'ACTIVE', 1),
    ('traveler-declaration', 'travelers', 'الإقرار الصحي',
     'قدّم إقرارك الصحي الإلكتروني قبل السفر للإسراع بإجراءات الفحص عند الوصول.',
     'assignment', '/services/travelers/declaration', 'INDIVIDUAL', True, 'CREDENTIALS', 'TRAVELER_PORTAL', 'ACTIVE', 2),
    ('traveler-trip-data', 'travelers', 'بيانات الرحلة',
     'أدخل بيانات رحلتك (نقطة الدخول، وسيلة النقل، تاريخ الوصول) لدعم الترصد الصحي.',
     'flight_takeoff', '/services/travelers/trip', 'INDIVIDUAL', True, 'CREDENTIALS', 'TRAVELER_PORTAL', 'ACTIVE', 3),
    ('traveler-documents', 'travelers', 'رفع الوثائق',
     'ارفع الوثائق المطلوبة (جواز السفر، شهادة التطعيم، نتائج الفحوصات) لاستكمال طلبك.',
     'upload_file', '/services/travelers/documents', 'INDIVIDUAL', True, 'CREDENTIALS', 'TRAVELER_PORTAL', 'ACTIVE', 4),
    ('traveler-vaccines', 'travelers', 'التحقق من التطعيمات',
     'تحقق من صحة شهادات التطعيم المطلوبة (مثل الحمى الصفراء) قبل السفر.',
     'medical', '/services/travelers/vaccinations', 'INDIVIDUAL', True, 'CREDENTIALS', 'TRAVELER_PORTAL', 'ACTIVE', 5),
    ('traveler-qr', 'travelers', 'QR Health Pass',
     'نزّل شهادة QR الصحي الرسمية الخاصة بك لاستخدامها عند نقاط الدخول.',
     'qr_code', '/services/travelers/qr', 'INDIVIDUAL', True, 'CREDENTIALS', 'TRAVELER_PORTAL', 'ACTIVE', 6),
    ('traveler-tracking', 'travelers', 'متابعة الطلب',
     'تتبّع حالة طلبك خطوة بخطوة حتى إصدار القرار النهائي.',
     'search', '/services/travelers/tracking', 'INDIVIDUAL', True, 'CREDENTIALS', 'TRAVELER_PORTAL', 'ACTIVE', 7),
    ('traveler-amend', 'travelers', 'تعديل الطلب',
     'عدّل بيانات طلبك المسجّل سابقاً قبل اكتمال المعالجة.',
     'edit', '/services/travelers/amend', 'INDIVIDUAL', True, 'CREDENTIALS', 'TRAVELER_PORTAL', 'ACTIVE', 8),

    # ── سلامة الأغذية ──
    ('food-import', 'food-safety', 'الوارد (فحص شحنة وارد)',
     'قدّم طلب فحص شحنة أغذية وارد لفحصها وتقييمها صحياً قبل الإفراج.',
     'inventory', '/services/food-safety/import', 'BUSINESS', True, 'CREDENTIALS', 'FOOD_SAFETY_PORTAL', 'ACTIVE', 1),
    ('food-export', 'food-safety', 'الصادر (شهادة تصدير)',
     'اطلب فحص شحنة أغذية صادر لإصدار الشهادات الصحية اللازمة للتصدير.',
     'send', '/services/food-safety/export', 'BUSINESS', True, 'CREDENTIALS', 'FOOD_SAFETY_PORTAL', 'ACTIVE', 2),
    ('food-inspection', 'food-safety', 'التفتيش',
     'إدارة عمليات التفتيش الصحي للشحنات الغذائية في نقاط الدخول.',
     'fact_check', '/services/food-safety/inspection', 'BUSINESS', True, 'CREDENTIALS', 'FOOD_SAFETY_PORTAL', 'ACTIVE', 3),
    ('food-sampling', 'food-safety', 'أخذ العينات',
     'جدولة واعتماد أخذ العينات للأغذية وفق سياسات أخذ العينات المعتمدة.',
     'science', '/services/food-safety/sampling', 'BUSINESS', True, 'CREDENTIALS', 'FOOD_SAFETY_PORTAL', 'ACTIVE', 4),
    ('food-laboratory', 'food-safety', 'المختبر',
     'متابعة تحليل عينات الأغذية في المختبرات ونتائج التحاليل.',
     'biotech', '/services/food-safety/laboratory', 'BUSINESS', True, 'CREDENTIALS', 'FOOD_SAFETY_PORTAL', 'ACTIVE', 5),
    ('food-certificates', 'food-safety', 'الشهادات',
     'إصدار وتحميل الشهادات الصحية والشهادات الغذائية الصادرة.',
     'badge', '/services/food-safety/certificates', 'BUSINESS', True, 'CREDENTIALS', 'FOOD_SAFETY_PORTAL', 'ACTIVE', 6),
    ('food-fees', 'food-safety', 'الرسوم',
     'الاطلاع على الرسوم التعريفية وسداد رسوم الفحص الصحي إلكترونياً.',
     'account_balance', '/services/food-safety/fees', 'BUSINESS', True, 'CREDENTIALS', 'FOOD_SAFETY_PORTAL', 'ACTIVE', 7),
    ('food-tracking', 'food-safety', 'متابعة الشحنة',
     'تتبّع حالة الشحنة الغذائية من الطلب حتى قرار الإفراج.',
     'search', '/services/food-safety/track-shipment', 'BUSINESS', True, 'CREDENTIALS', 'FOOD_SAFETY_PORTAL', 'ACTIVE', 8),
    ('food-release', 'food-safety', 'قرار الإفراج',
     'الاطلاع على قرار الإفراج النهائي للشحنات الغذائية المعتمدة.',
     'task_alt', '/services/food-safety/release-decision', 'BUSINESS', True, 'CREDENTIALS', 'FOOD_SAFETY_PORTAL', 'ACTIVE', 9),

    # ── شركات الطيران ووسائل النقل ──
    ('carrier-portal', 'carriers', 'بوابة شركات النقل',
     'بوابة متخصصة لشركات الطيران ووسائل النقل لإدارة بياناتها التشغيلية.',
     'flight', '/services/carriers', 'BUSINESS', True, 'CREDENTIALS', 'CARRIER_PORTAL', 'ACTIVE', 1),
    ('carrier-flights', 'carriers', 'الرحلات',
     'إدارة جداول الرحلات الواردة والصادرة المتعلقة بنقاط الدخول.',
     'flight_takeoff', '/services/carriers/flights', 'BUSINESS', True, 'CREDENTIALS', 'CARRIER_PORTAL', 'ACTIVE', 2),
    ('carrier-manifest', 'carriers', 'Passenger Manifest',
     'رفع وإدارة قوائم الركاب (Passenger Manifest) إلكترونياً.',
     'groups', '/services/carriers/manifest', 'BUSINESS', True, 'CREDENTIALS', 'CARRIER_PORTAL', 'ACTIVE', 3),
    ('carrier-crew', 'carriers', 'Crew Manifest',
     'رفع وإدارة قوائم طاقم الطائرة (Crew Manifest).',
     'groups', '/services/carriers/crew', 'BUSINESS', True, 'CREDENTIALS', 'CARRIER_PORTAL', 'ACTIVE', 4),
    ('carrier-integration', 'carriers', 'حالة التكامل',
     'الاطلاع على حالة التكامل الآمن بين أنظمة شركة النقل ومنصة الحجر الصحي.',
     'sync', '/services/carriers/integration', 'BUSINESS', True, 'CREDENTIALS', 'CARRIER_PORTAL', 'ACTIVE', 5),
    ('carrier-api', 'carriers', 'API Integration',
     'توثيق ومفاتيح الربط الآمن عبر واجهات البرمجة (API) لتبادل البيانات.',
     'code', '/services/carriers/api', 'BUSINESS', True, 'CREDENTIALS', 'CARRIER_PORTAL', 'ACTIVE', 6),

    # ── صحة نقاط الدخول ──
    ('poe-airport', 'poe-health', 'صحة المطارات',
     'الخدمات الصحية الخاصة بنقاط الدخول الجوية (المطارات).',
     'flight', '/services/point-of-entry-health/airport', 'GOVERNMENT', True, 'CREDENTIALS', 'AIRPORT_HEALTH', 'ACTIVE', 1),
    ('poe-port', 'poe-health', 'صحة الموانئ',
     'الخدمات الصحية الخاصة بنقاط الدخول البحرية (الموانئ).',
     'directions_boat', '/services/point-of-entry-health/port', 'GOVERNMENT', True, 'CREDENTIALS', 'PORT_HEALTH', 'ACTIVE', 2),
    ('poe-land', 'poe-health', 'صحة المعابر البرية',
     'الخدمات الصحية الخاصة بنقاط الدخول البرية (المعابر الحدودية).',
     'local_shipping', '/services/point-of-entry-health/land', 'GOVERNMENT', True, 'CREDENTIALS', 'LAND_BORDER_HEALTH', 'ACTIVE', 3),

    # ── مكافحة النواقل ──
    ('vector-info', 'vector-control', 'معلومات مكافحة النواقل',
     'معلومات وإرشادات عامة حول مكافحة النواقل والأمراض المنقولة بها.',
     'info', '/services/vector-control', 'PUBLIC', False, 'NONE', '', 'ACTIVE', 1),
    ('vector-guidelines', 'vector-control', 'الإرشادات',
     'إرشادات فنية حول المكافحة المتكاملة للنواقل في نقاط الدخول.',
     'menu_book', '/services/vector-control/guidelines', 'PUBLIC', False, 'NONE', '', 'ACTIVE', 2),
    ('vector-alerts', 'vector-control', 'التنبيهات',
     'تنبيهات تفشّي النواقل وذرواتها الموسمية ومتطلبات الاستجابة.',
     'warning', '/services/vector-control/alerts', 'PUBLIC', False, 'NONE', '', 'ACTIVE', 3),
    ('vector-general', 'vector-control', 'المعلومات العامة',
     'رصد وتقييم المخاطر وخطط المكافحة — تنفيذها يتم داخل نظام مكافحة النواقل.',
     'public', '/services/vector-control/info', 'PUBLIC', False, 'NONE', '', 'ACTIVE', 4),

    # ── الترصد الصحي ──
    ('surveillance-alerts', 'surveillance', 'التنبيهات الصحية',
     'إنذارات صحية عامة حول الأحداث والأمراض محل الترصد.',
     'notifications', '/services/surveillance/alerts', 'PUBLIC', False, 'NONE', '', 'ACTIVE', 1),
    ('surveillance-events', 'surveillance', 'الأحداث الصحية',
     'معلومات عامة عن الأحداث الصحية دون نشر البيانات الشخصية أو الحساسة.',
     'event', '/services/surveillance/events', 'PUBLIC', False, 'NONE', '', 'ACTIVE', 2),
    ('surveillance-diseases', 'surveillance', 'الأمراض محل الترصد',
     'قائمة الأمراض الخاضعة للترصد الوبائي وفق اللوائح الصحية الدولية.',
     'coronavirus', '/services/surveillance/diseases', 'PUBLIC', False, 'NONE', '', 'ACTIVE', 3),
    ('surveillance-reports', 'surveillance', 'التقارير العامة',
     'تقارير ومؤشرات صحية عامة على مستوى القطاعات.',
     'assessment', '/services/surveillance/reports', 'PUBLIC', False, 'NONE', '', 'ACTIVE', 4),

    # ── المختبرات ──
    ('lab-sample-lookup', 'laboratory', 'الاستعلام عن العينة',
     'الاستعلام عن حالة عيّنة في المختبر برقم العينة أو رقم الشحنة.',
     'search', '/services/laboratory/sample-lookup', 'PUBLIC', False, 'NONE', '', 'ACTIVE', 1),
    ('lab-analysis-status', 'laboratory', 'حالة التحليل',
     'تتبّع حالة تحليل العينة وحالة النتائج المخبرية.',
     'pending_actions', '/services/laboratory/analysis-status', 'BUSINESS', False, 'NONE', '', 'ACTIVE', 2),
    ('lab-results', 'laboratory', 'نتائج التحليل',
     'الاطلاع على نتائج التحاليل المخبرية المعتمدة.',
     'result', '/services/laboratory/results', 'BUSINESS', False, 'NONE', '', 'ACTIVE', 3),
    ('lab-reports', 'laboratory', 'تقارير المختبر المسموح بها',
     'التقارير المخبرية المتاحة للنشر العام.',
     'report', '/services/laboratory/reports', 'PUBLIC', False, 'NONE', '', 'ACTIVE', 4),

    # ── الجهات الحكومية ──
    ('gov-verify', 'government', 'التحقق من الشهادات',
     'خدمات الجهات الحكومية المعتمدة للتحقق من الشهادات الصادرة.',
     'verified', '/services/government/verify', 'GOVERNMENT', True, 'CREDENTIALS', 'GOVERNMENT_PORTAL', 'ACTIVE', 1),
    ('gov-release', 'government', 'الاستعلام عن قرارات الإفراج',
     'استعلام الجهات الحكومية عن قرارات الإفراج الصادرة.',
     'task_alt', '/services/government/release-decisions', 'GOVERNMENT', True, 'CREDENTIALS', 'GOVERNMENT_PORTAL', 'ACTIVE', 2),
    ('gov-shipments', 'government', 'الاستعلام عن الشحنات',
     'استعلام الجهات الحكومية عن بيانات الشحنات الغذائية.',
     'inventory', '/services/government/shipments', 'GOVERNMENT', True, 'CREDENTIALS', 'GOVERNMENT_PORTAL', 'ACTIVE', 3),
    ('gov-data-exchange', 'government', 'تبادل البيانات',
     'تبادل البيانات بين الجهات الحكومية عبر حوكمة أمنة.',
     'swap', '/services/government/data-exchange', 'GOVERNMENT', True, 'CREDENTIALS', 'GOVERNMENT_PORTAL', 'ACTIVE', 4),
    ('gov-api', 'government', 'API Integration',
     'تقنيات الربط الآمن بين أنظمة الجهات الحكومية ومنصة الحجر الصحي.',
     'code', '/services/government/api', 'GOVERNMENT', True, 'CREDENTIALS', 'GOVERNMENT_PORTAL', 'ACTIVE', 5),
    ('gov-reports', 'government', 'التقارير',
     'تقارير رسمية مخصصة للجهات الحكومية المعتمدة.',
     'bar_chart', '/services/government/reports', 'GOVERNMENT', True, 'CREDENTIALS', 'GOVERNMENT_PORTAL', 'ACTIVE', 6),

    # ── بوابات القطاعات ──
    ('red-sea-portal', 'public', 'بوابة قطاع البحر الأحمر',
     'بوابة قطاع البحر الأحمر — الخدمات الصحية والإرشادات الخاصة بالقطاع.',
     'directions_boat', '/sector/red-sea', 'PUBLIC', False, 'NONE', '', 'ACTIVE', 7),

    # ── الخدمات العامة والتحقق ──
    ('public-travel-requirements', 'public', 'متطلبات السفر',
     'الاطلاع على متطلبات الدخول الصحية لكل دولة.',
     'luggage', '/travel-requirements', 'PUBLIC', False, 'NONE', '', 'ACTIVE', 1),
    ('public-lookup', 'public', 'متابعة الطلب',
     'الاستعلام عن حالة طلب المسافر برقم جواز السفر.',
     'search', '/services/verify/lookup', 'PUBLIC', False, 'NONE', 'PUBLIC_TOOLS', 'ACTIVE', 2),
    ('public-verify-qr', 'public', 'التحقق من QR',
     'التحقق من صحة وصلاحية رمز QR الصحي.',
     'qr_code', '/services/verify/qr', 'PUBLIC', False, 'NONE', 'PUBLIC_TOOLS', 'ACTIVE', 3),
    ('public-verify-certificate', 'public', 'التحقق من الشهادة',
     'التحقق من صحة الشهادة الصحية برقمها.',
     'verified', '/services/verify/certificate', 'PUBLIC', False, 'NONE', 'PUBLIC_TOOLS', 'ACTIVE', 4),
    ('public-notifications', 'public', 'الإشعارات الصحية',
     'تفعيل إشعارات المتصفح والاطلاع على أحدث الإشعارات الصحية.',
     'notifications', '/services/verify/notices', 'PUBLIC', False, 'NONE', 'PUBLIC_TOOLS', 'ACTIVE', 5),
    ('public-assistant', 'public', 'المساعد الذكي',
     'روبوت دردشة يجيب عن استفساراتك حول خدمات المنصة.',
     'smart_toy', '/services/verify/assistant', 'PUBLIC', False, 'NONE', 'PUBLIC_TOOLS', 'ACTIVE', 6),

    # ── المساعد الذكي ──
    ('assistant', 'assistant', 'المساعد الذكي لمنصة الحجر الصحي القومي',
     'بوابة ذكية للإجابة عن استفساراتك حول السفر والخدمات الصحية — يستند حصراً إلى المحتوى الرسمي المنشور.',
     'smart_toy', '/services/assistant', 'PUBLIC', False, 'NONE', 'NQP_ASSISTANT', 'ACTIVE', 1),
]


class Command(BaseCommand):
    help = 'ينشئ فئات وخدمات بوابة الخدمات الإلكترونية (/services)'

    def handle(self, *args, **options):
        categories = {}
        for cat in CATEGORIES:
            obj, _ = ServiceCategory.objects.update_or_create(
                code=cat['code'],
                defaults={
                    'name_ar': cat['name_ar'],
                    'name_en': cat['name_en'],
                    'icon': cat['icon'],
                    'sort_order': cat['sort_order'],
                    'is_active': True,
                },
            )
            categories[cat['code']] = obj

        for code, cat_code, name_ar, description, icon, route, audience, auth, idp, target, status, sort in SERVICES:
            Service.objects.update_or_create(
                code=code,
                defaults={
                    'category': categories[cat_code],
                    'name_ar': name_ar,
                    'description_ar': description,
                    'icon': icon,
                    'route': route,
                    'audience': audience,
                    'requires_auth': auth,
                    'identity_provider': idp,
                    'target_system': target,
                    'status': status,
                    'sort_order': sort,
                    'is_active': True,
                },
            )

        self.stdout.write(self.style.SUCCESS(
            f'تم إنشاء {len(CATEGORIES)} فئة و{len(SERVICES)} خدمة.'
        ))
