const SESSION_KEY = 'nqp_traveler_session';

export interface TravelerSession {
  traveler_id: string;
  passport_number: string;
  full_name: string;
  nationality?: string | null;
  registration_status?: string;
}

export const getTravelerSession = (): TravelerSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as TravelerSession) : null;
  } catch {
    return null;
  }
};

export const setTravelerSession = (session: TravelerSession) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearTravelerSession = () => {
  localStorage.removeItem(SESSION_KEY);
};
