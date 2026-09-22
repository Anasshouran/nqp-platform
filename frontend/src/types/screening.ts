export interface HealthScreening {
  id: string;
  traveler: string | null;
  traveler_name: string;
  passport_number: string;
  port: string | null;
  officer: string | null;
  body_temperature: number | null;
  oxygen_saturation: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  observed_symptoms: string[] | Record<string, unknown>;
  officer_notes: string;
  screened_at: string;
}
