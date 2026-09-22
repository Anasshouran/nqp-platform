import type { NationalCommandReport } from '../../types/commandCenter';

export const buildNationalReport = (api?: {
  kpis?: {
    passengers?: number;
    suspected?: number;
    confirmed?: number;
    certificates?: number;
    sectors?: number;
    airports?: { flights_today?: number; screenings?: number; referrals?: number; suspected?: number };
  };
}): NationalCommandReport => {
  const passengers = api?.kpis?.passengers ?? 1248;
  const suspected = api?.kpis?.suspected ?? 8;
  const certificates = api?.kpis?.certificates ?? 240;
  const flights = api?.kpis?.airports?.flights_today ?? 146;

  return {
    window: 'اليوم',
    last_updated: new Date().toISOString(),
    kpis: {
      sectors: 6,
      stations: 20,
      total_screened: passengers,
      food_shipments: 186,
      samples: 74,
      critical_cases: suspected,
      epidemic_alerts: 3,
      pending_transactions: 42,
    },
    sectors: [
      { id: 'red-sea', name: 'البحر الأحمر', region: 'شرق', status: 'WATCH', ports: 5, stations: 9, passengers: 5640, screenings: 4380, suspected: 4, referred: 2, quarantine: 3, readiness: 92, mapX: 95, mapY: 20, trend: '▲ +12%' },
      { id: 'kassala', name: 'كسلا', region: 'شرق', status: 'WATCH', ports: 3, stations: 7, passengers: 3910, screenings: 2980, suspected: 3, referred: 1, quarantine: 2, readiness: 88, mapX: 90, mapY: 55, trend: '— ثابت' },
      { id: 'gedaref', name: 'القضارف', region: 'شرق', status: 'NORMAL', ports: 2, stations: 6, passengers: 2980, screenings: 2450, suspected: 1, referred: 0, quarantine: 0, readiness: 90, mapX: 84, mapY: 67, trend: '▼ -3%' },
      { id: 'khartoum', name: 'الخرطوم', region: 'الوسط', status: 'CRITICAL', ports: 6, stations: 12, passengers: 7460, screenings: 6100, suspected: 7, referred: 4, quarantine: 5, readiness: 94, mapX: 66, mapY: 53, trend: '▲ +21%' },
      { id: 'northern', name: 'الشمالية', region: 'الشمال', status: 'NORMAL', ports: 2, stations: 5, passengers: 1180, screenings: 980, suspected: 0, referred: 0, quarantine: 0, readiness: 86, mapX: 53, mapY: 23, trend: '— ثابت' },
      { id: 'white-nile', name: 'النيل الأبيض', region: 'الوسط', status: 'WATCH', ports: 2, stations: 6, passengers: 2020, screenings: 1680, suspected: 2, referred: 1, quarantine: 1, readiness: 88, mapX: 67, mapY: 73, trend: '▲ +8%' },
    ],
    ports: [
      { id: 'p1', name: 'مطار الخرطوم الدولي', type: 'AIRPORT', sector: 'الخرطوم', online: true, passengers: 5200, flights: 88, screenings: 5050, suspected: 6, referred: 4, completion: 96, status: 'CRITICAL' },
      { id: 'p2', name: 'مطار بورتسودان الدولي', type: 'AIRPORT', sector: 'البحر الأحمر', online: true, passengers: 2820, flights: 24, screenings: 2740, suspected: 3, referred: 2, completion: 94, status: 'WATCH' },
      { id: 'p3', name: 'مطار كسلا الدولي', type: 'AIRPORT', sector: 'كسلا', online: true, passengers: 980, flights: 9, screenings: 940, suspected: 1, referred: 0, completion: 91, status: 'NORMAL' },
      { id: 'p4', name: 'مطار الأبيض', type: 'AIRPORT', sector: 'شمال كردفان', online: true, passengers: 640, flights: 6, screenings: 600, suspected: 0, referred: 0, completion: 90, status: 'NORMAL' },
      { id: 's1', name: 'ميناء بورتسودان البحري', type: 'SEAPORT', sector: 'البحر الأحمر', online: true, passengers: 1420, flights: 14, screenings: 1380, suspected: 2, referred: 1, completion: 93, status: 'WATCH' },
      { id: 's2', name: 'ميناء سواكن', type: 'SEAPORT', sector: 'البحر الأحمر', online: false, passengers: 0, flights: 0, screenings: 0, suspected: 0, referred: 0, completion: 0, status: 'NORMAL' },
      { id: 'l1', name: 'معبر القلابات', type: 'LAND_PORT', sector: 'القضارف', online: true, passengers: 1870, flights: 0, screenings: 1750, suspected: 1, referred: 0, completion: 90, status: 'NORMAL' },
      { id: 'l2', name: 'معبر عرقي', type: 'LAND_PORT', sector: 'كسلا', online: true, passengers: 1450, flights: 0, screenings: 1330, suspected: 2, referred: 1, completion: 89, status: 'WATCH' },
      { id: 'l3', name: 'معبر الطينة', type: 'LAND_PORT', sector: 'غرب دارفور', online: false, passengers: 0, flights: 0, screenings: 0, suspected: 0, referred: 0, completion: 0, status: 'NORMAL' },
    ],
    screening: {
      total_screened: passengers,
      arrivals: Math.round(passengers * 0.58),
      departures: Math.round(passengers * 0.34),
      transit: Math.round(passengers * 0.08),
      total_flights: flights,
      healthy: passengers - suspected - 4,
      suspected,
      referred: Math.round(suspected * 0.58),
      quarantine: 9,
      isolation: 4,
      certificates,
      violations: 23,
      avg_check_minutes: 3.8,
      digital_completion_pct: 87,
      initial_check: passengers,
      temp_measured: Math.round(passengers * 0.94),
      clinical_exam: Math.round(passengers * 0.62),
      symptoms_recorded: suspected + 26,
      daily_curve: [
        { date: 'السبت', screened: 2330, suspected: 1 },
        { date: 'الأحد', screened: 2620, suspected: 2 },
        { date: 'الاثنين', screened: 2410, suspected: 1 },
        { date: 'الثلاثاء', screened: 2890, suspected: 3 },
        { date: 'الأربعاء', screened: 2740, suspected: 2 },
        { date: 'الخميس', screened: 3110, suspected: 2 },
        { date: 'الجمعة', screened: 2320, suspected: 1 },
      ],
      outcome_dist: { healthy: 95, suspected: 4, referred: 1 },
    },
    surveillance: {
      top_symptoms: [
        { name: 'حمى', count: 9, pct: 38 },
        { name: 'سعال', count: 6, pct: 25 },
        { name: 'صداع', count: 4, pct: 17 },
        { name: 'إسهال', count: 3, pct: 12 },
        { name: 'طفح جلدي', count: 2, pct: 8 },
      ],
      top_diseases: [
        { name: 'ملاريا', count: 11, pct: 42 },
        { name: 'حمى الضنك', count: 6, pct: 23 },
        { name: 'كوفيد-19', count: 4, pct: 15 },
        { name: 'حمى صفراء', count: 3, pct: 12 },
        { name: 'كوليرا', count: 2, pct: 8 },
      ],
      cases_by_port: [
        { port: 'مطار الخرطوم', count: 6 },
        { port: 'مطار بورتسودان', count: 3 },
        { port: 'ميناء بورتسودان', count: 2 },
        { port: 'معبر عرقي', count: 2 },
        { port: 'معبر القلابات', count: 1 },
      ],
      cases_by_sector: [
        { sector: 'الخرطوم', count: 7 },
        { sector: 'البحر الأحمر', count: 4 },
        { sector: 'كسلا', count: 3 },
        { sector: 'النيل الأبيض', count: 2 },
        { sector: 'القضارف', count: 1 },
      ],
      daily_trend: [12, 16, 14, 19, 22, 20, 24],
      weekly_trend: [78, 82, 91, 88, 104, 112, 126],
      monthly_trend: [310, 340, 322, 356, 380, 401, 428],
      epidemic_alerts: [
        { id: 'e1', title: 'ارتفاع غير طبيعي في الحمى بمطار الخرطوم', severity: 'HIGH', time: 'قبل 20 دقيقة', port: 'مطار الخرطوم' },
        { id: 'e2', title: 'اشتباه حمى الضنك — بورتسودان', severity: 'MODERATE', time: 'قبل ساعة', port: 'ميناء بورتسودان' },
        { id: 'e3', title: 'حالة كوليرا مشتبهة بمعبر عرقي', severity: 'HIGH', time: 'قبل ساعتين', port: 'معبر عرقي' },
      ],
      follow_up: 12,
      early_warning_index: 68,
    },
    quarantine: {
      current_cases: 9,
      new_cases: 4,
      ended_cases: 6,
      avg_duration_days: 7.5,
      centers: 6,
      capacity: 84,
      occupancy_pct: 64,
      transferred_to_isolation: 3,
      need_follow_up: 5,
    },
    emergency: {
      id: 'EM-2026-08-13',
      port: 'مطار الخرطوم الدولي',
      title: 'استنفار وبائي — حمى نزفية مشتبهة',
      case_type: 'حمى نزفية',
      cases_count: 3,
      reported_at: '2026-08-13T08:20:00Z',
      severity: 'CRITICAL',
      action: 'فحص مخبري عاجل + عزل + تتبع مخالطين',
      responsible: 'د. عبدالله مكي',
      response: 'IN_PROGRESS',
    },
    critical_cases: [
      { id: 'c1', number: 'QC-2026-1041', port: 'مطار الخرطوم', case_type: 'حمى نزفية مشتبهة', severity: 'CRITICAL', registered_at: '2026-08-12T09:10:00Z', action: 'حجر صحي فوري + فحص مخبري', referred_to: 'مستشفى الفحص المركزي', follow_up: 'ESCALATED' },
      { id: 'c2', number: 'QC-2026-1038', port: 'ميناء بورتسودان', case_type: 'اشتباه كوليرا', severity: 'CRITICAL', registered_at: '2026-08-12T08:40:00Z', action: 'عزل + أخذ عينات', referred_to: 'معمل بورتسودان المرجعي', follow_up: 'IN_PROGRESS' },
      { id: 'c3', number: 'QC-2026-1035', port: 'معبر عرقي', case_type: 'حمى عالية المقاومة', severity: 'HIGH', registered_at: '2026-08-12T07:55:00Z', action: 'تتبع مخالطين', referred_to: 'وحدة الترصد بكسلا', follow_up: 'OPEN' },
      { id: 'c4', number: 'QC-2026-1029', port: 'مطار الخرطوم', case_type: 'طفح جلدي مجهول', severity: 'HIGH', registered_at: '2026-08-12T06:30:00Z', action: 'عزل احترازي', referred_to: 'مستشفى التأمين الصحي', follow_up: 'IN_PROGRESS' },
    ],
    performance: {
      ports_readiness: 91,
      screening_completion: 94,
      avg_service_minutes: 3.8,
      e_transactions_pct: 87,
      compliance: 96,
      response_rate: 93,
      sector_scores: [
        { name: 'البحر الأحمر', score: 92 },
        { name: 'الخرطوم', score: 94 },
        { name: 'كسلا', score: 88 },
        { name: 'القضارف', score: 90 },
        { name: 'الشمالية', score: 86 },
        { name: 'شمال كردفان', score: 87 },
      ],
      station_scores: [
        { name: 'مطار الخرطوم', score: 96 },
        { name: 'مطار بورتسودان', score: 93 },
        { name: 'ميناء بورتسودان', score: 91 },
        { name: 'معبر القلابات', score: 89 },
        { name: 'معبر عرقي', score: 87 },
      ],
      staff_performance: [
        { name: 'د. أحمد النور', role: 'مفتش صحي', score: 97 },
        { name: 'د. سارة عبدالله', role: 'أخصائي مختبر', score: 95 },
        { name: 'م. عمر خالد', role: 'مراقب منفذ', score: 92 },
        { name: 'أ. فاطمة حسن', role: 'كاتب فحص', score: 90 },
      ],
    },
    ai: {
      risk_level: 'HIGH',
      risk_score: 72,
      prediction: 'من المتوقع ارتفاع الحالات الوافدة من شرق أفريقيا خلال 7 أيام بنسبة ~15%',
      anomalies: [
        'زيادة غير معتادة في حالات الحمى بمطار الخرطوم (+38% عن متوسط 7 أيام)',
        'نشاط إنذار مبكر بمعبر عرقي يفوق المعدل الموسمي',
      ],
      daily_summary: 'الوضع العام مستقر مع مؤشرات إنذار مرتفعة في الخرطوم وشرق البلاد. تم فحص 18,420 مسافراً، مع 12 حالة مشتبهة و4 حجر صحي. أوصي برفع الجاهزية بمطار الخرطوم.',
      recommendations: [
        'تعزيز الكادر الليلي بمطار الخرطوم',
        'تفعيل تتبع المخالطين لحالات الحمى النزفية',
        'مراجعة جاهزية مخزون العينات بمعمل بورتسودان',
        'عقد اجتماع طوارئ لقطاع البحر الأحمر',
      ],
      forecast: [
        { label: 'اليوم', value: 12 },
        { label: 'غداً', value: 14 },
        { label: '+3 أيام', value: 17 },
        { label: '+7 أيام', value: 15 },
      ],
    },
    alerts: [
      { id: 'a1', title: 'حالة وبائية جديدة', body: 'حمى نزفية مشتبهة بمطار الخرطوم — تتطلب تدخلاً فورياً', severity: 'CRITICAL', time: 'قبل 20 دقيقة' },
      { id: 'a2', title: 'ارتفاع غير طبيعي في الأعراض', body: 'الحمى أعلى من المتوسط بـ38% في الخرطوم', severity: 'HIGH', time: 'قبل ساعة' },
      { id: 'a3', title: 'منفذ يحتاج تدخل', body: 'مطار الخرطوم يتجاوز سعة الاستيعاب', severity: 'HIGH', time: 'قبل ساعتين' },
      { id: 'a4', title: 'تعطل نظام', body: 'بوابة الفحص بمعبر الطينة خارج الخدمة', severity: 'MODERATE', time: 'قبل 4 ساعات' },
      { id: 'a5', title: 'حالات حجر جديدة', body: '9 حالات دخلت الحجر الصحي اليوم', severity: 'MODERATE', time: 'قبل 5 ساعات' },
      { id: 'a6', title: 'مخالفات حرجة', body: '3 مخالفات عدم التزام بالفحص بمعبر عرقي', severity: 'MODERATE', time: 'قبل 6 ساعات' },
    ],
  };
};