/**
 * بيانات توضيحية لصفحة مدير رقابة الأغذية (Food Director).
 * تُستخدم لعرض لوحة تجريبية — تُستبدل لاحقاً ببيانات حقيقية من API.
 */

export type OperationsPeriod = 'DAY' | 'WEEK' | 'MONTH';

export const OPERATIONS_LABELS: Record<OperationsPeriod, string[]> = {
  DAY: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
  WEEK: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
  MONTH: ['أسبوع 1', 'أسبوع 2', 'أسبوع 3', 'أسبوع 4'],
};

export const OPERATIONS_SERIES: Record<
  OperationsPeriod,
  { requests: number[]; inspections: number[]; samples: number[]; labResults: number[]; decisions: number[] }
> = {
  DAY: { requests: [12, 28, 42, 55, 48, 39, 22], inspections: [8, 18, 30, 41, 36, 28, 15], samples: [3, 9, 14, 20, 17, 12, 6], labResults: [1, 5, 9, 12, 10, 7, 3], decisions: [2, 6, 11, 15, 12, 8, 4] },
  WEEK: { requests: [96, 118, 132, 121, 144, 138, 110], inspections: [72, 90, 101, 95, 112, 104, 82], samples: [31, 44, 52, 47, 61, 55, 36], labResults: [18, 26, 31, 28, 40, 33, 21], decisions: [22, 33, 38, 35, 47, 40, 26] },
  MONTH: { requests: [780, 960, 1120, 1180], inspections: [600, 740, 860, 905], samples: [260, 340, 410, 445], labResults: [160, 210, 260, 290], decisions: [190, 250, 300, 325] },
};

export const REVENUE_BY_STATION = [
  { station: 'بورتسودان', value: 12.4 },
  { station: 'أوسيف', value: 9.8 },
  { station: 'الشمالية', value: 6.2 },
  { station: 'الجنوبية', value: 5.1 },
  { station: 'مطار الخرطوم', value: 4.7 },
];

export const REVENUE_BY_SERVICE = [
  { service: 'رسوم فسح', value: 18.6 },
  { service: 'فحوص مخبرية', value: 9.2 },
  { service: 'شهادات', value: 5.4 },
  { service: 'أخرى', value: 3.5 },
];

export const REVENUE_TREND = { daily: [16.2, 18.1, 17.4, 20.9, 19.5, 22.3] };

export const LAB_METRICS = [
  { label: 'عينات قيد التحليل', value: '34' },
  { label: 'جاهزة للنتائج', value: '18' },
  { label: 'منجزة هذا الأسبوع', value: '112' },
  { label: 'تحتاج إعادة فحص', value: '6' },
];

export const LAB_TESTS = [
  { category: 'أفلاتوكسين', rate: 92, tone: '#1d7a54' },
  { category: 'المعمل الكيميائي', rate: 86, tone: '#2f6dd0' },
  { category: 'الفساد الميكروبي', rate: 78, tone: '#a86400' },
  { category: 'المعادن الثقيلة', rate: 95, tone: '#1d7a54' },
];

export const REJECTION_BARS: Record<string, number[]> = {
  category: [18, 12, 9, 7, 4],
  product: [9, 8, 7, 6, 5],
  origin: [14, 11, 9, 8, 5],
  supplier: [12, 10, 8, 6, 3],
  station: [10, 9, 8, 7, 6],
  reason: [16, 13, 11, 6, 4],
};

export const REJECTION_BY = [
  { key: 'category', label: 'الفئة' },
  { key: 'product', label: 'المنتج' },
  { key: 'origin', label: 'المنشأ' },
  { key: 'supplier', label: 'المورد' },
  { key: 'station', label: 'المحطة' },
  { key: 'reason', label: 'السبب' },
];

export const REJECTION_RANK = [
  { name: 'أرز — المورد المتحدة', cause: 'أفلاتوكسين', by: 'منشأ آسيوي', rate: 16 },
  { name: 'قمح — المورد النيل', cause: 'رطوبة مرتفعة', by: 'منشأ أوروبي', rate: 13 },
  { name: 'جلوكوز — المورد البركة', cause: 'تلوث ميكروبي', by: 'تخزين سيء', rate: 11 },
];

export const DECISIONS = [
  { topic: 'رفض متكرر للأرز الآسيوي', finding: 'ثلاث شحنات أُوقفت هذا الشهر بسبب الأفلاتوكسين.', cause: 'متوسط × منشأ عالي المخاطر', recommendation: 'تشديد فحص المنشأ مع تفعيل العينات 100%.' },
  { topic: 'تأخير نتائج معمل عمره 48 ساعة', finding: 'قسم الكيمياء متأخر في 34 عينة عن SLA.', cause: 'نقص كواشف + جهاز مطياف خارج الخدمة', recommendation: 'ترتيب أولوية الأدوات الحرجة وتدبير الكواشف.' },
  { topic: 'ارتفاع إيرادات الرسوم 9%', finding: 'الفترة الحالية أفضل من السابقة رغم الركود.', cause: 'تشديد التحصيل + توسعة نافذة الفسح', recommendation: 'إبقاء السياسة وتعميمها على باقي المحطات.' },
];

