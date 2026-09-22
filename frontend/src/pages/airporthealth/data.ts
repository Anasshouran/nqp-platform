import type { HealthStatus, RiskKey } from './shared';

export interface Flight {
  id: string;
  flightNo: string;
  airline: string;
  origin: string;
  destination: string;
  arrival: string;
  departs: string;
  passengers: number;
  risk: RiskKey;
  status: HealthStatus;
  aircraft: string;
  crewCount: number;
}

export const FLIGHTS: Flight[] = [
  { id: 'f1', flightNo: 'SD-412', airline: 'السودانية', origin: 'جدة', destination: 'الخرطوم', arrival: '14:20', departs: '19:05', passengers: 164, risk: 'LOW', status: 'SCREENING', aircraft: 'ST-ADP', crewCount: 11 },
  { id: 'f2', flightNo: 'QR-631', airline: 'القطرية', origin: 'الدوحة', destination: 'الخرطوم', arrival: '14:05', departs: '17:40', passengers: 231, risk: 'LOW', status: 'CLEARED', aircraft: 'A7-BAH', crewCount: 14 },
  { id: 'f3', flightNo: 'ET-438', airline: 'الإثيوبية', origin: 'الخرطوم', destination: 'أديس أبابا', arrival: '16:05', departs: '15:10', passengers: 198, risk: 'LOW', status: 'SCREENING', aircraft: 'ET-ALP', crewCount: 12 },
  { id: 'f4', flightNo: 'TK-577', airline: 'التركية', origin: 'إسطنبول', destination: 'الخرطوم', arrival: '15:45', departs: '20:10', passengers: 212, risk: 'HIGH', status: 'ALERT', aircraft: 'TC-JRM', crewCount: 15 },
  { id: 'f5', flightNo: 'MS-842', airline: 'مصر للطيران', origin: 'الخرطوم', destination: 'القاهرة', arrival: '16:30', departs: '16:30', passengers: 142, risk: 'LOW', status: 'SECONDARY', aircraft: 'SU-GCR', crewCount: 10 },
  { id: 'f6', flightNo: 'SD-208', airline: 'السودانية', origin: 'الخرطوم', destination: 'بورتسودان', arrival: '22:10', departs: '16:00', passengers: 86, risk: 'MEDIUM', status: 'MEDICAL_ASSESSMENT', aircraft: 'ST-ACP', crewCount: 8 },
  { id: 'f7', flightNo: 'TK-578', airline: 'التركية', origin: 'الخرطوم', destination: 'إسطنبول', arrival: '21:15', departs: '17:20', passengers: 176, risk: 'LOW', status: 'HOLD', aircraft: 'TC-JLB', crewCount: 13 },
];

export interface Passenger {
  id: string;
  name: string;
  passport: string;
  nationality: string;
  flight: string;
  seat: string;
  origin: string;
  destination: string;
  arrival: string;
  temperature: string;
  symptoms: string[];
  exposure: boolean;
  travelHistory: string[];
  vaccinated: boolean;
  declaredRisk: boolean;
  score: number;
  risk: RiskKey;
  status: HealthStatus;
}

