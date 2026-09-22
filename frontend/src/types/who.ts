export type WhoEnvironment = 'DEV' | 'SANDBOX' | 'PRODUCTION';

export type WhoAuthType = 'OAUTH2' | 'API_KEY' | 'NONE';

export type WhoSyncOperation =
  | 'TEST_CONNECTION'
  | 'STATUS_CHECK'
  | 'SUBMIT_EVENT'
  | 'SYNC_DISEASES'
  | 'SYNC_HPR'
  | 'CONSULT';

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

export interface WhoConnectionStatus {
  configured: boolean;
  connected: boolean;
  environment?: WhoEnvironment;
  last_sync_at?: string | null;
  last_success_at?: string | null;
  last_error?: string | null;
}

export interface WhoTestResult {
  connected: boolean;
  client_id?: string;
  environment?: string;
  latency_ms?: number;
  error?: string;
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
  TEST_CONNECTION: 'اختبار الاتصال',
  STATUS_CHECK: 'فحص الحالة',
  SUBMIT_EVENT: 'إرسال حدث',
  SYNC_DISEASES: 'مزامنة الأمراض',
  SYNC_HPR: 'مزامنة HPR',
  CONSULT: 'استشارة',
};

export const WHO_SYNC_STATUS_LABELS: Record<WhoSyncStatus, string> = {
  PENDING: 'معلق',
  PROCESSING: 'قيد التنفيذ',
  SUCCESS: 'نجح',
  FAILED: 'فشل',
  RETRY: 'إعادة محاولة',
  CANCELLED: 'ملغى',
};