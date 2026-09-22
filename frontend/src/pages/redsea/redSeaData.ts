import type { OpsStatus } from '../../types/commandCenter';

export type RedSeaStationType = 'SEAPORT' | 'AIRPORT' | 'LAND_PORT';

export interface RedSeaStation {
  id: string;
  name: string;
  type: RedSeaStationType;
  status: OpsStatus;
  online: boolean;
  screens: number;
  suspected: number;
  referred: number;
  readiness: number;
  detail: string;
}

export interface RedSeaShip {
  id: string;
  name: string;
  flag: string;
  origin: string;
  cargo: string;
  status: 'PENDING' | 'INSPECTED' | 'APPROVED';
  crew: number;
  passengers: number;
  free_pratique: boolean;
}

export interface RedSeaFlight {
  id: string;
  flight: string;
  origin: string;
  pax: number;
  screened: number;
  status: 'ARRIVED' | 'CHECKED' | 'CLEARED';
}

export interface RedSeaAlert {
  id: string;
  title: string;
  body: string;
  severity: 'critical' | 'medium' | 'normal';
  time: string;
}

export interface RedSeaReport {
  last_updated: string;
  manager: string;
  kpis: {
    stations: number;
    seaports: number;
    passengers: number;
    screenings: number;
    food_shipments: number;
    lab_samples: number;
    suspected: number;
    quarantine: number;
  };
  stations: RedSeaStation[];
  ships: RedSeaShip[];
  flights: RedSeaFlight[];
  food: { imports: number; exports: number; in_progress: number; released: number; rejected: number; noncomplying: number };
  lab: { received: number; processing: number; completed: number; noncomplying: number; avg_turnover_days: number };
  surveillance: { suspected: number; confirmed: number; active_alerts: number; top_diseases: { name: string; count: number; pct: number }[]; daily_curve: { date: string; screened: number; suspected: number }[] };
  vectors: { high_risk_sites: number; active_campaigns: number; completed_sprays: number; reported_sites: number; water_sources: number };
  quarantine: { current: number; new_cases: number; ended: number; beds: number; centers: number; occupancy_pct: number; transferred_to_isolation: number };
  emergency: { id: string; port: string; title: string; severity: 'CRITICAL'; action: string; responsible: string } | null;
  alerts: RedSeaAlert[];
  departments: { name: string; score: number }[];
  staff: { on_duty: number; inspectors: number; lab_techs: number; nurses: number; admin: number };
  revenue: { total: number; certificates: number; violations: number };
}

