export type IHREventStatus =
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'NATIONAL_ASSESSMENT'
  | 'NFP_REVIEW'
  | 'NOTIFIABLE'
  | 'SUBMITTED'
  | 'FOLLOW_UP'
  | 'CLOSED';

export type IHREventType = 'INFECTIOUS_DISEASE' | 'ZOONOSIS' | 'FOODBORNE' | 'CHEMICAL' | 'RADIOLOGICAL' | 'UNKNOWN';

export type IHRRiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type NfpType = 'PRIMARY' | 'ALTERNATE' | 'DEPUTY';

export interface RiskAssessment {
  id: string;
  event: string;
  hazard?: string;
  geographic_spread?: string;
  transmission?: string;
  international_travel?: string;
  poe_impact?: string;
  response_capacity?: string;
  overall_risk?: IHRRiskLevel;
  notes?: string;
  assessed_by?: string;
  assessed_at?: string;
}

export interface IhrEvent {
  id: string;
  event_number: string;
  emergency_event?: string | null;
  event_type: IHREventType;
  title: string;
  description?: string;
  disease?: string | null;
  sector?: string | null;
  port?: string | null;
  locality?: string | null;
  date_detected?: string | null;
  date_verified?: string | null;
  cases_suspected: number;
  cases_probable: number;
  cases_confirmed: number;
  deaths: number;
  risk_level: IHRRiskLevel;
  status: IHREventStatus;
  reported_by?: string;
  reviewed_by?: string | null;
  nfp_approved_by?: string | null;
  submitted_to_who_at?: string | null;
  who_reference?: string | null;
  is_international_impact: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  risk_assessment?: RiskAssessment | null;
}

export interface NationalFocalPoint {
  id: string;
  user: string;
  user_email: string;
  user_name: string;
  nfp_type: NfpType;
  phone?: string;
  email?: string;
  institution?: string;
  is_active: boolean;
  appointed_at?: string;
}

export interface SPARIndicator {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description?: string;
  max_score: number;
  order: number;
  is_active: boolean;
}

export interface SPARAssessment {
  id: string;
  year: number;
  indicator: string;
  indicator_code: string;
  indicator_name_ar: string;
  score: number;
  evidence?: string;
  gaps?: string;
  action_plan?: string;
  comments?: string;
  assessed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SPARYearReport {
  year: number;
  overall_score: number;
  assessment_count: number;
  indicators: SPARAssessment[];
}

export const IHR_EVENT_STATUS_LABELS: Record<IHREventStatus, string> = {
  DRAFT: 'مسودة',
  UNDER_REVIEW: 'قيد المراجعة',
  NATIONAL_ASSESSMENT: 'في التقييم الوطني',
  NFP_REVIEW: 'بمراجعة NFP',
  NOTIFIABLE: 'واجب الإبلاغ',
  SUBMITTED: 'أُرسل للصحة العالمية',
  FOLLOW_UP: 'متابعة',
  CLOSED: 'مغلق',
};

export const IHR_EVENT_TYPE_LABELS: Record<IHREventType, string> = {
  INFECTIOUS_DISEASE: 'مرض معدٍ',
  ZOONOSIS: 'مرض حيواني المنشأ',
  FOODBORNE: 'مرض منقول بالغذاء',
  CHEMICAL: 'حادث كيميائي',
  RADIOLOGICAL: 'حادث إشعاعي',
  UNKNOWN: 'غير محدد',
};

export const IHR_RISK_LABELS: Record<IHRRiskLevel, string> = {
  LOW: 'منخفض',
  MODERATE: 'متوسط',
  HIGH: 'مرتفع',
  CRITICAL: 'حرج',
};

export const NFP_TYPE_LABELS: Record<NfpType, string> = {
  PRIMARY: 'أساسية',
  ALTERNATE: 'بديلة',
  DEPUTY: 'نائب',
};