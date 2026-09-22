import EmergencyIcon from '@mui/icons-material/EmergencyShare';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import AnchorIcon from '@mui/icons-material/Anchor';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import MedicationIcon from '@mui/icons-material/Medication';
import ScienceIcon from '@mui/icons-material/Science';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FlightIcon from '@mui/icons-material/Flight';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import PublicHealthIconSafe from '@mui/icons-material/Public';
import BiotechIcon from '@mui/icons-material/Biotech';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HistoryIcon from '@mui/icons-material/History';
import RiskIcon from '@mui/icons-material/Insights';
import type { RoleLayoutConfig } from './core';

export const ROLE_LAYOUT_CONFIG: Partial<Record<string, RoleLayoutConfig>> = {
  EOC_OPERATOR: {
    title: 'مشغّل مركز الطوارئ',
    subtitle: 'EOC Operator',
    brand: 'وزارة الصحة الاتحادية',
    color: '#c63a3a',
    nav: [
      { label: 'البلاغات والطوارئ', target: '/app/emergency', icon: <EmergencyIcon /> },
      { label: 'لوحة مكافحة الأوبئة', target: '/app/epidemic-dashboard', icon: <HealthAndSafetyIcon /> },
      { label: 'صحة الموانئ', target: '/app/port-health', icon: <AnchorIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  QUARANTINE_INSPECTOR: {
    title: 'مفتش الحجر الصحي',
    subtitle: 'Quarantine Inspector',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0B5ED7',
    nav: [
      { label: 'لوحة التفتيش', target: '/app/quarantine-inspector', icon: <SearchIcon /> },
      { label: 'الفحوصات', target: '/app/screening', icon: <FactCheckIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  CLINIC_DOCTOR: {
    title: 'عيادة الحجر الصحي',
    subtitle: 'Quarantine Clinic Officer',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0e7490',
    nav: [
      { label: 'قرارات الإحالة', target: '/app/clinic/dashboard', icon: <DashboardIcon /> },
      {
        label: 'سجل العيادة',
        icon: <LocalHospitalIcon />,
        children: [
          { label: 'تسجيل حالة', target: '/app/clinic/register' },
          { label: 'سجل الإحالات', target: '/app/clinic?tab=referrals' },
          { label: 'سجل الزيارات', target: '/app/clinic?tab=visits' },
        ],
      },
      { label: 'العزل والحجر', target: '/app/clinic/isolation', icon: <VaccinesIcon /> },
      { label: 'الشهادات الصحية', target: '/app/clinic/certificates', icon: <VerifiedUserIcon /> },
      { label: 'التطعيم الدولي', target: '/app/vaccination', icon: <VaccinesIcon /> },
      { label: 'الأدوية والمخزون', target: '/app/clinic/medications', icon: <MedicationIcon /> },
      { label: 'طلبات المختبر', target: '/app/clinic/lab', icon: <ScienceIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  CARRIER: {
    title: 'بوابة شركات الطيران',
    subtitle: 'Airline Carrier Portal',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0B5ED7',
    nav: [
      { label: 'بوابة الشركة', target: '/app/carrier', icon: <FlightTakeoffIcon /> },
      { label: 'الرحلات والنقل', target: '/app/carriers', icon: <FlightIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  IHR_NFP: {
    title: 'نقطة الاتصال الوطنية (NFP)',
    subtitle: 'National IHR Focal Point',
    brand: 'وزارة الصحة الاتحادية – السودان',
    color: '#0c7f6a',
    nav: [
      { label: 'لوحة أحداث IHR', target: '/app/integration/who/events', icon: <MedicalServicesIcon /> },
      { label: 'لوحة WHO', target: '/app/integration/who', icon: <PublicHealthIconSafe /> },
      { label: 'مؤشرات SPAR', target: '/app/integration/who/spar', icon: <FactCheckIcon /> },
      { label: 'أمراض ICD-11', target: '/app/integration/who/diseases', icon: <BiotechIcon /> },
      { label: 'التقارير', target: '/app/food-surveillance', icon: <AssessmentIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  WHO_INTEGRATION_OFFICER: {
    title: 'مسؤول تكامل WHO',
    subtitle: 'WHO Integration Officer',
    brand: 'وزارة الصحة الاتحادية – السودان',
    color: '#1565c0',
    nav: [
      { label: 'لوحة WHO', target: '/app/integration/who', icon: <PublicHealthIconSafe /> },
      { label: 'أحداث IHR (مراقبة)', target: '/app/integration/who/events', icon: <MedicalServicesIcon /> },
      { label: 'أمراض ICD-11', target: '/app/integration/who/diseases', icon: <BiotechIcon /> },
      { label: 'مؤشرات SPAR', target: '/app/integration/who/spar', icon: <FactCheckIcon /> },
      { label: 'سجلات المزامنة', target: '/app/integration/who/diseases', icon: <HistoryIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  NATIONAL_SURVEILLANCE_OFFICER: {
    title: 'مسؤول الترصد الصحي القومي',
    subtitle: 'National Surveillance Officer',
    brand: 'وزارة الصحة الاتحادية – السودان',
    color: '#0e8a72',
    nav: [
      { label: 'لوحة أحداث IHR', target: '/app/integration/who/events', icon: <MedicalServicesIcon /> },
      { label: 'لوحة WHO', target: '/app/integration/who', icon: <PublicHealthIconSafe /> },
      { label: 'مؤشرات SPAR', target: '/app/integration/who/spar', icon: <FactCheckIcon /> },
      { label: 'الترصد', target: '/app/surveillance', icon: <RiskIcon /> },
      { label: 'التقارير', target: '/app/food-surveillance', icon: <AssessmentIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  SECTOR_IHR_OFFICER: {
    title: 'مسؤول IHR بالقطاع',
    subtitle: 'Sector IHR Officer',
    brand: 'وزارة الصحة الاتحادية – السودان',
    color: '#0e8a72',
    nav: [
      { label: 'لوحة أحداث IHR', target: '/app/integration/who/events', icon: <MedicalServicesIcon /> },
      { label: 'الترصد', target: '/app/surveillance', icon: <RiskIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  POE_HEALTH_OFFICER: {
    title: 'مسؤول الصحة بالمنفذ',
    subtitle: 'Point of Entry Health Officer',
    brand: 'وزارة الصحة الاتحادية – السودان',
    color: '#2f6dd0',
    nav: [
      { label: 'لوحة أحداث IHR', target: '/app/integration/who/events', icon: <MedicalServicesIcon /> },
      { label: 'الفحص الصحي', target: '/app/screening', icon: <FactCheckIcon /> },
      { label: 'العيادة', target: '/app/clinic/dashboard', icon: <MedicalServicesIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
};