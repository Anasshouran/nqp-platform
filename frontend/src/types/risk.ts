export interface RiskAssessment {
  id: string;
  screening?: string;
  passport_number?: string;
  traveler_name?: string;
  port_name?: string;
  risk_level: string;
  risk_score: number;
  decision_factors?: Record<string, unknown>;
  recommendation: string;
  assessed_at: string;
}

export interface RiskSettings {
  temp_weight: number;
  spo2_weight: number;
  symptom_weight: number;
  origin_weight: number;
  vaccine_weight: number;
  yellow_threshold: number;
  red_threshold: number;
  red_temp_threshold: number;
  red_spo2_threshold: number;
}
