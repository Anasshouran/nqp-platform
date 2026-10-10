export type WhoEnvironment = 'DEV' | 'SANDBOX' | 'PRODUCTION';

export type WhoAuthType = 'OAUTH2' | 'API_KEY' | 'NONE';

// قيم مطابقة لـ WHOSyncLog.Operation في backend/apps/who/models.py
export type WhoSyncOperation =
  | 'EVENT_SUBMIT'
  | 'DISEASE_SYNC'
  | 'SPAR_SYNC'
  | 'ALERT_SYNC'
  | 'TEST_CONNECTION'
  | 'STATUS_CHECK';

export type WhoSyncDirection = 'OUTBOUND' | 'INBOUND';

export type WhoSyncStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'RETRY' | 'CANCELLED';

export interface WhoIntegration {
  id: string;
  name: string;
  environment: WhoEnvironment;
  base_url: string;
  client_id?: string;
  authentication_type: WhoAuthType;
  is_active: boolean;
  last_sync_at?: string | null;
  last_success_at?: string | null;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhoIntegrationInput {
  name: string;
  environment: WhoEnvironment;
  base_url: string;
  client_id?: string;
  client_secret?: string;
  authentication_type: WhoAuthType;
  is_active?: boolean;
}

/**
 * حالة الاتصال كما يثبتها فحص backend المتحكَّم به.
 *
 * `CONFIGURED` تعني أن الاعتماد والإعدادات سليمة، **لا** أن الاتصال قائم.
 * `READY` وحدها هي الدليل التشغيلي. الح 나머ى لا دليل فيها.
 */
export type WhoConnectivityState =
  | 'DISABLED'
  | 'UNCONFIGURED'
  | 'INVALID'
  | 'CONFIGURED'
  | 'READY'
  | 'ERROR';

/** الحالات التي لا يجوز عرضها كـ«متصل» — لا فحص ناجح خلفها. */
export const WHO_UNVERIFIED_STATES: readonly WhoConnectivityState[] = [
  'DISABLED',
  'UNCONFIGURED',
  'INVALID',
  'CONFIGURED',
];

export const isWhoVerified = (state?: WhoConnectivityState | null): boolean => state === 'READY';

export interface WhoConnectionStatus {
  /** حالة الفحص المتحكَّم به. `READY` = اتصال متحقَّق منه. */
  state: WhoConnectivityState;
  configured: boolean;
  /**مشتق من `state === 'READY'` — لا من `last_success_at`. */
  connected: boolean;
  verified: boolean;
  enabled?: boolean;
  environment?: WhoEnvironment | '';
  last_sync_at?: string | null;
  last_success_at?: string | null;
  last_error?: string | null;
  /** وقت آخر فحص مسجَّل (وليس وقت آخر مزامنة). */
  verified_at?: string | null;
  /** مسار المورد المُختبَر — رابط كامل بلا اعتماد أو سر. */
  verified_endpoint?: string;
  verified_http_status?: number | null;
  verified_latency_ms?: number | null;
  oauth_verified?: boolean;
  api_verified?: boolean;
  api_version?: string;
  verification_message?: string;
  /** IHR: حالة إعداد فقط. لا يوجد مسار حالة معتمد ⇒ لا دليل. */
  ihr_state?: string;
  ihr_configured?: boolean;
}

/**
 * نتيجة فحص واحد.
 *
 * `client_id` **محذوف عمداً**: كان يُعرض في التنبيه ويمثّل بيانات اعتماد.
 * لا يخرج من الـ backend أي توكن ولا سر ولا رأس تفويض.
 */
export interface WhoTestResult {
  state: WhoConnectivityState;
  verified: boolean;
  message?: string;
  http_status?: number | null;
  latency_ms?: number | null;
  endpoint?: string;
  api_version?: string;
  oauth_verified?: boolean;
  api_verified?: boolean;
  checked_at?: string | null;
}

export interface WhoSyncLog {
  id: string;
  integration: string;
  integration_name: string;
  operation: WhoSyncOperation;
  direction: WhoSyncDirection;
  resource_type?: string;
  local_ref?: string | null;
  remote_ref?: string | null;
  request_id?: string | null;
  status: WhoSyncStatus;
  http_status?: number | null;
  request_payload?: string | null;
  response_payload?: string | null;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface DiseaseMaster {
  id: string;
  disease: string;
  disease_name: string;
  disease_code: string;
  icd11_uri?: string;
  who_disease_code?: string | null;
  is_notifiable: boolean;
  reporting_timeline?: string | null;
  mapped_at?: string | null;
  last_synced_at?: string | null;
  last_sync_status?: string | null;
}

export const WHO_SYNC_OPERATION_LABELS: Record<WhoSyncOperation, string> = {
  EVENT_SUBMIT: 'إرسال حدث',
  DISEASE_SYNC: 'مزامنة الأمراض',
  SPAR_SYNC: 'مزامنة SPAR',
  ALERT_SYNC: 'مزامنة تنبيهات',
  TEST_CONNECTION: 'اختبار الاتصال',
  STATUS_CHECK: 'فحص الحالة',
};

export const WHO_SYNC_STATUS_LABELS: Record<WhoSyncStatus, string> = {
  PENDING: 'معلق',
  PROCESSING: 'قيد التنفيذ',
  SUCCESS: 'نجح',
  FAILED: 'فشل',
  RETRY: 'إعادة محاولة',
  CANCELLED: 'ملغى',
};