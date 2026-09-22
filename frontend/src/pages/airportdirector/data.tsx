import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import GroupsIcon from '@mui/icons-material/Groups';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BiotechIcon from '@mui/icons-material/Biotech';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PaidIcon from '@mui/icons-material/Paid';

export interface Kpi {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent: string;
  trend?: { label: string; positive?: boolean };
}

export const PERIOD_KPIS: Record<'DAY' | 'WEEK' | 'MONTH', Kpi[]> = {
  DAY: [
    { icon: <FlightLandIcon />, value: '64', label: 'رحلات واصلة (اليوم)', accent: 'primary.main', trend: { label: '↑ 6.2%', positive: true } },
    { icon: <FlightTakeoffIcon />, value: '57', label: 'رحلات مغادرة', accent: 'warning.main' },
    { icon: <GroupsIcon />, value: '8,420', label: 'مسافرون فُحصوا', accent: 'info.main', trend: { label: '↑ 4.8%', positive: true } },
    { icon: <WarningAmberIcon />, value: '12', label: 'حالات مشتبهة', accent: 'error.main', trend: { label: '⚠ 0.14%', positive: false } },
    { icon: <BiotechIcon />, value: '86', label: 'عينات المختبر', accent: 'success.main' },
    { icon: <PaidIcon />, value: '1.84M SDG', label: 'الإيرادات اليومية', accent: 'secondary.main', trend: { label: '↑ 9.3%', positive: true } },
  ],
  WEEK: [
    { icon: <FlightLandIcon />, value: '431', label: 'رحلات واصلة (الأسبوع)', accent: 'primary.main', trend: { label: '↑ 3.9%', positive: true } },
    { icon: <FlightTakeoffIcon />, value: '402', label: 'رحلات مغادرة', accent: 'warning.main' },
    { icon: <GroupsIcon />, value: '56,180', label: 'مسافرون فُحصوا', accent: 'info.main', trend: { label: '↑ 5.1%', positive: true } },
    { icon: <WarningAmberIcon />, value: '83', label: 'حالات مشتبهة', accent: 'error.main', trend: { label: '⚠ 0.15%', positive: false } },
    { icon: <BiotechIcon />, value: '562', label: 'عينات المختبر', accent: 'success.main' },
    { icon: <PaidIcon />, value: '12.6M SDG', label: 'الإيرادات', accent: 'secondary.main', trend: { label: '↑ 7.7%', positive: true } },
  ],
  MONTH: [
    { icon: <FlightLandIcon />, value: '1,872', label: 'رحلات واصلة (الشهر)', accent: 'primary.main', trend: { label: '↑ 8.4%', positive: true } },
    { icon: <FlightTakeoffIcon />, value: '1,744', label: 'رحلات مغادرة', accent: 'warning.main' },
    { icon: <GroupsIcon />, value: '238,400', label: 'مسافرون فُحصوا', accent: 'info.main' },
    { icon: <WarningAmberIcon />, value: '346', label: 'حالات مشتبهة', accent: 'error.main' },
    { icon: <BiotechIcon />, value: '6.81K', label: 'عينات المختبر', accent: 'success.main' },
    { icon: <PaidIcon />, value: '51.2M SDG', label: 'الإيرادات', accent: 'secondary.main', trend: { label: '↑ 12%', positive: true } },
  ],
};

/* مؤشرات العمليات — وصول / مغادرة / فحص / عينات / قرارات */
export const OPERATIONS_LABELS: Record<'DAY' | 'WEEK' | 'MONTH', string[]> = {
  DAY: ['06ص', '09ص', '12م', '03م', '06م', '09م'],
  WEEK: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
  MONTH: ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'],
};

export const OPERATIONS_SERIES: Record<'DAY' | 'WEEK' | 'MONTH', { arrivals: number[]; departures: number[]; screened: number[]; samples: number[]; cleared: number[] }> = {
  DAY: {
    arrivals: [6, 11, 14, 12, 10, 8],
    departures: [5, 10, 12, 11, 9, 8],
    screened: [520, 1410, 1890, 1730, 1280, 860],
    samples: [4, 18, 24, 22, 12, 6],
    cleared: [480, 1280, 1710, 1580, 1150, 790],
  },
  WEEK: {
    arrivals: [58, 66, 71, 63, 68, 61, 44],
    departures: [54, 62, 66, 59, 63, 57, 41],
    screened: [7620, 8320, 8840, 7960, 8450, 8020, 7970],
    samples: [71, 88, 96, 78, 101, 74, 54],
    cleared: [7080, 7710, 8120, 7360, 7830, 7470, 7460],
  },
  MONTH: {
    arrivals: [442, 468, 489, 473],
    departures: [408, 438, 451, 447],
    screened: [55200, 60100, 62600, 60500],
    samples: [480, 564, 590, 601],
    cleared: [51600, 56000, 58300, 57100],
  },
};

