// Shared metadata for the clerk dashboard: view definitions, status vocabularies,
// stage pipelines and table column specs. Extracted from ClerkDashboardPage so the
// page, the extracted components and the hooks all read from one place.
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/Home';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import SendIcon from '@mui/icons-material/Send';
import DescriptionIcon from '@mui/icons-material/Description';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import type { FoodShipment } from '../../types/food';
import type { AxiosError } from 'axios';
import { StatusChip } from '../../components/uikit';
import type { StatusTone } from '../../components/ui/StatusChip';
import type { DataTableColumn } from '../../components/ui/DataTable';
export type QueueCounts = { drafts: number; submitted: number; underReview: number; inspection: number; rejected: number };

export const SIDEBAR_ITEMS = [
  { key: 'home', label: 'الرئيسية', icon: <HomeIcon /> },
  { key: 'import', label: 'الوارد', icon: <MoveToInboxIcon /> },
  { key: 'export', label: 'الصادر', icon: <SendIcon /> },
  { key: 'requests', label: 'كل الطلبات', icon: <DescriptionIcon /> },
  { key: 'search', label: 'البحث', icon: <SearchIcon /> },
  { key: 'reports', label: 'التقارير', icon: <ReceiptLongIcon /> },
  { key: 'settings', label: 'الإعدادات', icon: <SettingsIcon /> },
];

export const WIZARD_STEPS = ['نوع الطلب', 'بيانات الشحنة', 'البيانات الحكومية', 'المستورد/المصدر', 'الأصناف', 'المستندات', 'الرسوم والعينات', 'المراجعة'];

import type { SamplingMatch } from './samplingPolicy';

export type WizardItem = { name: string; brand: string; origin: string; weight: string; quantity: string; packageType: string; sampling?: SamplingMatch | null };

export type WizardStep = number;

export type RequestType = 'IMPORT' | 'EXPORT';

export const STATUS_META: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' }> = {
  DRAFT: { label: 'مسودة', color: 'default' },
  RECEIVED: { label: 'مستلم', color: 'info' },
  FEES_DUE: { label: 'بانتظار الرسوم', color: 'warning' },
  AWAITING_INSPECTION: { label: 'بانتظار التفتيش', color: 'primary' },
  UNDER_INSPECTION: { label: 'قيد التفتيش', color: 'primary' },
  AWAITING_LAB_RESULTS: { label: 'بانتظار نتائج المعمل', color: 'info' },
  AWAITING_DECISION: { label: 'بانتظار القرار', color: 'warning' },
  RELEASED: { label: 'مُفرج عنه', color: 'success' },
  CONDITIONAL_RELEASE: { label: 'إفراج مشروط', color: 'success' },
  REJECTED: { label: 'مرفوض', color: 'error' },
  HOLD: { label: 'محجوز', color: 'warning' },
  RE_EXPORT: { label: 'إعادة تصدير', color: 'default' },
  DESTROYED: { label: 'متلف', color: 'error' },
};

export const LIST_VIEW_META: Record<string, { title: string; subtitle: string }> = {
  requests: { title: 'كل الطلبات', subtitle: 'جميع طلبات رقابة الأغذية' },
  import: { title: 'الوارد', subtitle: 'طلبات استيراد المواد الغذائية' },
  export: { title: 'الصادر', subtitle: 'طلبات تصدير المواد الغذائية' },
  // وجهات الجدول التي تُفتح من بطاقات الإحصائيات والتنبيهات؛ بدونها كانت
  // `?view=drafts` تُصيّر صفحة فارغة لأنها لا تطابق أي فرع في الصفحة.
  drafts: { title: 'المسودات', subtitle: 'طلبات لم تُرسل بعد لتحصيل الرسوم' },
  submitted: { title: 'بانتظار الرسوم', subtitle: 'طلبات مُرسلة إلى قسم الحسابات' },
  'under-review': { title: 'بانتظار المراجعة', subtitle: 'طلبات سدّدت رسومها — لدى مدير القسم' },
  inspection: { title: 'قيد الفحص', subtitle: 'طلبات جاري فحصها وأخذ العينات' },
  completed: { title: 'المُفرج عنها', subtitle: 'طلبات أُفرج عنها أو صدرت أو أُعيد تصديرها' },
  rejected: { title: 'المرفوضة', subtitle: 'طلبات مرفوضة أو متلفة' },
};

export const REQUESTS_PRESETS: Record<string, { label: string; status: string; fees_paid?: string }> = {
  drafts: { label: 'المسودات', status: 'DRAFT' },
  submitted: { label: 'بانتظار الرسوم', status: 'RECEIVED,FEES_DUE', fees_paid: 'false' },
  'under-review': { label: 'بانتظار المراجعة', status: 'FEES_DUE,RECEIVED', fees_paid: 'true' },
  inspection: { label: 'قيد الفحص', status: 'AWAITING_INSPECTION,UNDER_INSPECTION,AWAITING_LAB_RESULTS' },
  completed: { label: 'المُفرج عنها', status: 'RELEASED,CONDITIONAL_RELEASE,RE_EXPORT' },
  rejected: { label: 'المرفوضة', status: 'REJECTED,DESTROYED' },
};

export const STATUS_FILTER_OPTIONS = [
  { value: 'DRAFT', label: 'مسودة' },
  { value: 'RECEIVED', label: 'مستلم' },
  { value: 'FEES_DUE', label: 'بانتظار الرسوم' },
  { value: 'AWAITING_INSPECTION,UNDER_INSPECTION,AWAITING_LAB_RESULTS', label: 'قيد الفحص' },
  { value: 'AWAITING_DECISION', label: 'بانتظار القرار' },
  { value: 'RELEASED,CONDITIONAL_RELEASE,RE_EXPORT', label: 'مُفرج عنه / إفراج مشروط / إعادة تصدير' },
  { value: 'REJECTED,DESTROYED', label: 'مرفوض / متلف' },
  { value: 'HOLD', label: 'محجوز' },
];