export const PASSENGERS: Passenger[] = [
  { id: 'p1', name: 'محمد الحسن عوض', passport: 'SD-118400', nationality: 'سوداني', flight: 'TK-577', seat: '14B', origin: 'إسطنبول', destination: 'الخرطوم', arrival: '15:45', temperature: '38.6°', symptoms: ['حمى', 'سعال'], exposure: true, travelHistory: ['إسطنبول', 'ملقا'], vaccinated: false, declaredRisk: false, score: 68, risk: 'HIGH', status: 'MEDICAL_ASSESSMENT' },
  { id: 'p2', name: 'فاطمة عبد الرحمن', passport: 'SD-209311', nationality: 'سودانية', flight: 'QR-631', seat: '22A', origin: 'الدوحة', destination: 'الخرطوم', arrival: '14:05', temperature: '36.9°', symptoms: [], exposure: false, travelHistory: ['الدوحة'], vaccinated: true, declaredRisk: false, score: 8, risk: 'LOW', status: 'CLEARED' },
  { id: 'p3', name: 'أحمد إبراهيم صالح', passport: 'EG-77122', nationality: 'مصري', flight: 'MS-842', seat: '9C', origin: 'القاهرة', destination: 'الخرطوم', arrival: '16:30', temperature: '37.2°', symptoms: ['صداع'], exposure: false, travelHistory: ['القاهرة'], vaccinated: true, declaredRisk: true, score: 34, risk: 'MEDIUM', status: 'SECONDARY' },
  { id: 'p4', name: 'سارة النور حسن', passport: 'SD-141920', nationality: 'سودانية', flight: 'TK-577', seat: '14B', origin: 'إسطنبول', destination: 'الخرطوم', arrival: '15:45', temperature: '37.8°', symptoms: ['إرهاق'], exposure: true, travelHistory: ['إسطنبول'], vaccinated: false, declaredRisk: false, score: 46, risk: 'MEDIUM', status: 'SCREENING' },
  { id: 'p5', name: 'يوسف حمد النيل', passport: 'SD-302117', nationality: 'سوداني', flight: 'ET-438', seat: '5F', origin: 'الخرطوم', destination: 'أديس أبابا', arrival: '16:05', temperature: '36.6°', symptoms: [], exposure: false, travelHistory: ['الخرطوم'], vaccinated: true, declaredRisk: false, score: 4, risk: 'LOW', status: 'CLEARED' },
];

export const RISK_FACTORS = [
  { factor: 'مخاطر بلد المنشأ', weight: 20, value: 15, note: 'منطقة خضراء' },
  { factor: 'تنبيهات مرضية', weight: 25, value: 20, note: 'حمى صفراء نشطة' },
  { factor: 'الأعراض', weight: 15, value: 12, note: 'حمى + سعال' },
  { factor: 'التعرض', weight: 15, value: 14, note: 'مخالطة سفر' },
  { factor: 'التطعيم', weight: 10, value: 2, note: 'غير مكتمل' },
  { factor: 'تاريخ السفر', weight: 10, value: 4, note: '14 يوم' },
  { factor: 'أحداث صحية سابقة', weight: 5, value: 1, note: 'لا يوجد' },
];

export const CREW = [
  { name: 'القبطان رفيق عثمان', role: 'طيار أول', flight: 'TK-577', checked: 'سليم', status: 'تم الفحص' },
  { name: 'مايا خليل', role: 'طاقم مقصورة', flight: 'TK-577', checked: 'إذن مرضي', status: 'فحص إضافي' },
  { name: 'جورج عازر', role: 'مضيف طيران', flight: 'QR-631', checked: 'سليم', status: 'تم الفحص' },
  { name: 'هالة يوسف', role: 'مضيفة طيران', flight: 'ET-438', checked: 'سليم', status: 'تم الفحص' },
  { name: 'خالد عبد الله', role: 'مهندس طيران', flight: 'MS-842', checked: 'سليم', status: 'تم الفحص' },
];

export interface InspectionChecklistItem {
  item: string;
  result: 'PASS' | 'FAIL' | 'NA';
  note: string;
}

export const INSPECTION_CHECKLIST: InspectionChecklistItem[] = [
  { item: 'نظافة المقصورة', result: 'PASS', note: 'ممتازة' },
  { item: 'مياه الشرب', result: 'PASS', note: 'مطابقة للمواصفة' },
  { item: 'دورات المياه', result: 'PASS', note: 'نظيفة' },
  { item: 'النفايات', result: 'FAIL', note: 'تسرب من حاوية' },
  { item: 'الطعام المقدم', result: 'PASS', note: 'تاريخ صلاحية سليم' },
  { item: 'مكافحة الحشرات', result: 'PASS', note: 'لا حشرات' },
  { item: 'التطهير', result: 'NA', note: 'غير مطبق' },
  { item: 'النفايات الطبية', result: 'PASS', note: 'مثبتة' },
  { item: 'الحالة البيئية', result: 'PASS', note: 'ملائمة' },
];

