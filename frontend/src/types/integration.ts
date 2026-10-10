export interface Organization {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  name: string; // backward compatibility: alias for name_en
  org_type: 'INTERNATIONAL' | 'GOVERNMENT' | 'LABORATORY' | 'HOSPITAL' | 'PARTNER' | 'OTHER';
  country: string;
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE';
  technical_contact_name: string;
  technical_contact_email: string;
  technical_contact_phone: string;
  last_sync_at?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationFormData {
  code: string;
  name_en: string;
  name_ar: string;
  org_type: Organization['org_type'];
  country: string;
  status: Organization['status'];
  technical_contact_name: string;
  technical_contact_email: string;
  technical_contact_phone: string;
  is_active: boolean;
}

export interface ApiEndpoint {
  id: string;
  code: string;
  organization: string;
  organization_name: string;
  name_en: string;
  name_ar: string;
  description?: string;
  protocol: 'REST' | 'SOAP' | 'SFTP' | 'ODATA' | 'GRPC';
  scope: 'DISEASE' | 'SURVEILLANCE' | 'VACCINATION' | 'IHR' | 'LABORATORY' | 'HEALTH_EVENT' | 'REFERENCE';
  base_url: string;
  version?: string;
  auth_type?: string;
  doc_url?: string;
  is_active: boolean;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiEndpointFormData {
  code: string;
  organization: string;
  name_en: string;
  name_ar: string;
  description?: string;
  protocol: ApiEndpoint['protocol'];
  scope: ApiEndpoint['scope'];
  base_url: string;
  version?: string;
  auth_type?: string;
  doc_url?: string;
  is_active: boolean;
}

export interface Integration {
  id: string;
  organization: string;
  organization_name: string;
  endpoint: string;
  endpoint_code: string;
  endpoint_name: string;
  environment: 'DEV' | 'SANDBOX' | 'PRODUCTION';
  status: 'NOT_CONFIGURED' | 'PENDING' | 'CONFIGURED' | 'VERIFIED' | 'FAILED' | 'DISABLED';
  auth_type?: string;
  base_url?: string;
  notes?: string;
  verified_at?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationFormData {
  organization: string;
  endpoint: string;
  environment: Integration['environment'];
  status: Integration['status'];
  auth_type?: string;
  base_url?: string;
  notes?: string;
  is_active: boolean;
}

export interface IntegrationHealth {
  id: string;
  integration: string;
  integration_name: string;
  check_type: string;
  passed: boolean;
  detail?: string;
  checked_by?: string;
  checked_at: string;
}

export interface IntegrationHealthFormData {
  integration: string;
  check_type: string;
  passed: boolean;
  detail?: string;
}

export interface WebhookSubscription {
  id: string;
  organization: string;
  organization_name: string;
  integration?: string | null;
  integration_name?: string | null;
  event_type: string;
  endpoint_url: string;
  secret?: string;
  is_active: boolean;
  last_delivery_at?: string | null;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookSubscriptionFormData {
  organization: string;
  integration?: string | null;
  event_type: string;
  endpoint_url: string;
  secret?: string;
  is_active: boolean;
}

export interface WebhookDelivery {
  id: string;
  subscription: string;
  subscription_id: string;
  event_type: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  http_status?: number | null;
  request_payload?: Record<string, unknown>;
  response_payload?: Record<string, unknown>;
  error_message?: string;
  duration_ms?: number | null;
  fired_at: string;
  completed_at?: string | null;
}

export interface AuditLog {
  id: string;
  user?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  detail?: Record<string, unknown>;
  ip_address?: string | null;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  created_at: string;
}

export interface DataScope {
  id: string;
  organization: string;
  organization_name: string;
  endpoint: string;
  endpoint_code: string;
  endpoint_name: string;
  direction: 'READ' | 'WRITE';
  resource: string;
  granted_by?: string | null;
  granted_by_name?: string | null;
  granted_at?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DataScopeFormData {
  organization: string;
  endpoint: string;
  direction: DataScope['direction'];
  resource: string;
  granted_by?: string | null;
  is_active: boolean;
}

export interface Credential {
  id: string;
  integration: string;
  integration_name: string;
  key_type: 'API_KEY' | 'OAUTH_SECRET' | 'CERTIFICATE' | 'TOKEN' | 'OTHER';
  key_name: string;
  created_at?: string;
}

export interface CredentialFormData {
  integration: string;
  key_type: Credential['key_type'];
  key_name: string;
  /** يُرسَل كـplaintext ويُشفَّر في الخادم؛ لا يُعاد عرضه أبداً. */
  value: string;
}

// Existing types
/** `@deprecated` الاسم القديم للنموذج. `Organization` هو المرجع الآن؛
 *  أبقينا الاسم كـalias لتوافق `IntegrationPage.tsx` و`/integration/entities/`. */
export type ExternalEntity = Organization;

export interface IntegrationLog {
  id: string;
  integration_name: string;
  request_type: string;
  direction?: 'INBOUND' | 'OUTBOUND' | 'UNKNOWN';
  status?: 'SUCCESS' | 'FAILED' | 'PENDING' | 'RETRY' | 'UNKNOWN';
  is_successful?: boolean;
  status_code?: number | null;
  error_message?: string;
  duration_ms?: number | null;
  correlation_id?: string;
  request_payload?: Record<string, unknown>;
  response_payload?: Record<string, unknown>;
  request_timestamp: string;
  completed_at?: string | null;
}

export interface DeveloperApp {
  id: string;
  name: string;
  description?: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookEndpoint {
  id: string;
  app: string;
  event_type: string;
  endpoint_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IhrLocation {
  port_code: string;
  city?: string;
}

export interface IhrDisease {
  icd_11_code: string;
  name_en: string;
  name_ar?: string;
}

export interface IhrEvent {
  case_id?: string;
  source?: string;
  description?: string;
  disease?: IhrDisease;
  event_date?: string;
  location?: IhrLocation;
  cases?: Partial<Record<'confirmed' | 'probable' | 'suspected', number>>;
  actions_taken?: string[];
}

export interface IhrReport {
  report_id: string;
  country: string;
  report_type: string;
  report_date: string;
  generated_at: string;
  event_date?: string;
  period?: { start: string; end: string };
  events: IhrEvent[];
  summary: Record<string, number | string>;
}

export interface IhrReportResponse {
  report: IhrReport;
  spar_xml?: string;
}

export interface IhrSubmitResult extends IhrReportResponse {
  report_id: string;
  status: string;
  channel: string;
  submitted_at: string;
  receipt: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  message?: string;
}