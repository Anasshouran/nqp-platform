from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.accounts.models import Permission, Role, RoleAssignment, ScopeType

User = get_user_model()

RESOURCES = {
    'travelers': 'المسافرون',
    'screening': 'الفحوصات',
    'surveillance': 'الترصد الصحي',
    'laboratory': 'المختبر',
    'food': 'الغذاء',
    'emergency': 'الطوارئ',
    'reports': 'التقارير',
    'users': 'المستخدمون',
    'roles': 'الأدوار والصلاحيات',
    'ports': 'المنافذ',
    'risk': 'تقييم المخاطر',
    'notifications': 'الإشعارات',
    'flights': 'الرحلات الجوية',
    'settings': 'الإعدادات',
    'organization': 'الهيكل الإداري',
     'port_health': 'صحة الموانئ',
    'airport_health': 'صحة المطارات',
    'borders_health': 'صحة المعابر البرية',
    'clinic': 'عيادات الحجر الصحي',
    'it': 'تقنية المعلومات',
    'db_admin': 'إدارة قاعدة البيانات',
    'chemistry': 'الكيمياء التحليلية',
    'quality': 'ضمان الجودة',
    'reagents': 'الكواشف والمواد',
    'ihr_event': 'أحداث اللوائح الصحية الدولية',
    'ihr_risk': 'تقييم مخاطر اللوائح الصحية الدولية',
    'ihr_nfp': 'نقطة الاتصال الوطنية للوائح الصحية',
    'ihr_spar': 'مؤشرات الاستعداد (SPAR)',
    'who_integration': 'تكامل منظمة الصحة العالمية',
    'who_logs': 'سجلات التكامل مع WHO',
    'who_diseases': 'الأمراض الوبائية العالمية (ICD-11)',
    'who_mappings': 'خرائط ربط ICD-11',
    'vaccination': 'التطعيم الدولي',
    'vector': 'مكافحة النواقل',
    'approval': 'الاعتماد',
    'content': 'المحتوى التوعوي',
    'finance': 'المالية والمحاسبة',
    'food_window': 'نافذة الأغذية',
    'food_samples': 'عينات الأغذية',
    'permissions': 'الصلاحيات (تعريف)',
    'role_assignments': 'تعيينات الأدوار',
    'hr_employee': 'ملفات الموظفين',
    'hr_establishment': 'البيانات التأسيسية والوحدات',
    'hr_posting': 'النقل والمناوبات',
    'hr_attendance': 'الحضور والانصراف',
    'hr_leave': 'الإجازات',
    'hr_training': 'التدريب',
    'hr_performance': 'تقييم الأداء',
    'hr_payroll': 'الرواتب',
    'hr_document': 'وثائق الموظفين',
    'hr_dashboard': 'لوحة الموارد البشرية',
    # بوابة تكامل المنظمات
    'integration': 'تكاملات المنظمات',
    'api_endpoint': 'كتالوج نقاط API',
    'integration_health': 'سجلات صحة التكامل',
    'webhook_subscription': 'اشتراكات الويب هوك',
    'webhook_delivery': 'توصيلات الويب هوك',
    'audit_log': 'سجلات مراجعة البوابة',
    'data_scope': 'نطاقات تبادل البيانات',
    'credential': 'بيانات اعتماد التكامل',
    'shipping_companies': 'شركات الملاحة',
    'shipping_agents': 'الوكلاء الملاحيون',
    'pre_arrivals': 'الإخطارات المسبقة للسفن',
    'vessel_company_relationships': 'علاقات الشركات بالسفن',
    'shipping_audit_logs': 'سجلات تدقيق الملاحة',
    'clearance_decisions': 'قرارات الإفراج الصحي البحري',
    'vessels': 'السفن',
    'vessel_visits': 'زيارات السفن',
    'carrier_members': 'أعضاء شركات النقل',
}

ACTIONS = {
    'view': 'عرض',
    'add': 'إضافة',
    'edit': 'تعديل',
    'delete': 'حذف',
    'export': 'تصدير',
}

EXTRA_ACTIONS = {
    'travelers': {
        'review': 'مراجعة واعتماد طلبات المسافرين',
    },
    'ihr_event': {
        'submit': 'إرسال للمراجعة الوطنية',
        'assess': 'تقييم المخاطر',
        'approve': 'اعتماد وطني (NFP)',
        'notify': 'إخطار منظمة الصحة',
        'close': 'إغلاق',
        'reject': 'رفض',
    },
    'ihr_nfp': {
        'assign': 'تعيين نقطة اتصال وطنية',
    },
    'who_integration': {
        'test': 'اختبار الاتصال',
        'sync': 'مزامنة',
    },
    'who_diseases': {
        'sync': 'مزامنة الأمراض',
    },
    'who_mappings': {
        'review': 'مراجعة اقتراحات الربط',
        'approve': 'اعتماد اقتراحات الربط',
        'reject': 'رفض اقتراحات الربط',
        'search': 'البحث في تصنيف ICD-11',
    },
    'integration': {
        'view': 'عرض التكاملات',
        'add': 'إضافة تكامل',
        'edit': 'تعديل تكامل',
        'delete': 'حذف تكامل',
        'test': 'اختبار الاتصال',
        'sync': 'مزامنة',
        'verify': 'تفعيل/توثيق',
        'export': 'تصدير',
    },
    'api_endpoint': {
        'view': 'عرض كتالوج API',
        'add': 'إضافة نقطة API',
        'edit': 'تعديل نقطة API',
        'delete': 'حذف نقطة API',
        'verify': 'تفعيل/توثيق نقطة',
        'export': 'تصدير الكتالوج',
    },
    'integration_health': {
        'view': 'عرض حالة الصحة',
        'run_check': 'تشغيل فحص صحة',
    },
    'webhook_subscription': {
        'view': 'عرض اشتراكات الويب هوك',
        'add': 'إضافة اشتراك',
        'edit': 'تعديل اشتراك',
        'delete': 'حذف اشتراك',
    },
    'webhook_delivery': {
        'view': 'عرض محاولات التوصيل',
        'retry': 'إعادة محاولة توصيل فاشلة',
    },
    'audit_log': {
        'view': 'عرض سجلات المراجعة',
        'export': 'تصدير السجلات',
    },
    'data_scope': {
        'view': 'عرض نطاقات البيانات',
        'add': 'إضافة نطاق',
        'edit': 'تعديل نطاق',
        'delete': 'حذف نطاق',
    },
    'credential': {
        'view': 'عرض بيانات الاعتماد',
        'add': 'إضافة اعتماد',
        'edit': 'تعديل اعتماد',
        'delete': 'حذف اعتماد',
        'rotate': 'تدوير سر',
    },
    'organization': {
        'view': 'عرض المنظمات',
        'add': 'إضافة منظمة',
        'edit': 'تعديل منظمة',
        'delete': 'حذف منظمة',
    },
    'vaccination': {
        'issue': 'إصدار شهادات التطعيم',
        'verify': 'التحقق من شهادات التطعيم',
    },
    'vector': {
        'approve': 'اعتماد المسوحات والنتائج والعمليات',
        'close': 'إغلاق البؤر، البلاغات، وعمليات المكافحة',
        'assess': 'تقييم البلاغات وفتح البؤر',
    },
    'content': {
        'approve': 'اعتماد المحتوى',
        'publish': 'نشر المحتوى',
        'archive': 'أرشفة المحتوى',
    },
    'food_window': {
        'approve': 'اعتماد معاملات نافذة الأغذية',
    },
    'food': {
        'review': 'مراجعة واعتماد قرارات الفسح الغذائي',
        'approve': 'اعتماد الشحنات والرقابة النهائية',
    },
    'hr_employee': {
        'approve': 'اعتماد بيانات الملف الوظيفي',
    },
    'hr_establishment': {
        'approve': 'اعتماد الوحدات والأقسام التنظيمية',
    },
    'hr_posting': {
        'approve': 'اعتماد النقل أو المناوبة',
        'reject': 'رفض طلب النقل',
    },
    'hr_attendance': {
        'approve': 'اعتماد سجلات الحضور',
    },
    'hr_leave': {
        'approve': 'اعتماد الإجازة',
        'reject': 'رفض طلب الإجازة',
    },
    'hr_training': {
        'approve': 'اعتماد الدورات التدريبية',
    },
    'hr_performance': {
        'approve': 'اعتماد تقييم الأداء',
    },
    'hr_payroll': {
        'run': 'تشغيل مسير الرواتب',
        'approve': 'اعتماد مسير الرواتب',
        'pay': 'صرف الرواتب',
    },
    'hr_document': {
        'approve': 'اعتماد الوثائق',
    },
    'borders_health': {
        'register_traveler': 'تسجيل مسافر',
        'health_screen': 'فحص صحي',
        'vehicle_inspect': 'تفتيش مركبة',
        'cargo_inspect': 'تفتيش شحنة',
        'sample_create': 'جمع عيّنة',
        'sample_send': 'إرسال عيّنة',
        'case_create': 'فتح حالة',
        'quarantine_manage': 'إدارة الحجر',
        'isolation_manage': 'إدارة العزل',
        'contact_trace': 'تتبع مخالطين',
        'emergency_manage': 'إدارة طوارئ',
        'certificate_issue': 'إصدار شهادة',
        'report_view': 'عرض تقارير المعابر',
        'dashboard_view': 'عرض لوحة قيادة المعابر',
    },
    # M8-B.2: دورة حياة العضوية إجراءات مخصّصة لا `delete` — التعطيل هو مسار
    # الإزالة التشغيلي (يُبقي الصف والتدقيق)، والحذف النهائي إداري خارج الـAPI.
    'carrier_members': {
        'activate': 'تفعيل عضوية شركة نقل',
        'deactivate': 'تعطيل عضوية شركة نقل',
    },
}

