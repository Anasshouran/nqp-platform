export type StationStatus =
  | 'PENDING_REVIEW'
  | 'UNDER_INSPECTION'
  | 'IN_LAB'
  | 'READY_DECISION'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED'
  | 'SUSPENDED';

export type RequestType = 'IMPORT' | 'EXPORT';

export type FinancialStatus = 'PAID' | 'WAIVED' | 'PARTIAL' | 'UNPAID';

export interface StationRequest {
  id: string;
  number: string;
  type: RequestType;
  client: string;
  supplier: string;
  vessel: string;
  weight: string;
  itemsCount: number;
  station: string;
  status: StationStatus;
  financialStatus: FinancialStatus;
  date: string;
  deadlineDays?: number;
}

export interface Inspector {
  id: string;
  name: string;
  specialty: string;
  workload: number;
  phone?: string;
}

export type AssignmentStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export interface InspectionAssignment {
  id: string;
  requestNumber: string;
  inspectorId: string;
  inspectorName: string;
  assignedBy: string;
  assignedAt: string;
  priority: 'normal' | 'high' | 'urgent';
  dueAt: string;
  status: AssignmentStatus;
  notes?: string;
}

export type LabOrderStatus =
  | 'ISSUED'
  | 'RECEIVED_BY_LAB'
  | 'SAMPLE_REGISTERED'
  | 'IN_PROGRESS'
  | 'RESULT_READY'
  | 'VERIFIED'
  | 'COMPLETED';

export interface LabOrder {
  id: string;
  requestNumber: string;
  station: string;
  source: string;
  item: string;
  samplesCount: number;
  type: string;
  reason: string;
  status: LabOrderStatus;
  issuedBy: string;
  issuedAt: string;
}

export type DecisionKind = 'APPROVE' | 'REJECT' | 'HOLD' | 'RE_INSPECT' | 'REQUEST_DOCS';

export interface Decision {
  requestNumber: string;
  kind: DecisionKind;
  notes: string;
  by: string;
  at: string;
}

export interface Certificate {
  id: string;
  number: string;
  requestNumber: string;
  issueDate: string;
  issuedBy: string;
  qrRef: string;
  hash: string;
  verificationUrl: string;
  type: RequestType;
}

export interface StationCritical {
  id: string;
  number: string;
  stage: string;
  delay: string;
}

export interface StationActivity {
  id: string;
  time: string;
  action: string;
  who: string;
}

export interface StationAlert {
  id: string;
  tone: 'error' | 'warning' | 'success' | 'info';
  title: string;
  body: string;
}

export const stationStatusMeta: Record<StationStatus, { label: string; tone: 'default' | 'primary' | 'info' | 'warning' | 'error' | 'success' }> = {
  PENDING_REVIEW: { label: 'قيد المراجعة', tone: 'info' },
  UNDER_INSPECTION: { label: 'قيد التفتيش', tone: 'warning' },
  IN_LAB: { label: 'قيد المعمل', tone: 'default' },
  READY_DECISION: { label: 'جاهز للقرار', tone: 'primary' },
  APPROVED: { label: 'معتمد', tone: 'success' },
  REJECTED: { label: 'مرفوض', tone: 'error' },
  RETURNED: { label: 'مرتجع للكاتب', tone: 'error' },
  SUSPENDED: { label: 'معلّق', tone: 'warning' },
};

export const labOrderStatusOrder: LabOrderStatus[] = [
  'ISSUED',
  'RECEIVED_BY_LAB',
  'SAMPLE_REGISTERED',
  'IN_PROGRESS',
  'RESULT_READY',
  'VERIFIED',
  'COMPLETED',
];

export const analysisTypes = ['كيميائي', 'ميكروبيولوجي', 'أفلاتوكسين', 'متعدد'];

export const analysisReasons = ['عينة روتينية', 'اشتباه فساد', 'أول ورود', 'متطلبات دولة', 'طلب جهة رقابية', 'سبب آخر'];