/* لوحة الرحلات */
export interface Flight {
  flight: string;
  route: string;
  type: 'arrival' | 'departure';
  airline: string;
  passengers: number;
  time: string;
  status: 'CLEARED' | 'CHECKING' | 'SUSPECTED';
}

export const FLIGHTS: Flight[] = [
  { flight: 'SD-412', route: 'جدة — الخرطوم', type: 'arrival', airline: 'السودانية', passengers: 164, time: '14:20', status: 'CHECKING' },
  { flight: 'QR-631', route: 'الدوحة — الخرطوم', type: 'arrival', airline: 'القطرية', passengers: 231, time: '14:05', status: 'CLEARED' },
  { flight: 'ET-438', route: 'الخرطوم — أديس أبابا', type: 'departure', airline: 'الإثيوبية', passengers: 198, time: '15:10', status: 'CHECKING' },
  { flight: 'TK-577', route: 'إسطنبول — الخرطوم', type: 'arrival', airline: 'التركية', passengers: 212, time: '15:45', status: 'SUSPECTED' },
  { flight: 'SD-208', route: 'الخرطوم — بورتسودان', type: 'departure', airline: 'السودانية', passengers: 86, time: '16:00', status: 'CLEARED' },
  { flight: 'MS-842', route: 'الخرطوم — القاهرة', type: 'departure', airline: 'مصر للطيران', passengers: 142, time: '16:30', status: 'CHECKING' },
];

/* فحص المسافرين */
export const SCREENING_META = {
  screened: 8_420,
  suspected: 12,
  quarantine: 3,
  referred: 8,
};

export const SCREENING_CHART = {
  labels: ['06ص', '09ص', '12م', '03م', '06م', '09م'],
  screened: [520, 1410, 1890, 1730, 1280, 860],
  referred: [2, 6, 9, 8, 6, 3],
};

/* الشحن الجوي الغذائي */
export const CARGO = {
  importPallets: 128,
  exportPallets: 74,
  foodDocs: 86,
  samples: 32,
  topGoods: [
    ['مواد غذائية معلبة', '46'],
    ['لحوم ودواجن مبردة', '28'],
    ['منتجات ألبان', '21'],
    ['فواكه وخضار', '33'],
  ],
};

/* أداء المختبر بالمطار */
export const LAB_METRICS = [
  { label: 'عينات مستلمة', value: '86' },
  { label: 'نتائج مكتملة', value: '74' },
  { label: 'قيد الإنجاز', value: '12' },
  { label: 'متوسط زمن التحليل', value: '14 ساعة' },
  { label: 'الالتزام بـ SLA', value: '94%' },
];

/* التنبيهات */
export interface AlertItem {
  severity: 'critical' | 'warning' | 'attention';
  title: string;
  body: string;
}

export const ALERTS: AlertItem[] = [
  { severity: 'critical', title: 'رحلة TK-577', body: 'حالتان مشتبهتان بأعراض حمى — تم عزلهما في منطقة الحجر بالمطار.' },
  { severity: 'warning', title: 'طاقم طائرة', body: 'رحلة من إسطنبول سجّل عضو طاقم إجازة مرضية — طلب فحص إضافي.' },
  { severity: 'attention', title: 'الشحن الجوي', body: 'ارتفاع طفيف في عينات الأغذية المرفوضة بنسبة 3.1% هذا الأسبوع.' },
];