export const INSPECTION_AIRCRAFT = {
  registration: 'TC-JRM',
  airline: 'التركية',
  flight: 'TK-577',
  origin: 'إسطنبول',
  destination: 'الخرطوم',
  arrival: '15:45',
  inspector: 'عمر خليل',
  date: '2026-08-15',
};

export interface LabOrder {
  id: string;
  passenger: string;
  flight: string;
  test: string;
  status: 'PENDING' | 'COLLECTED' | 'IN_LAB' | 'RESULT_READY' | 'POSITIVE' | 'CRITICAL';
  requestedAt: string;
}

export const LAB_ORDERS: LabOrder[] = [
  { id: 'LO-301', passenger: 'محمد الحسن عوض', flight: 'TK-577', test: 'مستضد سريع + RT-PCR', status: 'IN_LAB', requestedAt: '10:12' },
  { id: 'LO-302', passenger: 'فاطمة عبد الرحمن', flight: 'QR-631', test: 'RT-PCR', status: 'RESULT_READY', requestedAt: '11:40' },
  { id: 'LO-303', passenger: 'سارة النور حسن', flight: 'TK-577', test: 'مستضد سريع', status: 'COLLECTED', requestedAt: '11:05' },
  { id: 'LO-304', passenger: 'أحمد إبراهيم صالح', flight: 'MS-842', test: 'RT-PCR', status: 'PENDING', requestedAt: '12:00' },
  { id: 'LO-305', passenger: 'حالات المخالطة (3)', flight: 'TK-577', test: 'فردي + منصة تجميع', status: 'POSITIVE', requestedAt: '10:40' },
];

export const LAB_FLOW = ['حالة مشتبهة', 'أمر تحليل', 'أخذ عينة', 'باركود', 'المختبر', 'نتيجة', 'قرار إكلينيكي'];

export const CONTACT_TRACE = {
  index: 'محمد الحسن عوض',
  flight: 'TK-577',
  aircraft: 'TC-JRM',
  seat: '14B',
  travelDate: '2026-08-15',
  contacts: [
    { seat: '14A', name: 'سارة النور حسن', risk: 'HIGH', notified: 'نعم', followUp: 'يُتابع' },
    { seat: '14C', name: 'مجهول', risk: 'MEDIUM', notified: 'لا', followUp: 'قيد التبليغ' },
    { seat: '13B', name: 'إبراهيم علي', risk: 'MEDIUM', notified: 'نعم', followUp: 'يُتابع' },
    { seat: '15C', name: 'أحمد عثمان', risk: 'LOW', notified: 'نعم', followUp: 'مكتمل' },
    { seat: '12A', name: 'ليلى محمود', risk: 'LOW', notified: 'نعم', followUp: 'مكتمل' },
  ],
};

export const LAB_DASHBOARD = {
  pending: 6,
  collected: 12,
  inLab: 18,
  resultsReady: 9,
  positive: 2,
  critical: 1,
};

export const EMERGENCY = {
  severity: 'CRITICAL',
  incidentId: 'PHE-2026-088',
  flight: 'TK-577',
  airport: 'مطار الخرطوم الدولي',
  event: 'اشتباه حمى صفراء — حالتان بعرض حمى',
  affected: 3,
  responseStatus: 'نشط',
  team: 'فريق الاستجابة للطوارئ (A)',
};