ALL_RESOURCES = list(RESOURCES.keys())

# أفعال مخصّصة لا تُولَّد لها صلاحية رغم انتسابها لـ`ACTIONS`:
# `carrier_members:delete` غير مسنود عمداً — الإزالة التشغيلية هي `deactivate`،
# والحذف النهائي مسار إداري خارج الـAPI (M8-B.2).
PERMISSION_EXCLUSIONS = {
    'carrier_members': {'delete'},
}


# الأدوار بخرائط الصلاحيات والنطاق الافتراضي لكل مستوى إداري
ROLES = [
    {
        'code': 'ADMIN',
        'name': 'System Administrator',
        'name_ar': 'مدير النظام',
        'description': 'صلاحيات كاملة على جميع وحدات المنصة',
        'default_scope': ScopeType.GLOBAL,
        'resources': ALL_RESOURCES,
    },
    {
        'code': 'DG_MANAGER',
        'name': 'Director General of Quarantine',
        'name_ar': 'مدير عام الحجر الصحي القومي',
        'description': 'الإشراف على جميع القطاعات واعتماد السياسات والتقارير الوطنية ومتابعة الأداء',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            'reports': ['view', 'add', 'edit', 'delete', 'export'],
            'organization': ['view', 'export'],
            'travelers': ['view', 'export', 'review'],
            'screening': ['view', 'export'],
            'surveillance': ['view', 'export'],
            'laboratory': ['view'],
            'food': ['view'],
            'emergency': ['view'],
            'risk': ['view'],
            'port_health': ['view'],
            'ports': ['view'],
            'notifications': ['view'],
            'flights': ['view', 'add', 'edit', 'delete', 'export'],
            'settings': ['view'],
            'ihr_event': ['view', 'export', 'assess', 'approve'],
            'ihr_risk': ['view'],
            'ihr_spar': ['view'],
            # إشراف ومراقبة تقارير WHO/IHR فقط: بلا `test` أو `sync`
            # (فصل المهام: التشغيل التقني لمسؤول التكامل مع WHO).
            'who_integration': ['view', 'export'],
            'who_logs': ['view', 'export'],
            'who_diseases': ['view', 'export'],
            'who_mappings': ['view', 'export'],
            'vaccination': ['view', 'export'],
            'hr_dashboard': ['view', 'export'],
            'hr_employee': ['view', 'export'],
            'hr_payroll': ['view', 'export'],
        },
    },
    {
        'code': 'VICE_DG',
        'name': 'Deputy Director General',
        'name_ar': 'نائب المدير العام',
        'description': 'إدارة العمليات اليومية ومتابعة تنفيذ القرارات',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            'reports': ['view', 'export'],
            'travelers': ['view', 'export'],
            'screening': ['view', 'export'],
            'surveillance': ['view', 'export'],
            'laboratory': ['view'],
            'food': ['view'],
            'emergency': ['view'],
            'risk': ['view'],
            'port_health': ['view'],
            'ports': ['view'],
            'notifications': ['view'],
            'settings': ['view'],
            'users': ['view'],
            'roles': ['view'],
        },
    },
    {
        'code': 'CENTRAL_MANAGER',
        'name': 'Central Department Manager',
        'name_ar': 'مدير إدارة مركزية',
        'description': 'إدارة تخصص على المستوى القومي (أغذية، موانئ، مطارات، معابر، مختبرات، ترصد...)',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            'food': ['view', 'add', 'edit', 'export'],
            'laboratory': ['view', 'add', 'edit', 'export'],
            'port_health': ['view', 'add', 'edit', 'export'],
            'pre_arrivals': ['view', 'add', 'edit'],
            'clearance_decisions': ['view', 'add'],
            'ports': ['view', 'export'],
            'screening': ['view', 'export'],
            'travelers': ['view'],
            'surveillance': ['view', 'add', 'edit', 'export'],
            'emergency': ['view'],
            'risk': ['view', 'add'],
            'reports': ['view', 'export'],
            'notifications': ['view'],
            'organization': ['view'],
        },
    },
    {
        'code': 'AIRPORT_DIRECTOR',
        'name': 'Airport Quarantine Director',
        'name_ar': 'مدير الحجر الصحي بالمطار',
        'description': 'الرقابة التنفيذية على صحة المطارات: فحص الرحلات والمسافرين وصحة طاقم الطائرة والشحن الجوي',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            'airport_health': ['view', 'add', 'edit', 'export'],
            'screening': ['view', 'export'],
            'surveillance': ['view', 'add', 'edit', 'export'],
            'travelers': ['view', 'review'],
            'laboratory': ['view', 'export'],
            'food': ['view', 'export'],
            'emergency': ['view'],
            'risk': ['view'],
            'ports': ['view'],
            'reports': ['view', 'export'],
            'notifications': ['view'],
            'organization': ['view'],
        },
    },
    {
        'code': 'FOOD_DIRECTOR',
        'name': 'Food Safety Inspection Director',
        'name_ar': 'مدير إدارة رقابة الأغذية',
        'description': 'متابعة وتحليل الأداء الاستراتيجي لرقابة الأغذية القومية واتخاذ القرارات الإدارية المبنية على البيانات',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            'food': ['view', 'add', 'edit', 'export'],
            'laboratory': ['view', 'add', 'edit', 'export'],
            'port_health': ['view', 'add', 'edit', 'export'],
            'pre_arrivals': ['view', 'add', 'edit'],
            'clearance_decisions': ['view', 'add'],
            'ports': ['view', 'export'],
            'screening': ['view', 'export'],
            'surveillance': ['view', 'export'],
            'travelers': ['view'],
            'emergency': ['view'],
            'risk': ['view', 'add'],
            'reports': ['view', 'export'],
            'notifications': ['view'],
            'organization': ['view'],
        },
    },
    {
        'code': 'SECTOR_MANAGER',
        'name': 'Sector Director',
        'name_ar': 'مدير القطاع',
        'description': 'إدارة جميع المحطات داخل القطاع ومتابعة مؤشرات الأداء واعتماد التقارير',
        'default_scope': ScopeType.SECTOR,
        'resources': {
            'reports': ['view', 'export'],
            'travelers': ['view', 'review'],
            'screening': ['view', 'export'],
            'surveillance': ['view', 'add', 'edit', 'export'],
            'laboratory': ['view'],
            'food': ['view'],
            'emergency': ['view'],
            'risk': ['view'],
            'port_health': ['view', 'export'],
            'ports': ['view'],
            'notifications': ['view'],
            'organization': ['view'],
            'it': ['view'],
            'ihr_event': ['view'],
        },
    },
    {
        'code': 'DEPT_MANAGER',
        'name': 'Department Manager',
        'name_ar': 'مدير إدارة القطاع',
        'description': 'إدارة قسم متخصص داخل القطاع ومتابعة رؤساء المحطات',
        'default_scope': ScopeType.DEPARTMENT,
        'resources': {
            'reports': ['view', 'export'],
            'travelers': ['view', 'review'],
            'screening': ['view', 'add', 'edit'],
            'laboratory': ['view', 'edit'],
            'food': ['view', 'edit'],
            'port_health': ['view', 'edit'],
            'pre_arrivals': ['view', 'add', 'edit'],
            'clearance_decisions': ['view', 'add'],
            'risk': ['view'],
            'notifications': ['view'],
            'organization': ['view'],
        },
    },
    {
        'code': 'STATION_HEAD',
        'name': 'Station Head',
        'name_ar': 'رئيس المحطة / رئيس القسم',
        'description': 'مراجعة الطلبات وتوزيع المفتشين واعتماد نتائج المختبر وإصدار القرار النهائي',
        'default_scope': ScopeType.STATION,
        'resources': {
            'travelers': ['view', 'add', 'edit', 'review'],
            'screening': ['view', 'add', 'edit'],
            'laboratory': ['view', 'edit'],
            'food': ['view', 'edit'],
            'port_health': ['view', 'add', 'edit'],
            'pre_arrivals': ['view', 'add', 'edit'],
            'clearance_decisions': ['view', 'add'],
            'risk': ['view'],
            'reports': ['view', 'export'],
            'notifications': ['view'],
        },
    },
    {
        'code': 'SECTOR_HEAD',
        'name': 'Food Safety Sector Head',
        'name_ar': 'مدير إدارة رقابة الأغذية بالقطاع',
        'description': 'إشراف قطاعي على منافذ رقابة الأغذية: مقارنة أداء المنافذ ومتابعة رؤساء الأقسام والمخاطر والإنفاذ',
        'default_scope': ScopeType.SECTOR,
        'resources': {
            'food': ['view', 'export'],
            'laboratory': ['view'],
            'risk': ['view'],
            'reports': ['view', 'export'],
            'ports': ['view'],
            'notifications': ['view'],
            'organization': ['view'],
        },
    },
    {
        'code': 'CLERK',
        'name': 'Clerk',
        'name_ar': 'الكاتب',
        'description': 'تسجيل الطلبات وإدخال البيانات ورفع المستندات',
        'default_scope': ScopeType.STATION,
        'resources': {
            'travelers': ['view', 'add', 'edit'],
            'screening': ['view', 'add'],
            'port_health': ['view', 'add'],
            'food': ['view', 'add'],
            'laboratory': ['view'],
            'notifications': ['view'],
        },
    },
    {
        'code': 'LAB_RECEPTIONIST',
        'name': 'Sample Reception Officer',
        'name_ar': 'موظف استلام العينات',
        'description': 'أول نقطة دخول للعينة: إنشاء سجل العينة ومصدرها وبيانات المنتج ونوعها وكميتها وفحص حالتها واتخاذ قرار القبول/الرفض وطباعة الباركود وتسجيل سلسلة الحيازة. لا يدخل نتائج التحليل ولا يعدل المواصفات ولا يعتمد النتائج.',
        'default_scope': ScopeType.STATION,
        'resources': {
            'food': ['view', 'add', 'edit'],
            'laboratory': ['view'],
            'travelers': ['view'],
            'notifications': ['view'],
        },
    },
    {
        'code': 'LAB_COORDINATOR',
        'name': 'Sample Coordinator',
        'name_ar': 'منسق عينات المختبر',
        'description': 'حلقة الوصل بين الاستلام والأقسام الفنية: مشاهدة العينات المقبولة وتصنيفها وتوزيعها وإنشاء أوامر التحليل وإرسالها للكيمياء أو الميكروبيولوجي وتحديد أولوية التحليل ومتابعة SLA وإعادة التوزيع. لا يدخل نتائج التحليل ولا يعتمدها.',
        'default_scope': ScopeType.STATION,
        'resources': {
            'food': ['view', 'add', 'edit'],
            'laboratory': ['view'],
            'travelers': ['view'],
            'reports': ['view'],
            'notifications': ['view'],
        },
    },
    {
        'code': 'ACCOUNTANT',
        'name': 'Accountant',
        'name_ar': 'المحاسب',
        'description': 'إصدار الفواتير وتحصيل الرسوم وإصدار الإيصالات',
        'default_scope': ScopeType.STATION,
        'resources': {
            'port_health': ['view', 'add', 'edit'],
            'pre_arrivals': ['view', 'add', 'edit'],
            'clearance_decisions': ['view', 'add'],
            'food': ['view', 'add', 'edit'],
            'travelers': ['view'],
            'reports': ['view'],
            'notifications': ['view'],
        },
    },
    {
        'code': 'QUARANTINE_INSPECTOR',
        'name': 'Quarantine Health Inspector',
        'name_ar': 'مفتش الحجر الصحي',
        'description': 'التفتيش الصحي وتسجيل نتائج الزيارة والتوصية بالإجراءات',
        'default_scope': ScopeType.STATION,
        'resources': {
            'port_health': ['view', 'add', 'edit'],
            'pre_arrivals': ['view', 'add', 'edit'],
            'clearance_decisions': ['view', 'add'],
            'screening': ['view', 'add', 'edit'],
            'surveillance': ['view', 'add', 'edit'],
            'travelers': ['view'],
            'food': ['view'],
            'laboratory': ['view'],
            'risk': ['view', 'add'],
            'reports': ['view'],
            'notifications': ['view'],
            'flights': ['view'],
            'vaccination': ['view', 'add', 'verify'],
            'borders_health': [
                'view', 'add', 'edit', 'register_traveler', 'health_screen',
                'vehicle_inspect', 'cargo_inspect', 'sample_create', 'sample_send',
                'certificate_issue', 'report_view', 'dashboard_view',
            ],
        },
    },
    # -----------------------------------------------------------------------
    # نظام صحة المعابر البرية — أدوار مستوى المعبر (النطاق = نقطة دخول)
    #
    # مطابقة مواصفات النظام (03_Border_Health_Command.md) بأكواد المستودع:
    #   ENVIRONMENTAL_HEALTH_INSPECTOR ← ENV_INSPECTOR  (يُعاد استخدامه بدل
    #       دور مكرر بنفس الاسم والصلاحيات — انظر تعريفه أدناه)
    #   SYSTEM_ADMIN                  ← BORDER_SYSTEM_ADMIN
    #   MANAGER                       ← BORDER_STATION_MANAGER
    #   HEALTH_OFFICER                ← BORDER_HEALTH_OFFICER
    #   QUARANTINE_MANAGER            ← QUARANTINE_SECTOR_DIRECTOR
    #   DISEASE_CONTROL               ← EPIDEMIOLOGY_OFFICER
    #   LAB_TECH / LAB_SPECIALIST     ← LAB_TECHNICIAN
    #   OFFICER / DATA_ENTRY / CUSTOMS / IMMIGRATION
    #                                ← BORDER_HEALTH_OFFICER، TRAVELER_REGISTRATION_OFFICER،
    #                                   CUSTOMS_OFFICER، IMMIGRATION_OFFICER
    #   QUARANTINE_DOCTOR / FOOD_INSPECTOR / EMERGENCY_OFFICER / BORDER_DIRECTOR
    #                                ← تُستخدم بنفس أسمائها
    # -----------------------------------------------------------------------
    {
        'code': 'BORDER_SYSTEM_ADMIN',
        'name': 'Border Health System Administrator',
        'name_ar': 'مدير نظام صحة المعابر',
        'description': 'إدارة كاملة لبيانات المعابر البرية: المعابر والمرافق والورديات والكادر',
        'default_scope': ScopeType.PORT,
        'resources': {
            'borders_health': ['view', 'add', 'edit', 'delete', 'export',
                               'dashboard_view', 'report_view'],
        },
    },
    {
        'code': 'BORDER_STATION_MANAGER',
        'name': 'Border Station Manager',
        'name_ar': 'مدير محطة المعبر',
        'description': 'إدارة محطة المعبر: الورديات والكادر والمرافق ومتابعة الأداء اليومي',
        'default_scope': ScopeType.PORT,
        'resources': {
            'borders_health': ['view', 'add', 'edit', 'delete', 'export',
                               'dashboard_view', 'report_view', 'health_screen'],
        },
    },
    {
        'code': 'BORDER_HEALTH_OFFICER',
        'name': 'Border Health Officer',
        'name_ar': 'ضابط الصحة الحدودية',
        'description': 'فحص المسافرين والمركبات والشحنات وقرارات الإفراج عند المعبر',
        'default_scope': ScopeType.PORT,
        'resources': {
            'borders_health': ['view', 'add', 'edit', 'register_traveler',
                               'health_screen', 'vehicle_inspect', 'cargo_inspect',
                               'sample_create', 'dashboard_view'],
        },
    },
    {
        'code': 'QUARANTINE_DOCTOR',
        'name': 'Quarantine Doctor',
        'name_ar': 'طبيب الحجر',
        'description': 'التقييم الطبي للمسافرين وإدارة حالات الحجر والعزل وقرارات الإفراج',
        'default_scope': ScopeType.PORT,
        'resources': {
            'borders_health': ['view', 'add', 'edit', 'health_screen', 'case_create',
                               'quarantine_manage', 'isolation_manage',
                               'contact_trace', 'dashboard_view'],
        },
    },
    {
        'code': 'TRAVELER_REGISTRATION_OFFICER',
        'name': 'Traveler Registration Officer',
        'name_ar': 'موظف تسجيل المسافرين',
        'description': 'تسجيل بيانات المسافرين وإقرارات الصحة عند المعبر',
        'default_scope': ScopeType.PORT,
        'resources': {
            'borders_health': ['view', 'add', 'edit', 'register_traveler'],
        },
    },
    {
        'code': 'EPIDEMIOLOGY_OFFICER',
        'name': 'Epidemiology Officer',
        'name_ar': 'ضابط الترصد',
        'description': 'ترصد الحالات وتتبع المخالطين وتحليل اتجاهات الأمراض على مستوى القطاع',
        'default_scope': ScopeType.SECTOR,
        'resources': {
            'borders_health': ['view', 'add', 'edit', 'case_create', 'contact_trace',
                               'quarantine_manage', 'report_view', 'export',
                               'dashboard_view'],
        },
    },
    {
        'code': 'EMERGENCY_OFFICER',
        'name': 'Emergency Officer',
        'name_ar': 'ضابط الطوارئ',
        'description': 'إدارة الطوارئ والحوادث الصحية على مستوى القطاع والقومي',
        'default_scope': ScopeType.SECTOR,
        'resources': {
            'borders_health': ['view', 'add', 'edit', 'delete', 'emergency_manage',
                               'sample_create', 'sample_send', 'dashboard_view',
                               'report_view', 'export'],
        },
    },
    {
        'code': 'CUSTOMS_OFFICER',
        'name': 'Customs Officer',
        'name_ar': 'ضابط الجمارك',
        'description': 'قراءة بيانات تفتيش الشحنات والمركبات للربط مع إجراءات الجمارك',
        'default_scope': ScopeType.PORT,
        'resources': {
            'borders_health': ['view', 'cargo_inspect', 'vehicle_inspect'],
        },
    },
    {
        'code': 'IMMIGRATION_OFFICER',
        'name': 'Immigration Officer',
        'name_ar': 'ضابط الهجرة',
        'description': 'قراءة سجلات حركة المسافرين وقرارات الإفراج للربط مع الهجرة',
        'default_scope': ScopeType.PORT,
        'resources': {
            'borders_health': ['view', 'register_traveler', 'health_screen'],
        },
    },
    {
        'code': 'BORDER_DIRECTOR',
        'name': 'Border Health Director',
        'name_ar': 'مدير صحة المعابر',
        'description': 'إدارة صحة المعابر على مستوى المعبر والقطاع: الأداء والقرارات والتقارير',
        'default_scope': ScopeType.SECTOR,
        'resources': {
            'borders_health': ['view', 'add', 'edit', 'delete', 'export', 'dashboard_view',
                               'report_view', 'health_screen', 'certificate_issue',
                               'emergency_manage'],
        },
    },
    {
        'code': 'QUARANTINE_SECTOR_DIRECTOR',
        'name': 'Quarantine Sector Director',
        'name_ar': 'مدير قطاع الحجر الصحي',
        'description': 'إدارة قطاع الحجر الصحي ومتابعة المعابر والعزل والتدقيق',
        'default_scope': ScopeType.SECTOR,
        'resources': {
            'borders_health': ['view', 'add', 'edit', 'delete', 'export', 'dashboard_view',
                               'report_view', 'quarantine_manage', 'isolation_manage',
                               'contact_trace', 'emergency_manage'],
        },
    },
    {
        'code': 'NATIONAL_QUARANTINE_DIRECTOR',
        'name': 'National Quarantine Director',
        'name_ar': 'المدير الوطني للحجر الصحي',
        'description': 'الإشراف الوطني على صحة المعابر: السياسات والمقارنة القومية والتفعيل',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            'borders_health': ['view', 'add', 'edit', 'delete', 'export', 'dashboard_view',
                               'report_view', 'quarantine_manage', 'isolation_manage',
                               'emergency_manage', 'certificate_issue'],
        },
    },
    {
        'code': 'EOC_OPERATOR',
        'name': 'Emergency Operations Centre Operator',
        'name_ar': 'مشغل غرفة عمليات الطوارئ',
        'description': 'متابعة الإنذارات والتدقيق على الحالات الوبائية وتأكيدها وتنسيق الاستجابة الميدانية',
        'default_scope': ScopeType.SECTOR,
        'resources': {
            'surveillance': ['view', 'add', 'edit', 'export'],
            'emergency': ['view', 'add', 'edit', 'export'],
            'screening': ['view', 'export'],
            'travelers': ['view', 'export'],
            'laboratory': ['view', 'export'],
            'food': ['view', 'export'],
            'risk': ['view', 'add'],
            'reports': ['view', 'export'],
            'notifications': ['view'],
            'ports': ['view'],
            'organization': ['view'],
        },
    },
    {
        'code': 'EPIDEMIC_CONTROL_MANAGER',
        'name': 'Epidemic Control Manager',
        'name_ar': 'مدير مكافحة الأوبئة',
        'description': 'إدارة الترصد الصحي على المستوى القطاعي/القومي: تهيئة الأمراض واجبة الإبلاغ، الإشراف على محركات الإنذار المبكر (EWARS)، تحليل الاتجاهات، تنسيق الاستجابة الوبائية، التحقيقات الميدانية، والإبلاغ الإقليمي/الدولي',
        'default_scope': ScopeType.SECTOR,
        'resources': {
            'surveillance': ['view', 'add', 'edit', 'delete', 'export'],
            'emergency': ['view', 'add', 'edit', 'export'],
            'screening': ['view', 'export'],
            'travelers': ['view', 'export'],
            'laboratory': ['view', 'add', 'edit', 'export'],
            'food': ['view', 'export'],
            'risk': ['view', 'add', 'edit'],
            'reports': ['view', 'export'],
            'notifications': ['view'],
            'ports': ['view'],
            'organization': ['view'],
            'ihr_event': ['view', 'add', 'submit', 'assess'],
            'ihr_risk': ['view', 'add'],
            'ihr_spar': ['view'],
        },
    },
    {
        'code': 'AIRPORT_INSPECTOR',
        'name': 'Airport Health Inspector',
        'name_ar': 'مفتش الحجر الصحي في المطار',
        'description': 'تفتيش الرحلات والمسافرين في المطار وتسجيل نتائج الفحص والإحالة',
        'default_scope': ScopeType.STATION,
        'resources': {
            'airport_health': ['view', 'add', 'edit'],
            'screening': ['view', 'add', 'edit'],
            'travelers': ['view'],
            'reports': ['view'],
            'notifications': ['view'],
        },
    },
    {
        'code': 'FOOD_INSPECTOR',
        'name': 'Food Safety Inspector',
        'name_ar': 'مفتش رقابة الأغذية',
        'description': 'فحص الشحنات الغذائية وسحب العينات وإعداد تقرير التفتيش',
        'default_scope': ScopeType.STATION,
        'resources': {
            'food': ['view', 'add', 'edit', 'delete'],
            'laboratory': ['view', 'add'],
            'reports': ['view'],
            'travelers': ['view'],
            'notifications': ['view'],
            'borders_health': ['view', 'add', 'edit', 'cargo_inspect',
                               'sample_create', 'report_view'],
        },
    },
    {
        'code': 'ENV_INSPECTOR',
        'name': 'Environmental Health Inspector',
        'name_ar': 'مفتش صحة البيئة',
        'description': 'فحص الاشتراطات البيئية ومتابعة مكافحة النواقل وإعداد التقارير البيئية',
        'default_scope': ScopeType.STATION,
        'resources': {
            'port_health': ['view', 'add', 'edit'],
            'surveillance': ['view', 'add', 'edit'],
            'emergency': ['view'],
            'risk': ['view'],
            'reports': ['view', 'add'],
            'notifications': ['view'],
            'borders_health': ['view', 'add', 'edit', 'cargo_inspect',
                               'health_screen', 'report_view'],
        },
    },
    {
        'code': 'NATIONAL_LAB_ADMIN',
        'name': 'National Laboratory Administration',
        'name_ar': 'الإدارة القومية للمعامل',
        'description': 'الإشراف القومي على المعامل القطاعية: متابعة جميع القطاعات، لوحة القيادة الوطنية، تقييم أداء المعامل، اعتماد النتائج الوطنية ومراقبة الكواشف والأجهزة',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            'laboratory': ['view', 'add', 'edit', 'delete', 'export'],
            'chemistry': ['view', 'add', 'edit', 'export'],
            'quality': ['view', 'add', 'edit', 'delete'],
            'reagents': ['view', 'add', 'edit', 'delete'],
            'reports': ['view', 'add', 'edit', 'export'],
            'users': ['view', 'add', 'edit'],
            'organization': ['view', 'export'],
            'emergency': ['view'],
            'surveillance': ['view', 'export'],
            'notifications': ['view'],
            'settings': ['view'],
        },
    },
    {
        'code': 'LAB_MANAGER',
        'name': 'Laboratory Manager',
        'name_ar': 'مسؤول المختبر',
        'description': 'استلام العينات وتوزيعها على الفنيين واعتماد النتائج وإرسالها للنظام',
        'default_scope': ScopeType.STATION,
        'resources': {
            'laboratory': ['view', 'add', 'edit', 'delete'],
            'reports': ['view', 'add'],
            'travelers': ['view'],
            'port_health': ['view'],
            'notifications': ['view'],
        },
    },
    {
        'code': 'LAB_DIRECTOR',
        'name': 'Laboratory Director',
        'name_ar': 'مدير المختبر',
        'description': 'الإشراف على جميع أقسام المختبر، اعتماد النتائج النهائية، مراقبة الجودة وSLA والطاقة التشغيلية، متابعة عدم المطابقة. لا يدخل نتائج التحاليل بنفسه بل يراجع ويعتمد ما تمت مراجعته من رؤساء الأقسام.',
        'default_scope': ScopeType.STATION,
        'resources': {
            'laboratory': ['view', 'add', 'edit', 'delete'],
            'reports': ['view', 'add', 'edit'],
            'travelers': ['view'],
            'port_health': ['view'],
            'notifications': ['view'],
            'approval': ['view', 'add', 'edit'],
        },
    },
    {
        'code': 'LAB_TECHNICIAN',
        'name': 'Laboratory Technician',
        'name_ar': 'فني المختبر',
        'description': 'إجراء التحاليل وإدخال النتائج وتوثيق الفحوصات',
        'default_scope': ScopeType.STATION,
        'resources': {
            'laboratory': ['view', 'add', 'edit'],
            'reports': ['view'],
            'notifications': ['view'],
            'borders_health': ['view', 'add', 'edit', 'sample_create',
                               'sample_send', 'report_view'],
        },
    },
    {
        'code': 'CHEM_SECTION_HEAD',
        'name': 'Chemistry Section Head',
        'name_ar': 'رئيس قسم الكيمياء',
        'description': 'إدارة عينات الكيمياء وتوزيعها على المحللين ومتابعة التحاليل ومراجعة النتائج ومراجعة الجودة (QC) ومراقبة الأجهزة ومتابعة SLA',
        'default_scope': ScopeType.STATION,
        'resources': {
            'laboratory': ['view', 'add', 'edit'],
            'reports': ['view'],
            'travelers': ['view'],
            'port_health': ['view'],
            'notifications': ['view'],
        },
    },
    {
        'code': 'CHEM_ANALYST',
        'name': 'Chemistry Analyst',
        'name_ar': 'محلل كيميائي',
        'description': 'تنفيذ التحاليل الكيميائية وإدخال النتائج وحفظ السجلات وإدارة عينات الكيمياء',
        'default_scope': ScopeType.STATION,
        'resources': {
            'chemistry': ['view', 'add', 'edit'],
            'laboratory': ['view'],
            'reports': ['view'],
            'notifications': ['view'],
            'travelers': ['view'],
        },
    },
    {
        'code': 'MICRO_SECTION_HEAD',
        'name': 'Microbiology Section Head',
        'name_ar': 'رئيس قسم الأحياء الدقيقة',
        'description': 'توزيع عينات الأحياء الدقيقة على المحللين ومتابعة عبء العمل ومراجعة النتائج ومراجعة الحدود الميكروبيولوجية (n/c/m/M) ومراجعة الجودة (QC) ومتابعة SLA. لا يعتمد النتيجة نهائياً ولا يعدل النتائج بنفسه ولا يعدل المواصفات',
        'default_scope': ScopeType.STATION,
        'resources': {
            'laboratory': ['view', 'add', 'edit'],
            'reports': ['view'],
            'travelers': ['view'],
            'port_health': ['view'],
            'notifications': ['view'],
        },
    },
    {
        'code': 'MICRO_ANALYST',
        'name': 'Microbiology Analyst',
        'name_ar': 'محلل الأحياء الدقيقة',
        'description': 'تنفيذ التحليل الميكروبيولوجي وتوثيق كل مرحلة (الزراعة، الحضانة، القراءة، العدّ الميكروبي، النتائج النوعية) وإدخال النتائج وإرسالها لرئيس قسم الأحياء الدقيقة للمراجعة. لا يعدل المواصفة ولا يعتمد النتائج ولا يحذف النتائج',
        'default_scope': ScopeType.STATION,
        'resources': {
            'laboratory': ['view', 'add', 'edit'],
            'reports': ['view'],
            'notifications': ['view'],
            'settings': ['view'],
        },
    },
    {
        'code': 'QUALITY_ASSURANCE',
        'name': 'Quality Assurance Officer',
        'name_ar': 'مسؤول الجودة',
        'description': 'مراقبة سلامة النظام الفني للمختبر: المواصفات الميكروبيولوجية (n/c/m/M)، طرق الاختبار، مراجعة الجودة (QC)، المعايرة، الكواشف، الوثائق، عدم المطابقة (NC)، CAPA، وسجل التدقيق (Audit Trail). لا يعدل نتائج المحللين ولا يعتمد النتيجة النهائية ولا يدير المستخدمين ولا الرسوم',
        'default_scope': ScopeType.STATION,
        'resources': {
            'laboratory': ['view', 'edit'],
            'reports': ['view'],
            'notifications': ['view'],
            'quality': ['view', 'add', 'edit'],
        },
    },
    {
        'code': 'IT_ADMIN',
        'name': 'IT Administrator',
        'name_ar': 'مسؤول تقنية المعلومات',
        'description': 'إدارة المستخدمين والخوادم ومراقبة النظام والدعم الفني',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            'db_admin': ['view'],
            'users': ['view', 'add', 'edit', 'delete'],
            'roles': ['view'],
            'settings': ['view', 'add', 'edit'],
            'reports': ['view'],
            'notifications': ['view'],
        },
    },
    {
        'code': 'SECTOR_IT_MANAGER',
        'name': 'Sector IT Manager',
        'name_ar': 'مدير تقنية المعلومات للقطاع',
        'description': 'إدارة أنظمة تقنية المعلومات والأصول والتذاكر والشبكات والتقارير الفنية داخل القطاع',
        'default_scope': ScopeType.SECTOR,
        'resources': {
            'it': ['view', 'add', 'edit', 'delete', 'export'],
            'users': ['view'],
            'settings': ['view', 'edit'],
            'reports': ['view', 'export'],
            'notifications': ['view'],
            'organization': ['view'],
        },
    },
    {
        'code': 'DBA_ADMIN',
        'name': 'Database Administrator',
        'name_ar': 'مسؤول قاعدة البيانات',
        'description': 'إدارة قواعد البيانات والنسخ الاحتياطي وتحسين الأداء',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            'db_admin': ['view', 'add', 'edit', 'delete', 'export'],
            'settings': ['view', 'edit'],
            'users': ['view'],
            'roles': ['view'],
            'reports': ['view'],
        },
    },
    {
        'code': 'SECTOR_CONTENT_CONTRIBUTOR',
        'name': 'Sector Content Contributor',
        'name_ar': 'محرر محتوى قطاعي',
        'description': 'إنشاء وتعديل المسودات وإرسالها للمراجعة ضمن قطاعه',
        'default_scope': ScopeType.SECTOR,
        'resources': {
            'content': ['view', 'add', 'edit'],
            'reports': ['view'],
            'notifications': ['view'],
            'organization': ['view'],
        },
    },
    {
        'code': 'SECTOR_CONTENT_EDITOR',
        'name': 'Sector Content Editor',
        'name_ar': 'محرر محتوى قطاعي متقدم',
        'description': 'تحرير المحتوى وإعادة صياغته وإرساله للمراجعة ضمن قطاعه',
        'default_scope': ScopeType.SECTOR,
        'resources': {
            'content': ['view', 'add', 'edit'],
            'reports': ['view', 'export'],
            'notifications': ['view'],
            'organization': ['view'],
        },
    },
    {
        'code': 'SECTOR_CONTENT_REVIEWER',
        'name': 'Sector Content Reviewer',
        'name_ar': 'مراجع محتوى قطاعي',
        'description': 'مراجعة المحتوى المقدَّم واعتماده أو إعادته للمسودة ضمن قطاعه',
        'default_scope': ScopeType.SECTOR,
        'resources': {
            'content': ['view', 'add', 'edit', 'approve'],
            'reports': ['view', 'export'],
            'notifications': ['view'],
            'organization': ['view'],
        },
    },
    {
        'code': 'SECTOR_CONTENT_APPROVER',
        'name': 'Sector Content Approver',
        'name_ar': 'معتمد محتوى قطاعي',
        'description': 'النشر والأرشفة النهائية للمحتوى المعتمد ضمن قطاعه',
        'default_scope': ScopeType.SECTOR,
        'resources': {
            'content': ['view', 'add', 'edit', 'approve', 'publish', 'archive', 'delete'],
            'reports': ['view', 'export'],
            'notifications': ['view'],
            'organization': ['view'],
        },
    },
    {
        'code': 'NATIONAL_CONTENT_ADMIN',
        'name': 'National Content Administrator',
        'name_ar': 'مدير المحتوى القومي',
        'description': 'إشراف قومي على كل حسابات المحتوى: اعتماد ونشر وأرشفة عبر جميع القطاعات',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            'content': ['view', 'add', 'edit', 'approve', 'publish', 'archive', 'delete'],
            'reports': ['view', 'export'],
            'notifications': ['view'],
            'organization': ['view'],
            'users': ['view'],
        },
    },
    {
        'code': 'FOOD_WINDOW_CLERK',
        'name': 'Food Window Clerk',
        'name_ar': 'موظّف نافذة الأغذية',
        'description': 'تسجيل ومعالجة معاملات الشحنات على نافذة الأغذية (نطاق منفذ معيّن + سلع مدعومة)',
        'default_scope': ScopeType.SECTOR,
        'resources': {
            'food_window': ['view', 'add', 'edit'],
            'food_samples': ['view'],
            'reports': ['view'],
        },
    },
    {
        'code': 'FOOD_WINDOW_SUPERVISOR',
        'name': 'Food Window Supervisor',
        'name_ar': 'مشرف نافذة الأغذية',
        'description': 'إشراف على نوافذ الأغذية: اعتماد قرارات السلع وإغلاق المعاملات وتعيين الموظفين',
        'default_scope': ScopeType.SECTOR,
        'resources': {
            'food_window': ['view', 'add', 'edit', 'approve', 'delete'],
            'food_samples': ['view'],
            'reports': ['view', 'export'],
            'users': ['view'],
        },
    },
    {
        'code': 'AUDIT_ADMIN',
        'name': 'Security Administrator',
        'name_ar': 'مسؤول أمن المعلومات',
        'description': 'إدارة سياسات الأمن ومراجعة سجلات التدقيق ومتابعة الحوادث الأمنية',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            'travelers': ['view'],
            'screening': ['view'],
            'laboratory': ['view'],
            'food': ['view'],
            'port_health': ['view'],
            'users': ['view'],
            'roles': ['view'],
            'settings': ['view'],
            'reports': ['view', 'export'],
            'notifications': ['view'],
        },
    },
    {
        'code': 'INTERNAL_AUDITOR',
        'name': 'Internal Auditor',
        'name_ar': 'المراجع الداخلي',
        'description': 'الاطلاع على التقارير ومراجعة العمليات ومتابعة الالتزام بالإجراءات',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            'travelers': ['view'],
            'screening': ['view'],
            'laboratory': ['view'],
            'food': ['view'],
            'port_health': ['view'],
            'ports': ['view'],
            'risk': ['view'],
            'reports': ['view', 'export'],
            'notifications': ['view'],
        },
    },
    {
        'code': 'STANDARDS_OFFICER',
        'name': 'Standards & Compliance Officer',
        'name_ar': 'مسؤول المواصفات والمطابقة',
        'description': 'إدارة المواصفات والمعايير المرجعية (SSMO/GSO/Codex/ISO/AOAC)، الإصدارات، المتطلبات، الطرق التحليلية، وقواعد التطبيق التنظيمية. مراجعة وتحديث المواصفات، مقارنة المصادر، اعتماد التغييرات، وإدارة تاريخ السريان. لا يدخل نتائج التحاليل ولا يعتمد النتائج النهائية.',
        'default_scope': ScopeType.STATION,
        'resources': {
            'laboratory': ['view', 'edit'],
            'reports': ['view'],
            'quality': ['view', 'add', 'edit'],
            'notifications': ['view'],
        },
    },
    {
        'code': 'CLINIC_DOCTOR',
        'name': 'Clinic Doctor',
        'name_ar': 'طبيب عيادة الحجر الصحي',
        'description': 'إدارة زيارات العيادات وتوثيق السجلات الطبية الإلكترونية وطلبات المختبر والوصفات الطبية للمسافرين المحولين من بوابة الفحص',
        'default_scope': ScopeType.POINT,
        'resources': {
            'clinic': ['view', 'add', 'edit', 'export'],
            'screening': ['view'],
            'travelers': ['view'],
            'laboratory': ['view'],
            'reports': ['view'],
            'notifications': ['view'],
            'vaccination': ['view', 'add', 'edit', 'issue', 'verify'],
        },
    },
    {
        'code': 'NATIONAL_IT_DIRECTOR',
        'name': 'National IT Director',
        'name_ar': 'مدير تقنية المعلومات القومي',
        'description': 'الإشراف القومي على الأنظمة والبنية التحتية والأمن السيبراني والتكاملات الحكومية عبر جميع القطاعات، دون صلاحية تعديل البيانات الصحية أو المالية',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            'it': ['view', 'add', 'edit', 'delete', 'export'],
            'users': ['view', 'add', 'edit'],
            'roles': ['view'],
            'settings': ['view', 'edit'],
            'reports': ['view', 'export'],
            'organization': ['view', 'add', 'edit', 'delete'],
            'notifications': ['view'],
            # إشراف تقني على تكامل WHO: مراقبة + تشغيل الاختبارات + تصدير.
            # بلا `edit`/`sync` (التشغيل والمزامنة لمسؤول التكامل مع WHO)،
            # وبلا أي صلاحيات `ihr_*` الوظيفية (تلك لنقطة الاتصال الوطنية).
            'who_integration': ['view', 'test', 'export'],
            'who_logs': ['view', 'export'],
            # قراءة خريطة الأمراض وICD-11 وتصديرها: الدور يشرف على التكاملات
            # دون أن يعدّل البيانات الصحية، فـ«view» بلا edit/sync.
            'who_diseases': ['view', 'export'],
            'who_mappings': ['view', 'export'],
            'integration': ['view', 'add', 'edit', 'delete', 'test', 'sync', 'verify', 'export'],
            'api_endpoint': ['view', 'add', 'edit', 'delete', 'verify', 'export'],
            'integration_health': ['view', 'run_check'],
            'webhook_subscription': ['view', 'add', 'edit', 'delete'],
            'webhook_delivery': ['view', 'retry'],
            'audit_log': ['view', 'export'],
            'data_scope': ['view', 'add', 'edit', 'delete'],
            'credential': ['view', 'add', 'edit', 'delete', 'rotate'],
        },
    },
    {
        'code': 'IHR_NFP',
        'name': 'National IHR Focal Point',
        'name_ar': 'نقطة الاتصال الوطنية للوائح الصحية الدولية (NFP)',
        'description': 'المرجع الوطني الوحيد المعتمد لدى منظمة الصحة العالمية: استقبال أحداث IHR بعد مراجعة الترصد والتقييم، الاعتماد الوطني، وإخطار منظمة الصحة. دون الصلاحية التقنية للتكامل (test/sync) ودون تعديل إعدادات WHOS. لا يُمنح إلا على المستوى القومي.',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            'ihr_event': ['view', 'add', 'edit', 'export', 'submit', 'assess', 'approve', 'notify', 'close', 'reject'],
            'ihr_risk': ['view', 'add'],
            'ihr_nfp': ['view', 'assign'],
            'ihr_spar': ['view', 'export'],
            'surveillance': ['view', 'export'],
            'risk': ['view', 'add'],
            'reports': ['view', 'export'],
            'who_logs': ['view'],
            'who_diseases': ['view'],
            'who_mappings': ['view', 'review', 'approve', 'reject', 'export'],
            'notifications': ['view'],
            'integration': ['view'],
            'integration_health': ['view'],
            'audit_log': ['view'],
            'organization': ['view'],
        },
    },
    {
        'code': 'WHO_INTEGRATION_OFFICER',
        'name': 'WHO Integration Officer',
        'name_ar': 'مسؤول التكامل مع منظمة الصحة العالمية',
        'description': 'المسؤول التقني لتكامل WHOS: اختبار الاتصال والمزامنة وسجلات التكامل وأمراض ICD-11 ومراقبة أحداث IHR المرسلة. لا يملك الاعتماد الوطني ولا إخطار الجهة المستجيبة ولا تعيين نقطة الاتصال (فصل مهام صارم).',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            'who_integration': ['view', 'edit', 'test', 'sync', 'export'],
            'who_logs': ['view', 'export'],
            'who_diseases': ['view', 'edit', 'sync', 'export'],
            'who_mappings': ['view', 'add', 'edit', 'export', 'search'],
            'ihr_event': ['view'],
            'ihr_spar': ['view'],
            'it': ['view'],
            'reports': ['view'],
            'notifications': ['view'],
            'integration': ['view', 'edit', 'test', 'sync', 'verify'],
            'api_endpoint': ['view', 'edit', 'verify'],
            'integration_health': ['view', 'run_check'],
            'webhook_subscription': ['view', 'add', 'edit'],
            'webhook_delivery': ['view', 'retry'],
            'audit_log': ['view'],
            'data_scope': ['view'],
            'credential': ['view', 'rotate'],
            'organization': ['view'],
        },
    },
    {
        'code': 'CARRIER',
        'name': 'Carrier Representative',
        'name_ar': 'ممثل شركة نقل',
        'description': 'دخول بوابة شركات النقل: إدارة رحلات شركته فقط، والاطلاع على الإشعارات الصحية وإقرارات الاطلاع. الرفع الآلي للكشوف عبر قناة التكامل بمفتاح API، لا عبر هذه الصلاحيات.',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            # CRUD على الرحلات مقصود لممثّل الناقل: خدمة البوابة تتطلب
            # إنشاء رحلة وتحديث حالتها ورفع كشف المسافرين وحذفها.
            # التقييد إلى شركة الناقل نفسه ليس من هذه الصلاحيات، بل من
            # `FlightViewSet`: `get_queryset` يقصر النتائج على
            # `get_portal_carrier(user)`، و`perform_create` يثبّت `carrier`،
            # و`_guard_company` يمنع التعديل على رحلة شركة أخرى.
            # ممنوع `export` حتى لا تُسحب البيانات خارج المنصة.
            'flights': ['view', 'add', 'edit', 'delete'],
        },
    },
    {
        # M8-B.2: مدير شركة نقل — يدير *أعضاء* شركته فقط.
        # لا `flights:*`: الوصول التشغيلي للرحلات يأتي من دور `CARRIER`/العضوية،
        # وفصل الدورين هو ما يمنع اختلاط «إدارة PEOPLE» بـ«إدارة DATA».
        # لا `users:*`/`roles:*`/`permissions:*`/`role_assignments:*` إطلاقاً:
        # `ADMIN_RESOURCES` تجعل أي دور يلمسها دوراً إدارياً، وهذا الدور ليس
        # إدارياً — فلا يستطيع منح دور لنفسه ولا لغيره
        # (`check_grant_capability` يشترط حمل الدور نفسه + نطاق الفاعل).
        # لا `delete`: الإزالة التشغيلية = `deactivate`، والحذف النهائي إداري.
        'code': 'CARRIER_ADMIN',
        'name': 'Carrier Administrator',
        'name_ar': 'مدير شركة نقل',
        'description': 'يدير أعضاء شركة النقل المعيّنة في نطاقه فقط: إنشاء العضوية وتعطيلها وتفعيلها وضبط الممثل الرئيسي. لا يوزّع الأدوار ولا يعدّل الحسابات ولا يدير الرحلات، ولا يُمنح نطاق GLOBAL.',
        'default_scope': ScopeType.COMPANY,
        'resources': {
            'carrier_members': ['view', 'add', 'edit', 'activate', 'deactivate'],
        },
    },
    {
        'code': 'NATIONAL_SURVEILLANCE_OFFICER',
        'name': 'National Surveillance Officer',
        'name_ar': 'مسؤول الترصد الصحي القومي',
        'description': 'المستوى القومي للترصد: متابعة البلاغات من القطاعات والمنافذ، تقييم المخاطر، والتوصية بالتصعيد إلى نقطة الاتصال الوطنية. لا يعتمد ولا يُخطِر منظمة الصحة ولا يدير تكامل WHO.',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            'surveillance': ['view', 'add', 'edit', 'export'],
            'ihr_event': ['view', 'add', 'edit', 'submit', 'assess'],
            'ihr_risk': ['view', 'add'],
            'ihr_spar': ['view', 'add', 'edit'],
            'risk': ['view', 'add'],
            'emergency': ['view'],
            'reports': ['view', 'export'],
            'notifications': ['view'],
            # قراءة الرحلات للتنسيق القومي مع المنافذ والبلدان.
            'flights': ['view'],
            'integration': ['view'],
            'integration_health': ['view'],
            'audit_log': ['view'],
            'webhook_delivery': ['view'],
        },
    },
    {
        'code': 'SECTOR_IHR_OFFICER',
        'name': 'Sector IHR Officer',
        'name_ar': 'مسؤول اللوائح الصحية الدولية بالقطاع',
        'description': 'تجمع بلاغات المنافذ ضمن قطاعه، يقيّم المخاطر المبدئي ويرفع الأحداث للمراجعة الوطنية. لا يعتمد ولا يُخطِر منظمة الصحة ولا يطّلع على تكامل WHOS (نطاق قطاعي فقط).',
        'default_scope': ScopeType.SECTOR,
        'resources': {
            'surveillance': ['view', 'add', 'edit', 'export'],
            'ihr_event': ['view', 'add', 'edit', 'submit', 'assess'],
            'ihr_risk': ['view', 'add'],
            'risk': ['view', 'add'],
            'reports': ['view'],
            'notifications': ['view'],
            # قراءة الرحلات للتواصل والتنسيق عبر المنافذ.
            'flights': ['view'],
        },
    },
    {
        'code': 'POE_HEALTH_OFFICER',
        'name': 'Point of Entry Health Officer',
        'name_ar': 'مسؤول الصحة بمنفذ الدخول',
        'description': 'المستوى الميداني: تسجيل الحالات المشتبهة والفحص الصحي بالمنفذ وإنشاء أحداث IHR (مسودة فقط). لا يرفع للمراجعة الوطنية ولا يعتمد ولا يطّلع على تكامل WHO. يُمنح على نطاق منفذ واحد.',
        'default_scope': ScopeType.POINT,
        'resources': {
            'screening': ['view', 'add', 'edit'],
            'clinic': ['view'],
            'ihr_event': ['view', 'add', 'edit'],
            'ihr_risk': ['view', 'add'],
            'risk': ['view', 'add'],
            'reports': ['view'],
            'notifications': ['view'],
            # وصول اللقاء والإحوال عبر منفذ الدخول.
            'flights': ['view'],
        },
    },
    {
        'code': 'VACCINATION_MANAGER',
        'name': 'National Vaccination Manager',
        'name_ar': 'مدير التطعيم الدولي القومي',
        'description': 'الإدارة الكاملة لمنظومة التطعيم الدولي: اللقاحات والتشغيلات والمخزون والعيادات وقواعد التقييم والإصدار والتحقق والتقارير على المستوى القومي.',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            'vaccination': ['view', 'add', 'edit', 'delete', 'export', 'issue', 'verify'],
            'travelers': ['view', 'export'],
            'reports': ['view', 'export'],
            'notifications': ['view'],
        },
    },
    {
        'code': 'VACCINATION_OFFICER',
        'name': 'Vaccination Officer',
        'name_ar': 'مسؤول التطعيم',
        'description': 'تسجيل المسافرين وإعطاء الجرعات وإصدار الشهادات وإجراء التحقق — داخل عيادة أو نقطة تطعيم تابعة لمنفذ (نطاق منفذ).',
        'default_scope': ScopeType.POINT,
        'resources': {
            'vaccination': ['view', 'add', 'edit', 'issue', 'verify'],
            'travelers': ['view'],
            'reports': ['view'],
            'notifications': ['view'],
        },
    },
    {
        'code': 'HR_MANAGER',
        'name': 'National HR Manager',
        'name_ar': 'مدير الموارد البشرية القومي',
        'description': 'الإدارة الكاملة لملفات الموظفين والبيانات التأسيسية والنقل والحضور والإجازات والتدريب والتقييم والوثائق ومسير الرواتب على المستوى القومي. بلا صلاحيات الاعتماد أو الصرف (فصل المهام): الاعتماد والصرف لدور HR_APPROVER.',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            'hr_employee': ['view', 'add', 'edit', 'delete', 'export'],
            'hr_establishment': ['view', 'add', 'edit', 'delete', 'export'],
            'hr_posting': ['view', 'add', 'edit', 'delete', 'export'],
            'hr_attendance': ['view', 'add', 'edit', 'delete', 'export'],
            'hr_leave': ['view', 'add', 'edit', 'delete', 'export'],
            'hr_training': ['view', 'add', 'edit', 'delete', 'export'],
            'hr_performance': ['view', 'add', 'edit', 'delete', 'export'],
            'hr_payroll': ['view', 'add', 'edit', 'delete', 'export', 'run'],
            'hr_document': ['view', 'add', 'edit', 'delete', 'export'],
            'hr_dashboard': ['view', 'export'],
            'users': ['view'],
            'organization': ['view', 'export'],
            'reports': ['view', 'export'],
            'notifications': ['view'],
        },
    },
    {
        'code': 'HR_SPECIALIST',
        'name': 'HR Specialist',
        'name_ar': 'أخصائي موارد بشرية',
        'description': 'يدخل بيانات الموظفين والنقل والحضور والإجازات والتدريب والوثائق داخل نطاق إداري واحد (قطاع أو إدارة). بلا حذف وبلا اعتماد.',
        'default_scope': ScopeType.DEPARTMENT,
        'resources': {
            'hr_employee': ['view', 'add', 'edit', 'export'],
            'hr_establishment': ['view', 'add', 'edit', 'export'],
            'hr_posting': ['view', 'add', 'edit', 'export'],
            'hr_attendance': ['view', 'add', 'edit', 'export'],
            'hr_leave': ['view', 'add', 'edit', 'export'],
            'hr_training': ['view', 'add', 'edit', 'export'],
            'hr_performance': ['view', 'add', 'edit', 'export'],
            'hr_document': ['view', 'add', 'edit', 'export'],
            'hr_dashboard': ['view'],
            'reports': ['view'],
        },
    },
    {
        'code': 'SHIPPING_COMPANY',
        'name': 'Shipping Company Representative',
        'name_ar': 'ممثل شركة ملاحة',
        'description': 'ممثل شركة ملاحية — يدير سفن الشركة ووكلاءها، ويقدم الإخطارات المسبقة، ويدير زيارات السفن.',
        'default_scope': ScopeType.COMPANY,
        'resources': {
            'shipping_companies': ['view', 'edit'],
            'shipping_agents': ['view', 'add', 'edit'],
            'pre_arrivals': ['view', 'add', 'edit', 'delete'],
            'clearance_decisions': ['view'],
            'vessel_company_relationships': ['view', 'add', 'edit'],
            'vessels': ['view', 'add', 'edit'],
            'vessel_visits': ['view', 'add', 'edit'],
            'shipping_audit_logs': ['view'],
            'port_health': ['view'],
            'ports': ['view'],
        },
    },
    {
        'code': 'SHIPPING_AGENT',
        'name': 'Shipping Agent',
        'name_ar': 'وكيل ملاحي',
        'description': 'وكيل ملاحي معتمد — يمثل شركة ملاحية في ميناء محدد، يقدم الإخطارات ويدير إجراءات السفينة.',
        'default_scope': ScopeType.COMPANY,
        'resources': {
            'shipping_agents': ['view', 'edit'],
            'pre_arrivals': ['view', 'add'],
            'clearance_decisions': ['view'],
            'vessels': ['view'],
            'vessel_visits': ['view', 'add', 'edit'],
            'port_health': ['view'],
            'ports': ['view'],
        },
    },
    {
        'code': 'HR_APPROVER',
        'name': 'HR Approver',
        'name_ar': 'معتمد الموارد البشرية',
        'description': 'اعتماد الطلبات والمسيرات فقط: النقل والإجازات والحضور والملف الوظيفي والبيانات التأسيسية، واعتماد مسير الرواتب وصرفه. لا يُمنح صلاحيات الإدخال أو التعديل، لفصل مُنشئ الطلب عن المعتمد.',
        'default_scope': ScopeType.GLOBAL,
        'resources': {
            'hr_employee': ['view', 'approve'],
            'hr_establishment': ['view', 'approve'],
            'hr_posting': ['view', 'approve', 'reject'],
            'hr_attendance': ['view', 'approve'],
            'hr_leave': ['view', 'approve', 'reject'],
            'hr_training': ['view', 'approve'],
            'hr_performance': ['view', 'approve'],
            'hr_payroll': ['view', 'approve', 'pay'],
            'hr_document': ['view', 'approve'],
            'hr_dashboard': ['view', 'export'],
        },
    },
]