export const STATION_USERS = [
  { name: 'خالد إبراهيم', role: 'رئيس محطة', station: 'أوسيف', lastActive: 'قبل 5 دقائق', status: 'نشط' },
  { name: 'منى عبدالله', role: 'مفتشة', station: 'الجنوبية', lastActive: 'قبل 22 دقيقة', status: 'نشط' },
  { name: 'سارة محمد', role: 'كاتبة إدخال', station: 'الشمالية', lastActive: 'قبل ساعة', status: 'نشط' },
  { name: 'عمر حسن', role: 'مفتش', station: 'بورتسودان', lastActive: 'أمس', status: 'موقوف' },
];

export const PERMISSIONS = {
  allowed: [
    'عرض لوحات المؤشرات والتحليلات',
    'مراجعة تقارير العمليات والمعمل',
    'اعتماد إجراءات إدارية (تعليمات/إيقاف)',
    'تفويض رؤساء المحطات',
  ],
  denied: [
    'إنشاء/تعديل الشحنات والعينات',
    'إدخال نتائج المختبر',
    'تعديل التعريفة المالية',
    'إدارة مستخدمي القطاعات الأخرى',
  ],
};

export const ACTIVITY_LOG = [
  { time: '10:42', action: 'اعتماد إجراء إيقاف شحنة سمسم', actor: 'مدير رقابة الأغذية', tone: 'warning' },
  { time: '09:17', action: 'تعيين صلاحيات رئيس محطة أوسيف', actor: 'مدير رقابة الأغذية', tone: 'success' },
  { time: '08:55', action: 'مراجعة تقرير الأداء الأسبوعي', actor: 'مدير رقابة الأغذية', tone: 'info' },
  { time: '08:10', action: 'دخول إلى النظام', actor: 'مدير رقابة الأغذية', tone: 'primary' },
];

export type StationStatus = 'Excellent' | 'Attention' | 'Critical';

export const STATION_ROWS: { station: string; requests: number; sla: number; rejection: number; performance: number; status: StationStatus }[] = [
  { station: 'بورتسودان', requests: 144, sla: 93, rejection: 4.2, performance: 91, status: 'Excellent' },
  { station: 'أوسيف', requests: 128, sla: 88, rejection: 6.8, performance: 84, status: 'Attention' },
  { station: 'الشمالية', requests: 112, sla: 90, rejection: 3.6, performance: 88, status: 'Excellent' },
  { station: 'الجنوبية', requests: 97, sla: 82, rejection: 9.1, performance: 76, status: 'Attention' },
  { station: 'مطار الخرطوم', requests: 76, sla: 71, rejection: 12.4, performance: 64, status: 'Critical' },
];

export const STATION_STATUS_META: Record<StationStatus, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  Excellent: { label: 'ممتاز', tone: 'success' },
  Attention: { label: 'انتباه', tone: 'warning' },
  Critical: { label: 'حرج', tone: 'error' },
};

export const SLA_STAGES: { key: string; stage: string; avgHours: number; isBottleneck: boolean; tone: 'success' | 'warning'; note: string }[] = [
  { key: 'register', stage: 'تسجيل الشحنة', avgHours: 2, isBottleneck: false, tone: 'success', note: 'ضمن المعيار' },
  { key: 'insp', stage: 'التفتيش وجمع العينات', avgHours: 8, isBottleneck: false, tone: 'success', note: 'ضمن المعيار' },
  { key: 'lab', stage: 'التحليل المخبري', avgHours: 38, isBottleneck: true, tone: 'warning', note: 'أطول مرحلة — 78% من زمن SLA' },
  { key: 'result', stage: 'إصدار النتيجة والقرار', avgHours: 12, isBottleneck: false, tone: 'success', note: 'ضمن المعيار' },
];

export type AlertSeverity = 'critical' | 'warning' | 'attention';

export const ALERTS: { severity: AlertSeverity; title: string; body: string }[] = [
  { severity: 'critical', title: 'ارتفاع نسبة الرفض بالمطار', body: 'مطار الخرطوم تجاوز حد الرفض الآمن 12.4% هذا الأسبوع.' },
  { severity: 'warning', title: 'تأخير معمل الكيمياء', body: '34 عينة تجاوزت SLA — النقص في الكواشف الحرجية.' },
  { severity: 'attention', title: 'مزامنة بطيئة مع الجمارك', body: 'تأخر مزامنة بيانات الشحنات بواجهة الجمارك منذ 40 دقيقة.' },
];