export const ANALYTICS = {
  screening: { labels: ['06ص', '09ص', '12م', '03م', '06م', '09م'], values: [520, 1410, 1890, 1730, 1280, 860] },
  flightsPerDay: { labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'], values: [58, 66, 71, 63, 68, 61, 44] },
  riskDistribution: { labels: ['منخفض', 'متوسط', 'مرتفع', 'قيد التقييم'], values: [7420, 860, 118, 22] },
  labTests: { labels: ['مستضد', 'PCR', 'ثقافة', 'أخرى'], values: [48, 31, 7, 5] },
  positivesByWeek: { labels: ['أسبوع 1', 'أسبوع 2', 'أسبوع 3', 'أسبوع 4'], values: [2, 4, 3, 5] },
  inspectionResults: { labels: ['نظافة', 'مياه', 'نفايات', 'تطهير', 'غذاء'], pass: [42, 41, 38, 45, 40], fail: [2, 3, 6, 1, 2] },
};

export const NOTIFICATIONS = [
  { time: '10:12', title: 'نتيجة موجبة RT-PCR', body: 'العينة LO-305 — مخالطة رحلة TK-577', tone: 'danger' },
  { time: '09:45', title: 'تنبيه صحة عمومية', body: 'حالتا حمى صفراء مشتبهتان — رحلة TK-577', tone: 'danger' },
  { time: '09:20', title: 'طلب فحص ثانوي', body: 'المسافر أحمد إبراهيم — رحلة MS-842', tone: 'warning' },
  { time: '08:50', title: 'تقرير جاهز', body: 'نتائج مختبر الصباح متاحة (9 نتائج)', tone: 'success' },
];

export const USERS = [
  { name: 'د. هالة محمد', role: 'طبيبة حجر صحي', area: 'فحص المسافرين', status: 'نشط' },
  { name: 'عمر خليل', role: 'مفتش حجر صحي', area: 'تفتيش الطائرات', status: 'نشط' },
  { name: 'نهلة يوسف', role: 'مسؤولة مختبر', area: 'المختبر', status: 'نشط' },
  { name: 'ياسر محمد', role: 'مسؤول تسجيل', area: 'مكتب البوابة', status: 'نشط' },
  { name: 'خالد أحمد', role: 'مفتش بيئة', area: 'المباني والمرافق', status: 'موقوف' },
];

export const AUDIT_LOGS = [
  { time: '13:22', actor: 'د. هالة محمد', action: 'قرار: عزل دائم للمسافر p1', module: 'الحالات' },
  { time: '12:58', actor: 'عمر خليل', action: 'تسجيل تفتيش طائرة TC-JRM', module: 'التفتيش' },
  { time: '12:30', actor: 'نهلة يوسف', action: 'اعتماد نتيجة LO-302', module: 'المختبر' },
  { time: '11:47', actor: 'النظام', action: 'تصدير تقرير الصباح', module: 'التحليلات' },
  { time: '11:02', actor: 'ياسر محمد', action: 'تسجيل إعلان صحي لقاصر', module: 'المسافرون' },
];

export const ISOLATION_CASES = [
  { name: 'محمد الحسن عوض', room: 'A-104', start: '2026-08-15 12:40', status: 'قيد العزل', temperature: '38.4°' },
  { name: 'سارة النور حسن', room: 'A-105', start: '2026-08-15 12:55', status: 'قيد العزل', temperature: '37.9°' },
  { name: 'حالة مخالطة — إبراهيم علي', room: 'B-201', start: '2026-08-15 13:10', status: 'مراقبة', temperature: '36.8°' },
];

export const VACCINATION = [
  { passenger: 'فاطمة عبد الرحمن', passport: 'SD-209311', vaccine: 'جرعة واحدة مطعومة', status: 'مؤكد' },
  { passenger: 'أحمد إبراهيم صالح', passport: 'EG-77122', vaccine: 'مكتمل', status: 'مؤكد' },
  { passenger: 'سارة النور حسن', passport: 'SD-141920', vaccine: 'غير مكتمل', status: 'مطلوب فحص' },
  { passenger: 'يوسف حمد النيل', passport: 'SD-302117', vaccine: 'مكتمل', status: 'مؤكد' },
];

export const CERTIFICATES = [
  { id: 'CD-51122', type: 'شهادة خلو من الأمراض', holder: 'فاطمة عبد الرحمن', issued: '2026-08-15', validUntil: '2026-11-13', status: 'سارية' },
  { id: 'AC-880', type: 'شهادة فسح طائرة', holder: 'TC-JRM', issued: '2026-08-15', validUntil: '2026-08-15', status: 'صادرة' },
  { id: 'CD-51141', type: 'إعلان صحي للقاح', holder: 'محمد الحسن عوض', issued: '—', validUntil: '—', status: 'قيد المراجعة' },
];