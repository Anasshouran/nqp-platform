import HomeIcon from '@mui/icons-material/Home';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import RuleIcon from '@mui/icons-material/Rule';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BiotechIcon from '@mui/icons-material/Biotech';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import ScienceIcon from '@mui/icons-material/Science';
import DashboardIcon from '@mui/icons-material/Dashboard';
import VerifiedIcon from '@mui/icons-material/Verified';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TimerIcon from '@mui/icons-material/Timer';
import BuildIcon from '@mui/icons-material/Build';
import DescriptionIcon from '@mui/icons-material/Description';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SettingsIcon from '@mui/icons-material/Settings';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import CompareIcon from '@mui/icons-material/Compare';
import PeopleIcon from '@mui/icons-material/People';
import type { RoleLayoutConfig } from './core';

export const ROLE_LAYOUT_CONFIG: Partial<Record<string, RoleLayoutConfig>> = {
  LAB_MANAGER: {
    title: 'مدير المعمل القومي للحجر الصحي',
    subtitle: 'NQLIS Laboratory Manager',
    brand: 'وزارة الصحة الاتحادية',
    color: '#1d7a54',
    nav: [
      { label: 'لوحة NQLIS', target: '/app/laboratory', icon: <HomeIcon /> },
      { label: 'النتائج الحرجة', target: '/app/laboratory#critical', icon: <NotificationsActiveIcon /> },
      { label: 'مراقبة الجودة', target: '/app/laboratory#qc', icon: <FactCheckIcon /> },
      { label: 'عدم المطابقة', target: '/app/laboratory#quality', icon: <RuleIcon /> },
      { label: 'التقارير', target: '/app/laboratory#reports', icon: <AssessmentIcon /> },
      { label: 'معمل رقابة الأغذية (FCLIS)', target: '/app/food-lab', icon: <BiotechIcon /> },
      { label: 'مركز القيادة الصحي', target: '/app/health', icon: <LocalHospitalIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  LAB_TECHNICIAN: {
    title: 'فني المعمل القومي للحجر الصحي',
    subtitle: 'NQLIS Laboratory Technician',
    brand: 'وزارة الصحة الاتحادية',
    color: '#6f42c1',
    nav: [
      { label: 'لوحة NQLIS', target: '/app/laboratory', icon: <HomeIcon /> },
      { label: 'قائمة العمل', target: '/app/laboratory#worklist', icon: <AssignmentTurnedInIcon /> },
      { label: 'استقبال العينات', target: '/app/laboratory#reception', icon: <MoveToInboxIcon /> },
      { label: 'سجل العينات', target: '/app/laboratory#samples', icon: <ScienceIcon /> },
      { label: 'معمل رقابة الأغذية (FCLIS)', target: '/app/food-lab', icon: <BiotechIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  LAB_COORDINATOR: {
    title: 'منسق عينات NQLIS',
    subtitle: 'NQLIS Lab Coordinator',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0d6efd',
    nav: [
      { label: 'لوحة NQLIS', target: '/app/laboratory', icon: <HomeIcon /> },
      { label: 'استقبال العينات', target: '/app/laboratory#reception', icon: <MoveToInboxIcon /> },
      { label: 'سجل العينات', target: '/app/laboratory#samples', icon: <ScienceIcon /> },
      { label: 'معمل رقابة الأغذية (FCLIS)', target: '/app/food-lab', icon: <BiotechIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  LAB_RECEPTIONIST: {
    title: 'موظف استلام عينات NQLIS',
    subtitle: 'NQLIS Lab Receptionist',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0d6efd',
    nav: [
      { label: 'استقبال العينات', target: '/app/laboratory#reception', icon: <MoveToInboxIcon /> },
      { label: 'سجل العينات', target: '/app/laboratory#samples', icon: <ScienceIcon /> },
      { label: 'لوحة NQLIS', target: '/app/laboratory', icon: <HomeIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  LAB_DIRECTOR: {
    title: 'مدير المختبر — FCLIS',
    subtitle: 'Laboratory Director',
    brand: 'وزارة الصحة الاتحادية',
    color: '#4f46e5',
    nav: [
      { label: 'المركز التنفيذي', target: '/app/lab-director#home', icon: <DashboardIcon /> },
      {
        label: 'اعتماد النتائج',
        icon: <VerifiedIcon />,
        children: [
          { label: 'طابور الاعتماد', target: '/app/lab-director#approval.queue' },
          { label: 'المعتمدة', target: '/app/lab-director#approval.approved' },
          { label: 'المرفوضة', target: '/app/lab-director#approval.rejected' },
        ],
      },
      {
        label: 'العينات',
        icon: <Inventory2Icon />,
        children: [
          { label: 'جميع العينات', target: '/app/lab-director#samples.all' },
          { label: 'عينات اليوم', target: '/app/lab-director#samples.today' },
          { label: 'متأخرة', target: '/app/lab-director#samples.overdue' },
        ],
      },
      {
        label: 'الأقسام',
        icon: <AccountTreeIcon />,
        children: [
          { label: 'الأحياء الدقيقة', target: '/app/lab-director#departments.microbiology' },
          { label: 'الكيمياء', target: '/app/lab-director#departments.chemistry' },
          { label: 'الفيزيائية', target: '/app/lab-director#departments.physical' },
        ],
      },
      {
        label: 'مؤشرات SLA',
        icon: <TimerIcon />,
        children: [
          { label: 'نظرة عامة', target: '/app/lab-director#sla.overview' },
          { label: 'متأخرة / معرضة', target: '/app/lab-director#sla.at_risk' },
        ],
      },
      {
        label: 'الأجهزة',
        icon: <BuildIcon />,
        children: [
          { label: 'المعايرة', target: '/app/lab-director#equipment.calibration' },
          { label: 'الحالة', target: '/app/lab-director#equipment.status' },
        ],
      },
      { label: 'الكواشف والمحاليل', target: '/app/reagents', icon: <BiotechIcon /> },
      { label: 'المواصفات والمطابقة', target: '/app/standards', icon: <DescriptionIcon /> },
      {
        label: 'عدم المطابقة',
        icon: <WarningAmberIcon />,
        children: [
          { label: 'الحالات المفتوحة', target: '/app/lab-director#nc.open' },
          { label: 'CAPA', target: '/app/lab-director#nc.capa' },
        ],
      },
      { label: 'التقارير', target: '/app/lab-director#reports', icon: <AssessmentIcon /> },
      { label: 'التنبيهات', target: '/app/lab-director#notifications', icon: <NotificationsActiveIcon /> },
      { label: 'الإعدادات', target: '/app/account', icon: <SettingsIcon /> },
    ],
  },
  NATIONAL_LAB_ADMIN: {
    title: 'الإدارة القومية للمعامل',
    subtitle: 'National Laboratory Administration',
    brand: 'وزارة الصحة الاتحادية – الحجر الصحي القومي',
    color: '#0c7f6a',
    nav: [
      { label: 'اللوحة القومية للمعامل', target: '/app/laboratory/national', icon: <DashboardIcon /> },
      { label: 'لوحة NQLIS', target: '/app/laboratory', icon: <HomeIcon /> },
      { label: 'استقبال العينات', target: '/app/laboratory#reception', icon: <MoveToInboxIcon /> },
      { label: 'سجل العينات', target: '/app/laboratory#samples', icon: <ScienceIcon /> },
      { label: 'قائمة العمل', target: '/app/laboratory#worklist', icon: <AssignmentTurnedInIcon /> },
      { label: 'النتائج الحرجة', target: '/app/laboratory#critical', icon: <NotificationsActiveIcon /> },
      { label: 'مراقبة الجودة', target: '/app/laboratory#qc', icon: <FactCheckIcon /> },
      { label: 'عدم المطابقة', target: '/app/laboratory#quality', icon: <RuleIcon /> },
      { label: 'التقارير', target: '/app/laboratory#reports', icon: <AssessmentIcon /> },
      { label: 'المستخدمون', target: '/app/laboratory#users', icon: <PeopleIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  QUALITY_ASSURANCE: {
    title: 'مسؤول الجودة — FCLIS',
    subtitle: 'Quality Assurance Officer',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0f766e',
    nav: [
      { label: 'لوحة الجودة', target: '/app/quality#home', icon: <DashboardIcon /> },
      {
        label: 'المواصفات',
        icon: <VerifiedIcon />,
        children: [
          { label: 'Microbiological Limits', target: '/app/quality#specs.micro' },
          { label: 'Chemical Limits', target: '/app/quality#specs.chemical' },
          { label: 'Sampling Plans', target: '/app/quality#specs.plans' },
          { label: 'Versions', target: '/app/quality#specs.versions' },
        ],
      },
      {
        label: 'Quality Control',
        icon: <FactCheckIcon />,
        children: [
          { label: 'QC Dashboard', target: '/app/quality#qc.dashboard' },
          { label: 'QC Results', target: '/app/quality#qc.results' },
          { label: 'QC Failures', target: '/app/quality#qc.failures' },
        ],
      },
      { label: 'طرق الاختبار', target: '/app/quality#methods', icon: <ScienceIcon /> },
      {
        label: 'الأجهزة',
        icon: <BuildIcon />,
        children: [
          { label: 'المعايرة', target: '/app/quality#equipment.calibration' },
          { label: 'الصيانة', target: '/app/quality#equipment.maintenance' },
        ],
      },
      { label: 'الكواشف والمحاليل', target: '/app/reagents', icon: <BiotechIcon /> },
      { label: 'المواصفات والمطابقة', target: '/app/standards', icon: <DescriptionIcon /> },
      {
        label: 'عدم المطابقة',
        icon: <WarningAmberIcon />,
        children: [
          { label: 'الحالات المفتوحة', target: '/app/quality#nc.open' },
          { label: 'التحقيق', target: '/app/quality#nc.investigation' },
          { label: 'CAPA', target: '/app/quality#nc.capa' },
        ],
      },
      { label: 'الوثائق', target: '/app/quality#documents', icon: <FolderSharedIcon /> },
      { label: 'سجل التدقيق', target: '/app/quality#audit', icon: <FindInPageIcon /> },
      { label: 'تقارير الجودة', target: '/app/quality#reports', icon: <AssessmentIcon /> },
      { label: 'التنبيهات', target: '/app/quality#alerts', icon: <NotificationsActiveIcon /> },
      { label: 'الإعدادات', target: '/app/account', icon: <SettingsIcon /> },
    ],
  },
  STANDARDS_OFFICER: {
    title: 'مسؤول المواصفات والمطابقة',
    subtitle: 'Standards & Compliance Officer',
    brand: 'وزارة الصحة الاتحادية',
    color: '#1976d2',
    nav: [
      { label: 'لوحة القيادة', target: '/app/standards#dashboard', icon: <AssessmentIcon /> },
      { label: 'المواصفات', target: '/app/standards#standards', icon: <DescriptionIcon /> },
      { label: 'الإصدارات', target: '/app/standards#versions', icon: <ScienceIcon /> },
      { label: 'المتطلبات', target: '/app/standards#requirements', icon: <RuleIcon /> },
      { label: 'الطرق التحليلية', target: '/app/standards#methods', icon: <BiotechIcon /> },
      { label: 'قواعد التطبيق', target: '/app/standards#rules', icon: <CompareIcon /> },
      { label: 'مقارنة المواصفات', target: '/app/standards#comparison', icon: <CompareIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
};