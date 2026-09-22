export interface Traveler {
  id: string;
  passport_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  date_of_birth: string;
  nationality: string;
  phone: string;
  email: string;
  medical_history: Record<string, unknown>;
  registration_status: string;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
}