export const buildRedSeaReport = (api?: {
  kpis?: { passengers?: number; suspected?: number; confirmed?: number };
}): RedSeaReport => {
  const passengers = api?.kpis?.passengers ?? 5640;
  const suspected = api?.kpis?.suspected ?? 4;

  return {
    last_updated: new Date().toISOString(),
    manager: 'مدير قطاع البحر الأحمر',
    kpis: {
      stations: 9,
      seaports: 5,
      passengers,
      screenings: 4380,
      food_shipments: 22,
      lab_samples: 18,
      suspected,
      quarantine: 3,
    },
    stations: [
      { id: 'rs-1', name: 'ميناء بورتسودان البحري', type: 'SEAPORT', status: 'WATCH', online: true, screens: 1380, suspected: 2, referred: 1, readiness: 93, detail: '12 سفينة · 42 حاوية مبردة' },
      { id: 'rs-2', name: 'ميناء سواكن', type: 'SEAPORT', status: 'NORMAL', online: true, screens: 610, suspected: 1, referred: 0, readiness: 88, detail: '5 سفن · أعمال توسعة' },
      { id: 'rs-3', name: 'ميناء أوسيف (البحر الأحمر الجديد)', type: 'SEAPORT', status: 'OFFLINE', online: false, screens: 0, suspected: 0, referred: 0, readiness: 0, detail: 'قيد الإنشاء' },
      { id: 'rs-4', name: 'مطار بورتسودان الدولي', type: 'AIRPORT', status: 'WATCH', online: true, screens: 2740, suspected: 3, referred: 2, readiness: 94, detail: '24 رحلة يومياً' },
      { id: 'rs-5', name: 'معبر الجنينة البحري (حركة الشحن)', type: 'LAND_PORT', status: 'NORMAL', online: true, screens: 240, suspected: 0, referred: 0, readiness: 90, detail: '4 شاحنات / يوم' },
      { id: 'rs-6', name: 'محطة التفتيش الصحية — ميناء الحاويات', type: 'SEAPORT', status: 'CRITICAL', online: true, screens: 810, suspected: 1, referred: 1, readiness: 79, detail: 'ازدحام حاويات + تأخر سحب عينات' },
      { id: 'rs-7', name: 'مطار سواكن الجوي', type: 'AIRPORT', status: 'NORMAL', online: true, screens: 180, suspected: 0, referred: 0, readiness: 85, detail: 'رحلات داخلية متقطعة' },
    ],
    ships: [
      { id: 'sh-1', name: 'MSC Yasmine', flag: 'Liberia', origin: 'جدة', cargo: 'حاويات أغذية', status: 'INSPECTED', crew: 24, passengers: 0, free_pratique: false },
      { id: 'sh-2', name: 'Maersk Khartoum', flag: 'Panama', origin: 'دبي', cargo: 'غلال وحبوب', status: 'APPROVED', crew: 28, passengers: 0, free_pratique: true },
      { id: 'sh-3', name: 'Red Sea Star', flag: 'السودان', origin: 'بورتسودان', cargo: 'صادرات سمسم', status: 'PENDING', crew: 18, passengers: 0, free_pratique: false },
      { id: 'sh-4', name: 'Medina Express', flag: 'مصر', origin: 'الغردقة', cargo: 'ركاب + شحن', status: 'INSPECTED', crew: 22, passengers: 340, free_pratique: false },
      { id: 'sh-5', name: 'Al Seef', flag: 'السودان', origin: 'بورتسودان', cargo: 'مواشي حية', status: 'PENDING', crew: 15, passengers: 0, free_pratique: false },
    ],
    flights: [
      { id: 'fl-1', flight: 'SD-204', origin: 'جدة', pax: 220, screened: 220, status: 'CLEARED' },
      { id: 'fl-2', flight: 'TK-684', origin: 'إسطنبول', pax: 180, screened: 178, status: 'CHECKED' },
      { id: 'fl-3', flight: 'ET-412', origin: 'أديس أبابا', pax: 145, screened: 145, status: 'CLEARED' },
      { id: 'fl-4', flight: 'SV-552', origin: 'الرياض', pax: 260, screened: 252, status: 'CHECKED' },
      { id: 'fl-5', flight: 'E6-721', origin: 'الخرطوم', pax: 120, screened: 120, status: 'ARRIVED' },
    ],
    food: { imports: 14, exports: 8, in_progress: 6, released: 13, rejected: 1, noncomplying: 3 },
    lab: { received: 24, processing: 18, completed: 6, noncomplying: 2, avg_turnover_days: 2.1 },
    surveillance: {
      suspected,
      confirmed: 1,
      active_alerts: 2,
      top_diseases: [
        { name: 'ملاريا', count: 6, pct: 40 },
        { name: 'حمى الضنك', count: 4, pct: 27 },
        { name: 'كوفيد-19', count: 2, pct: 13 },
        { name: 'حمى البحر الأحمر (ريفت)', count: 2, pct: 13 },
        { name: 'كوليرا', count: 1, pct: 7 },
      ],
      daily_curve: [
        { date: 'السبت', screened: 610, suspected: 0 },
        { date: 'الأحد', screened: 720, suspected: 1 },
        { date: 'الاثنين', screened: 640, suspected: 1 },
        { date: 'الثلاثاء', screened: 830, suspected: 1 },
        { date: 'الأربعاء', screened: 790, suspected: 0 },
        { date: 'الخميس', screened: 900, suspected: 1 },
        { date: 'الجمعة', screened: 560, suspected: 0 },
      ],
    },
    vectors: { high_risk_sites: 4, active_campaigns: 2, completed_sprays: 6, reported_sites: 9, water_sources: 14 },
    quarantine: { current: 3, new_cases: 1, ended: 2, beds: 12, centers: 2, occupancy_pct: 25, transferred_to_isolation: 1 },
    emergency: {
      id: 'EM-RS-2026-08-13',
      port: 'محطة التفتيش الصحية — ميناء الحاويات',
      title: 'ازدحام حرج + تأخر سحب عينات أغذية بالحاويات',
      severity: 'CRITICAL',
      action: 'تعزيز كادر التفتيش + سحب عينات عاجل + أولوية فحص',
      responsible: 'م. عادل محجوب',
    },
    alerts: [
      { id: 'a1', title: 'ازدحام حاويات حرج', body: 'محطة تفتيش ميناء الحاويات تجاوزت سعة التشغيل — 42 حاوية بانتظار الفحص', severity: 'critical', time: 'قبل 30 دقيقة' },
      { id: 'a2', title: 'اشتباه حمى الضنك', body: 'حالة مشتبهة بمطار بورتسودان الدولي أحيلت للمختبر المرجعي', severity: 'medium', time: 'قبل ساعة' },
      { id: 'a3', title: 'نتائج مختبر غير مطابقة', body: 'عينتا أغذية مستوردة من جدة غير مطابقة للمواصفات', severity: 'medium', time: 'قبل ساعتين' },
      { id: 'a4', title: 'صيانة بوابة الفحص', body: 'بوابة قياس الحرارة بميناء سواكن تحتاج معايرة', severity: 'normal', time: 'قبل 5 ساعات' },
    ],
    departments: [
      { name: 'ميناء بورتسودان البحري', score: 93 },
      { name: 'مطار بورتسودان الدولي', score: 94 },
      { name: 'مختبر بورتسودان المرجعي', score: 90 },
      { name: 'الفسح الغذائي والحجر', score: 88 },
      { name: 'الترصد والمكافحة الساحلية', score: 86 },
      { name: 'الإدارات المساندة', score: 91 },
    ],
    staff: { on_duty: 86, inspectors: 34, lab_techs: 12, nurses: 9, admin: 31 },
    revenue: { total: 4125000, certificates: 96, violations: 5 },
  };
};