/* دعم القرار */
export const DECISIONS = [
  {
    topic: 'حالات رحلة إسطنبول',
    finding: 'رصد حالتين مشتبهتين على رحلة TK-577 خلال 24 ساعة الماضية.',
    cause: 'السبب المحتمل: انتقاء عينة عشوائية أصغر من المعتاد أثناء تفتيش الطائرة.',
    recommendation: 'التوصية: تشديد الفحص الحراري لمسافري المنشأ وتفعيل تتبع المخالطين.',
  },
  {
    topic: 'زمن استجابة المختبر',
    finding: 'متوسط زمن تحليل العينات 14 ساعة — جيد لكنه يتذبذب خلال ساعات الذروة.',
    cause: 'السبب المحتمل: ازدحام فحص عينات الأغذية والشحن في نفس الفترة.',
    recommendation: 'التوصية: توزيع مناوبات المعمل لتغطية ساعات الذروة.',
  },
  {
    topic: 'مدارج الشحن الجوي',
    finding: 'زيادة الشحنات الغذائية المبردة بنسبة 18% مقارنة بالشهر الماضي.',
    cause: 'السبب المحتمل: نمو الصادرات الزراعية واللحوم.',
    recommendation: 'التوصية: تقييم قدرة وحدات التبريد والتفتيش على مواكبة النمو.',
  },
];

/* المصطلحات / المواقع داخل المطار */
export const TERMINALS = [
  { name: 'المبنى الرئيسي', screened: 4_120, sla: 96, bottleneck: 'لا' },
  { name: 'المبنى الدولي', screened: 3_480, sla: 93, bottleneck: 'لا' },
  { name: 'الشحن الجوي', screened: 620, sla: 84, bottleneck: 'نعم' },
  { name: 'ركاب الترانزيت', screened: 200, sla: 91, bottleneck: 'لا' },
];

/* المستخدمون (موظفو المطار) */
export interface AirportUser {
  name: string;
  role: string;
  area: string;
  status: 'نشط' | 'موقوف';
  lastActive: string;
}

export const AIRPORT_USERS: AirportUser[] = [
  { name: 'عمر خليل', role: 'رئيس مفتشين', area: 'المبنى الدولي', status: 'نشط', lastActive: 'قبل 4 د' },
  { name: 'نهلة يوسف', role: 'مفتش صحة مطار', area: 'الشحن الجوي', status: 'نشط', lastActive: 'قبل 15 د' },
  { name: 'ياسر محمد', role: 'فني مختبر', area: 'معمل المطار', status: 'نشط', lastActive: 'قبل 30 د' },
  { name: 'منى عثمان', role: 'كاتب إدخال', area: 'المبنى الرئيسي', status: 'نشط', lastActive: 'قبل 2 س' },
  { name: 'خالد أحمد', role: 'رئيس مناوبة', area: 'المبنى الدولي', status: 'موقوف', lastActive: '—' },
];

/* سجل الأنشطة */
export const ACTIVITY_LOG = [
  { time: '13:40', action: 'اعتماد فسح رحلة الشحن الجوي', actor: 'مديرة الحجر الصحي بالمطار', tone: 'success' },
  { time: '12:55', action: 'رفع حالة العزل للحجر الصحي', actor: 'مديرة الحجر الصحي بالمطار', tone: 'info' },
  { time: '12:10', action: 'تصدير التقرير اليومي (PDF)', actor: 'مديرة الحجر الصحي بالمطار', tone: 'primary' },
  { time: '11:32', action: 'تعديل مناوبة مفتشي المبنى الدولي', actor: 'مديرة الحجر الصحي بالمطار', tone: 'warning' },
  { time: '10:05', action: 'متابعة نتائج عينات الأغذية', actor: 'مديرة الحجر الصحي بالمطار', tone: 'success' },
];

/* المصفوفة */
export const PERMISSIONS = {
  allowed: [
    'عرض التقارير اليومية / الأسبوعية / الشهرية',
    'متابعة فحص الرحلات والمسافرين',
    'متابعة أداء المختبر بالمطار',
    'إدارة موظفي المطار (إضافة / تعديل / إيقاف)',
    'الموافقة الاستثنائية',
    'تصدير التقارير (PDF / Excel)',
    'عرض سجلات التدقيق',
  ],
  denied: [
    'أخذ العينات الشخصية للمسافرين',
    'إصدار أوامر تفتيش رحلات',
    'تعديل نتائج المختبر',
    'القرار التشخيصي النهائي للمسافرين',
    'تعديل إعدادات النظام العامة',
  ],
};

export const REVENUE_BY_AREA = [
  { area: 'رسوم الفحص الصحي', value: 0.86 },
  { area: 'شهادات الأغذية', value: 0.42 },
  { area: 'فسح الشحن الجوي', value: 0.34 },
  { area: 'أخرى', value: 0.22 },
];

export const REVENUE_TREND = {
  daily: [1.32, 1.51, 1.44, 1.68, 1.6, 1.84],
  previous: [1.21, 1.38, 1.3, 1.52, 1.47, 1.66],
};