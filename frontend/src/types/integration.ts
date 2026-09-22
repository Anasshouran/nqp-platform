export interface ExternalEntity {
  id: string;
  name: string;
  api_key?: string;
  is_active: boolean;
}

export interface IntegrationLog {
  id: string;
  integration_name: string;
  request_type: string;
  request_payload?: Record<string, unknown>;
  response_payload?: Record<string, unknown>;
  status_code?: number | null;
  request_timestamp: string;
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