export const stationRequests: StationRequest[] = [
  { id: 's1', number: 'IMP-2026-00125', type: 'IMPORT', client: 'شركة ABC للتجارة', supplier: 'XYZ Food', vessel: 'Sudan Star', weight: '120 طن', itemsCount: 5, station: 'بورتسودان', status: 'PENDING_REVIEW', financialStatus: 'PAID', date: '13/08/2026' },
  { id: 's2', number: 'IMP-2026-00124', type: 'IMPORT', client: 'شركة DEF للزيوت', supplier: 'Mena Oils', vessel: 'Riva Sea', weight: '40 طن', itemsCount: 2, station: 'بورتسودان', status: 'UNDER_INSPECTION', financialStatus: 'PARTIAL', date: '13/08/2026' },
  { id: 's3', number: 'EXP-2026-00076', type: 'EXPORT', client: 'شركة السمسم السودانية', supplier: 'إقليم — محلي', vessel: 'Red Sea Star', weight: '150 طن', itemsCount: 4, station: 'بورتسودان', status: 'IN_LAB', financialStatus: 'PAID', date: '12/08/2026' },
  { id: 's4', number: 'IMP-2026-00123', type: 'IMPORT', client: 'مؤسسة النيل للأغذية', supplier: 'Delta Rice', vessel: 'Al Seef', weight: '210 طن', itemsCount: 7, station: 'بورتسودان', status: 'READY_DECISION', financialStatus: 'PAID', date: '12/08/2026' },
  { id: 's5', number: 'EXP-2026-00075', type: 'EXPORT', client: 'شركة الرحمة للتمور', supplier: 'إقليم — محلي', vessel: 'Maersk Khartoum', weight: '90 طن', itemsCount: 3, station: 'بورتسودان', status: 'UNDER_INSPECTION', financialStatus: 'WAIVED', date: '12/08/2026' },
  { id: 's6', number: 'IMP-2026-00122', type: 'IMPORT', client: 'شركة GHI للأدوية', supplier: 'Pharma Global', vessel: 'Medina Express', weight: '25 طن', itemsCount: 3, station: 'بورتسودان', status: 'IN_LAB', financialStatus: 'PAID', date: '11/08/2026' },
  { id: 's7', number: 'IMP-2026-00121', type: 'IMPORT', client: 'شركة JKL للحلويات', supplier: 'Sweet Co.', vessel: 'MSC Aisha', weight: '95 طن', itemsCount: 6, station: 'بورتسودان', status: 'APPROVED', financialStatus: 'PAID', date: '11/08/2026' },
  { id: 's8', number: 'EXP-2026-00074', type: 'EXPORT', client: 'شركة السواكن للأسماك', supplier: 'إقليم — محلي', vessel: 'Baltic Trader', weight: '60 طن', itemsCount: 2, station: 'بورتسودان', status: 'RETURNED', financialStatus: 'UNPAID', date: '10/08/2026' },
  { id: 's9', number: 'IMP-2026-00120', type: 'IMPORT', client: 'شركة الطيب للدقيق', supplier: 'Wheat Mills', vessel: 'Al Huda', weight: '180 طن', itemsCount: 4, station: 'بورتسودان', status: 'READY_DECISION', financialStatus: 'PARTIAL', date: '10/08/2026' },
  { id: 's10', number: 'EXP-2026-00073', type: 'EXPORT', client: 'شركة بركة للعسل', supplier: 'إقليم — محلي', vessel: 'Kassala Queen', weight: '18 طن', itemsCount: 2, station: 'بورتسودان', status: 'SUSPENDED', financialStatus: 'PAID', date: '09/08/2026' },
];

export const inspectors: Inspector[] = [
  { id: 'i1', name: 'م. عادل حسن', specialty: 'كيميائي', workload: 4 },
  { id: 'i2', name: 'م. سمية نور', specialty: 'أغذية', workload: 2 },
  { id: 'i3', name: 'م. ياسر علي', specialty: 'حبوب', workload: 3 },
  { id: 'i4', name: 'م. هاجر محمد', specialty: 'ميكروبيولوجي', workload: 1 },
];

