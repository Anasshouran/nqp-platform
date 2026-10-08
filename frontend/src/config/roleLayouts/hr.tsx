import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import SchoolIcon from '@mui/icons-material/School';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import type { RoleLayoutConfig } from './core';

const brand = 'وزارة الصحة الاتحادية – شؤون الموارد البشرية';

export const ROLE_LAYOUT_CONFIG: Partial<Record<string, RoleLayoutConfig>> = {
  HR_MANAGER: {
    title: 'إدارة الموارد البشرية',
    subtitle: 'Human Resources Manager',
    brand,
    color: 'primary.main',
    overline: 'بوابة الموارد البشرية',
    nav: [
      { label: 'اللوحة', target: '/app/hr', icon: <DashboardIcon /> },
      { label: 'الموظفون', target: '/app/hr/employees', icon: <PeopleAltIcon /> },
      { label: 'الوحدات', target: '/app/hr/establishments', icon: <AccountTreeIcon /> },
      { label: 'الحضور والانصراف', target: '/app/hr/attendance', icon: <EventAvailableIcon /> },
      { label: 'الإجازات', target: '/app/hr/leave', icon: <BeachAccessIcon /> },
      { label: 'النقل والترقية', target: '/app/hr/postings', icon: <SwapHorizIcon /> },
      { label: 'التدريب', target: '/app/hr/training', icon: <SchoolIcon /> },
      { label: 'تقييم الأداء', target: '/app/hr/performance/reviews', icon: <TrendingUpIcon /> },
      { label: 'المسار الوظيفي', target: '/app/hr/timeline', icon: <HistoryIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  HR_SPECIALIST: {
    title: 'موظف الموارد البشرية',
    subtitle: 'HR Specialist',
    brand,
    color: 'info.main',
    overline: 'بوابة الموارد البشرية',
    nav: [
      { label: 'اللوحة', target: '/app/hr', icon: <DashboardIcon /> },
      { label: 'الموظفون', target: '/app/hr/employees', icon: <PeopleAltIcon /> },
      { label: 'الوحدات', target: '/app/hr/establishments', icon: <AccountTreeIcon /> },
      { label: 'الحضور والانصراف', target: '/app/hr/attendance', icon: <EventAvailableIcon /> },
      { label: 'الإجازات', target: '/app/hr/leave', icon: <BeachAccessIcon /> },
      { label: 'النقل والترقية', target: '/app/hr/postings', icon: <SwapHorizIcon /> },
      { label: 'التدريب', target: '/app/hr/training', icon: <SchoolIcon /> },
      { label: 'تقييم الأداء', target: '/app/hr/performance/reviews', icon: <TrendingUpIcon /> },
      { label: 'المسار الوظيفي', target: '/app/hr/timeline', icon: <HistoryIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  HR_APPROVER: {
    title: 'معتمد الموارد البشرية',
    subtitle: 'HR Approver',
    brand,
    color: 'warning.main',
    overline: 'بوابة الموارد البشرية',
    nav: [
      { label: 'اللوحة', target: '/app/hr', icon: <DashboardIcon /> },
      { label: 'الموظفون', target: '/app/hr/employees', icon: <PeopleAltIcon /> },
      { label: 'الوحدات', target: '/app/hr/establishments', icon: <AccountTreeIcon /> },
      { label: 'الحضور والانصراف', target: '/app/hr/attendance', icon: <EventAvailableIcon /> },
      { label: 'الإجازات', target: '/app/hr/leave', icon: <BeachAccessIcon /> },
      { label: 'النقل والترقية', target: '/app/hr/postings', icon: <SwapHorizIcon /> },
      { label: 'التدريب', target: '/app/hr/training', icon: <SchoolIcon /> },
      { label: 'تقييم الأداء', target: '/app/hr/performance/reviews', icon: <TrendingUpIcon /> },
      { label: 'المسار الوظيفي', target: '/app/hr/timeline', icon: <HistoryIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
};
