import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ScheduleIcon from '@mui/icons-material/Schedule';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PlaceIcon from '@mui/icons-material/Place';
import PersonIcon from '@mui/icons-material/Person';
import type { RoleLayoutConfig } from './core';

export const ROLE_LAYOUT_CONFIG: Partial<Record<string, RoleLayoutConfig>> = {
  VACCINATION_MANAGER: {
    title: 'إدارة التطعيم الدولي',
    subtitle: 'International Vaccination Manager',
    brand: 'وزارة الصحة الاتحادية – التطعيم الدولي',
    color: '#0c7f6a',
    overline: 'بوابة التطعيم الدولي',
    nav: [
      { label: 'لوحة التطعيم', target: '/app/vaccination', icon: <DashboardIcon /> },
      { label: 'تسجيل جرعة', target: '/app/vaccination/register', icon: <PersonAddIcon /> },
      { label: 'سجل الجرعات', target: '/app/vaccination/records', icon: <ScheduleIcon /> },
      { label: 'الشهادات الدولية', target: '/app/vaccination/certificates', icon: <VerifiedUserIcon /> },
      { label: 'اللقاحات والقواعد', target: '/app/vaccination/vaccines', icon: <VaccinesIcon /> },
      { label: 'التشغيلات والمخزون', target: '/app/vaccination/batches', icon: <Inventory2Icon /> },
      { label: 'نقاط التطعيم', target: '/app/vaccination/sites', icon: <PlaceIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  VACCINATION_OFFICER: {
    title: 'مسؤول التطعيم',
    subtitle: 'Vaccination Officer',
    brand: 'وزارة الصحة الاتحادية – التطعيم الدولي',
    color: '#2f6dd0',
    overline: 'بوابة التطعيم الدولي',
    nav: [
      { label: 'تسجيل جرعة', target: '/app/vaccination/register', icon: <PersonAddIcon /> },
      { label: 'سجل الجرعات', target: '/app/vaccination/records', icon: <ScheduleIcon /> },
      { label: 'الشهادات الدولية', target: '/app/vaccination/certificates', icon: <VerifiedUserIcon /> },
      { label: 'التشغيلات والمخزون', target: '/app/vaccination/batches', icon: <Inventory2Icon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
};