export interface EmergencyAlert {
  id: string;
  traveler: string | null;
  port: string | null;
  alert_type: string;
  description: string;
  location_geo: Record<string, unknown> | null;
  status: string;
  triggered_at: string;
  resolved_at: string | null;
}

export interface EmergencyEvent {
  id: string;
  event_number: string;
  title: string;
  description: string;
  event_type: string;
  source_type: string;
  source_id: string | null;
  severity: string;
  status: string;
  location_port: string | null;
  port_code: string | null;
  affected_travelers: string[];
  response_plan: string | null;
  reported_by: string | null;
  reported_at: string;
  summary: string;
  lessons_learned: string;
  recommendations: string;
  closed_at: string | null;
  team: { user_id: string; role: string }[];
}

export interface KillSwitch {
  id: string;
  port: string;
  activated_by: string | null;
  reason: string;
  activated_at: string;
  deactivated_at: string | null;
}

export interface ResponsePlan {
  id: string;
  name: string;
  description: string;
  steps: string[];
  required_resources: Record<string, unknown>;
  is_active: boolean;
}