export const DOC_STATUS_META: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' }> = {
  UPLOADED: { label: 'مرفوع', color: 'default' },
  RECEIVED: { label: 'مستلم', color: 'info' },
  UNDER_REVIEW: { label: 'قيد المراجعة', color: 'primary' },
  ACCEPTED: { label: 'مقبول', color: 'success' },
  REJECTED: { label: 'مرفوض', color: 'error' },
  CORRECTION_REQUIRED: { label: 'يلزم تصحيح', color: 'warning' },
};

export const STAGE_META: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' }> = {
  CREATED: { label: 'إنشاء', color: 'default' },
  DOCS_UPLOADED: { label: 'رفع المستندات', color: 'info' },
  DOCS_COMPLETE: { label: 'اكتمال المستندات', color: 'success' },
  SUBMITTED: { label: 'الإرسال', color: 'primary' },
  ADMIN_REVIEW: { label: 'مراجعة إدارية', color: 'primary' },
  REFERRED_TO_ACCOUNTANT: { label: 'إحالة للمحاسب', color: 'warning' },
  FEES_ASSESSED: { label: 'احتساب الرسوم', color: 'warning' },
  FEES_CONFIRMED: { label: 'تحصيل الرسوم', color: 'success' },
  REFERRED_TO_INSPECTOR: { label: 'إحالة للتفتيش', color: 'info' },
  INSPECTION: { label: 'تفتيش', color: 'primary' },
  SAMPLING: { label: 'سحب عينات', color: 'info' },
  LABORATORY: { label: 'المختبر', color: 'info' },
  AWAITING_DECISION: { label: 'بانتظار القرار', color: 'warning' },
  DECISION: { label: 'القرار النهائي', color: 'primary' },
  RELEASED: { label: 'إفراج', color: 'success' },
  REJECTED: { label: 'رفض', color: 'error' },
  CORRECTION: { label: 'تصحيح', color: 'warning' },
  OTHER: { label: 'أخرى', color: 'default' },
};

export const counterpartyOf = (r: FoodShipment) =>
  (r.shipment_type === 'IMPORT' ? r.supplier_name : r.exporter_name) || r.supplier_name || '—';

export const getErrMessage = (e: unknown, fallback: string) => {
  const err = e as AxiosError<{ message?: string }>;
  return err.response?.data?.message || fallback;
};

export const statusTone = (s: string): StatusTone => {
  switch (s) {
    case 'DRAFT':
      return 'neutral';
    case 'RECEIVED':
    case 'AWAITING_LAB_RESULTS':
      return 'info';
    case 'FEES_DUE':
    case 'AWAITING_DECISION':
    case 'HOLD':
      return 'warning';
    case 'AWAITING_INSPECTION':
    case 'UNDER_INSPECTION':
      return 'primary';
    case 'RELEASED':
    case 'CONDITIONAL_RELEASE':
      return 'success';
    case 'REJECTED':
    case 'DESTROYED':
      return 'error';
    default:
      return 'neutral';
  }
};

export const statusLabel = (s: string) => STATUS_META[s]?.label ?? s;

export const shipmentTypeChip = (type: string) => (
  <StatusChip
    label={type === 'IMPORT' ? 'وارد' : 'صادر'}
    tone={type === 'IMPORT' ? 'primary' : 'info'}
    variant="outlined"
    showIcon={false}
  />
);

export const isDraftRow = (r: FoodShipment) => r.status === 'DRAFT';

export const ALERT_PRESET: Record<string, string> = {
  drafts: 'drafts',
  submitted: 'submitted',
  under_review: 'under-review',
  inspection: 'inspection',
  rejected: 'rejected',
};

export const HEADER_META: Record<string, { title: string; subtitle: string }> = {
  search: { title: 'البحث', subtitle: 'ابحث في كل الطلبات برقم البيان، جمركي، بوليصة، مورد، باخرة…' },
  reports: { title: 'التقارير', subtitle: 'مؤشرات رقابة الأغذية من بيانات الطلبات' },
  settings: { title: 'الإعدادات', subtitle: 'تفضيلات الحساب والواجهة' },
};

export const WORKLIST_COLUMNS: DataTableColumn<FoodShipment>[] = [
  {
    key: 'manifest_number',
    label: 'رقم البيان',
    sortable: true,
    render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.manifest_number}</Typography>,
  },
  { key: 'shipment_type', label: 'النوع', render: (r) => shipmentTypeChip(r.shipment_type) },
  { key: 'counterparty', label: 'المستورد / المصدر', render: (r) => counterpartyOf(r), noWrap: true },
  { key: 'items', label: 'الأصناف', align: 'center', hideOnMobile: true, render: (r) => r.items.length },
  { key: 'total_weight_kg', label: 'الوزن (كجم)', sortable: true, align: 'center', hideOnMobile: true, render: (r) => Number(r.total_weight_kg || 0).toLocaleString('ar-EG') },
  { key: 'arrival_date', label: 'تاريخ الوصول', sortable: true, render: (r) => (r.arrival_date || '—').slice(0, 10) },
  {
    key: 'status',
    label: 'الحالة',
    render: (r) => <StatusChip label={statusLabel(r.status)} tone={statusTone(r.status)} />,
  },
];