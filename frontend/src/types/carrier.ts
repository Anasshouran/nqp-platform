export interface Flight {
  id: string;
  flight_number: string;
  carrier?: string;
  carrier_name?: string;
  flight_type: string;
  origin_code?: string;
  origin_country?: string;
  origin_country_name?: string;
  destination_port?: string;
  destination_port_name?: string;
  scheduled_departure?: string | null;
  scheduled_arrival?: string | null;
  status: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface Carrier {
  id: string;
  name: string;
  name_en?: string;
  company_type: string;
  company_type_label?: string;
  country?: string | null;
  country_name?: string | null;
  iata_code?: string | null;
  icao_code?: string | null;
  contact_info?: Record<string, unknown>;
  email?: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  ports?: string[];
  ports_names?: string[];
  registration_status?: string;
  registration_status_label?: string;
  is_active: boolean;
}

export type CarrierPayload = Omit<Carrier, 'id' | 'company_type_label' | 'country_name' | 'ports_names' | 'registration_status_label' | 'registration_status' | 'is_active'> & {
  registration_status?: string;
  is_active?: boolean;
};

export interface CarrierProfile {
  id: string;
  name: string;
  iata_code?: string | null;
  icao_code?: string | null;
  email?: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  is_active: boolean;
}

export interface CarrierApiKeyInfo {
  api_key: string | null;
  created_at?: string | null;
  last_use_at?: string | null;
  last_use_ip?: string | null;
}

export interface PassengerManifest {
  id: string;
  flight?: string;
  file?: string | null;
  status: string;
  total_passengers: number;
  error_report?: Record<string, unknown> | null;
  processed_at?: string | null;
}

export interface HealthNotice {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  published_at: string;
  expiry_date?: string | null;
  is_active: boolean;
  acknowledged?: boolean | null;
}

export interface UpcomingFlight {
  id: string;
  flight_number: string;
  route: string;
  scheduled_arrival: string;
  passengers: number;
  status: string;
  manifest_status?: string | null;
}

export interface CarrierDashboardStats {
  upcoming_today: number;
  expected_passengers: number;
  manifest_status: {
    ready: number;
    missing: number;
    total: number;
  };
  notices: {
    active: number;
    unacknowledged: number;
  };
  pre_registration_rate: number;
  api: {
    configured: boolean;
    last_use_at?: string | null;
  };
}