def resolve_permission_codes(resources) -> list[str]:
    if resources == ALL_RESOURCES:
        codes = []
        for res in ALL_RESOURCES:
            codes += [f'{res}:{act}' for act in ACTIONS]
            codes += [f'{res}:{act}' for act in EXTRA_ACTIONS.get(res, {})]
        return codes
    return [f'{res}:{action}' for res, actions in resources.items() for action in actions]


class Command(BaseCommand):
    help = 'بذر الصلاحيات والأدوار الافتراضية لنظام الصلاحيات (RBAC)'

    def handle(self, *args, **options):
        created_perms = 0
        updated_perms = 0
        for resource, resource_ar in RESOURCES.items():
            actions = {**ACTIONS, **EXTRA_ACTIONS.get(resource, {})}
            actions = {
                action: label
                for action, label in actions.items()
                if action not in PERMISSION_EXCLUSIONS.get(resource, set())
            }
            for action, action_ar in actions.items():
                code = f'{resource}:{action}'
                _, created = Permission.objects.update_or_create(
                    code=code,
                    defaults={
                        'name': f'{action_ar} {resource_ar}',
                        'resource': resource,
                        'action': action,
                    },
                )
                if created:
                    created_perms += 1
                else:
                    updated_perms += 1

        created_roles = 0
        updated_roles = 0
        for role_def in ROLES:
            role, created = Role.objects.update_or_create(
                code=role_def['code'],
                defaults={
                    'name': role_def['name'],
                    'name_ar': role_def['name_ar'],
                    'description': role_def.get('description', ''),
                    'default_scope': role_def['default_scope'],
                },
            )
            codes = resolve_permission_codes(role_def['resources'])
            role.permissions.set(Permission.objects.filter(code__in=codes))
            if created:
                created_roles += 1
            else:
                updated_roles += 1

        created_assignments = 0
        admin_role = Role.objects.filter(code='ADMIN').first()
        if admin_role:
            for user in User.objects.filter(is_staff=True, is_active=True):
                _, created = RoleAssignment.objects.get_or_create(
                    user=user,
                    role=admin_role,
                    scope_type=ScopeType.GLOBAL,
                    defaults={
                        'is_active': True,
                        'assigned_by': user,
                    },
                )
                if created:
                    created_assignments += 1

        total_perms = 0
        for res in RESOURCES:
            actions = {**ACTIONS, **EXTRA_ACTIONS.get(res, {})}
            actions = {
                action: label
                for action, label in actions.items()
                if action not in PERMISSION_EXCLUSIONS.get(res, set())
            }
            total_perms += len(actions)
        self.stdout.write(
            self.style.SUCCESS(
                f'تم البذر بنجاح: {total_perms} صلاحية '
                f'({created_perms} جديدة، {updated_perms} محدثة) و {len(ROLES)} دور '
                f'({created_roles} جديدة، {updated_roles} محدثة) '
                f'و {created_assignments} تعيين دور جديد'
            )
        )