export const initialAssignments: InspectionAssignment[] = [
  { id: 'a1', requestNumber: 'IMP-2026-00124', inspectorId: 'i1', inspectorName: 'م. عادل حسن', assignedBy: 'م. عبد الرحمن صالح', assignedAt: '13/08/2026 09:10', priority: 'high', dueAt: '14/08/2026', status: 'IN_PROGRESS', notes: 'فحص زيوت مكررة' },
  { id: 'a2', requestNumber: 'EXP-2026-00075', inspectorId: 'i3', inspectorName: 'م. ياسر علي', assignedBy: 'م. عبد الرحمن صالح', assignedAt: '12/08/2026 14:00', priority: 'normal', dueAt: '14/08/2026', status: 'IN_PROGRESS' },
  { id: 'a3', requestNumber: 'IMP-2026-00123', inspectorId: 'i2', inspectorName: 'م. سمية نور', assignedBy: 'م. عبد الرحمن صالح', assignedAt: '12/08/2026 11:20', priority: 'urgent', dueAt: '13/08/2026', status: 'DONE', notes: 'مطابق للعينات' },
];

export const initialLabOrders: LabOrder[] = [
  { id: 'l1', requestNumber: 'EXP-2026-00076', station: 'بورتسودان', source: 'شركة السمسم السودانية', item: 'سمسم', samplesCount: 5, type: 'أفلاتوكسين', reason: 'عينة روتينية', status: 'IN_PROGRESS', issuedBy: 'م. عبد الرحمن صالح', issuedAt: '12/08/2026' },
  { id: 'l2', requestNumber: 'IMP-2026-00122', station: 'بورتسودان', source: 'Pharma Global', item: 'أرز', samplesCount: 3, type: 'ميكروبيولوجي', reason: 'اشتباه فساد', status: 'RESULT_READY', issuedBy: 'م. عبد الرحمن صالح', issuedAt: '11/08/2026' },
];

export const stationCritical: StationCritical[] = [
  { id: 'c1', number: 'IMP-2026-00122', stage: 'معمل', delay: '2 يوم' },
  { id: 'c2', number: 'IMP-2026-00124', stage: 'تفتيش', delay: '5 ساعة' },
  { id: 'c3', number: 'EXP-2026-00076', stage: 'معمل', delay: 'يوم' },
];

export const stationActivities: StationActivity[] = [
  { id: 'ac1', time: '09:40', action: 'القبول الأولي IMP-2026-00125', who: 'عبد الرحمن' },
  { id: 'ac2', time: '09:15', action: 'توزيع مفتش IMP-2026-00124', who: 'عبد الرحمن' },
  { id: 'ac3', time: '08:55', action: 'أمر تحليل EXP-2026-00076', who: 'عبد الرحمن' },
  { id: 'ac4', time: '08:30', action: 'اعتماد قرار IMP-2026-00121', who: 'عبد الرحمن' },
  { id: 'ac5', time: '07:50', action: 'إعادة للكاتب EXP-2026-00074', who: 'عبد الرحمن' },
];

export const stationAlerts: StationAlert[] = [
  { id: 'al1', tone: 'error', title: 'تجاوز SLA', body: 'IMP-2026-00122 تأخر في المعمل 2 يوم.' },
  { id: 'al2', tone: 'warning', title: 'مستند ناقص', body: 'EXP-2026-00074 أُعيد للكاتب.' },
  { id: 'al3', tone: 'success', title: 'قرار معتمد', body: 'تم اعتماد IMP-2026-00121 والشهادة جاهزة.' },
  { id: 'al4', tone: 'info', title: 'توزيع', body: '3 مهام نشطة لدي المفتشين.' },
];

export const stationFinances = {
  collectedToday: '1,250,000 SDG',
  pending: '272,000 SDG',
  waivers: 2,
  certificates: 12,
};

export const stationReports = {
  processed: 42,
  inspected: 28,
  labOrders: 19,
  decisions: 25,
  certs: 12,
  slaBreached: 3,
};