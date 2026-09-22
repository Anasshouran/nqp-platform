import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MoveToInboxIcon from '@mui/icons-material/Inventory2';
import ScienceIcon from '@mui/icons-material/Science';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MedicationIcon from '@mui/icons-material/Medication';
import BiotechIcon from '@mui/icons-material/Biotech';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import RuleIcon from '@mui/icons-material/Rule';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GroupIcon from '@mui/icons-material/Group';
import ApartmentIcon from '@mui/icons-material/Apartment';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  PageHeader,
  PageTabs,
} from '../../components/uikit';
import { useLabSectors } from '../../hooks/useLabSectors';
import NqlisDashboard from './NqlisDashboard';
import NqlisReception from './NqlisReception';
import NqlisSamples from './NqlisSamples';
import NqlisWorklist from './NqlisWorklist';
import NqlisCritical from './NqlisCritical';
import NqlisReagents from './NqlisReagents';
import NqlisEquipment from './NqlisEquipment';
import NqlisQc from './NqlisQc';
import NqlisQuality from './NqlisQuality';
import NqlisReports from './NqlisReports';
import NqlisUsers from './NqlisUsers';

const TABS = [
  { key: '', label: 'لوحة المعلومات', icon: <DashboardIcon /> },
  { key: 'reception', label: 'استقبال العينات', icon: <MoveToInboxIcon /> },
  { key: 'samples', label: 'سجل العينات', icon: <ScienceIcon /> },
  { key: 'worklist', label: 'قائمة العمل', icon: <AssignmentTurnedInIcon /> },
  { key: 'critical', label: 'النتائج الحرجة', icon: <WarningAmberIcon /> },
  { key: 'reagents', label: 'المواد والكواشف', icon: <MedicationIcon /> },
  { key: 'equipment', label: 'الأجهزة', icon: <BiotechIcon /> },
  { key: 'qc', label: 'مراقبة الجودة', icon: <FactCheckIcon /> },
  { key: 'quality', label: 'الجودة وعدم المطابقة', icon: <RuleIcon /> },
  { key: 'reports', label: 'التقارير', icon: <AssessmentIcon /> },
  { key: 'users', label: 'المستخدمون', icon: <GroupIcon /> },
];

const SectorSwitcher = () => {
  const { activeSector, allowedSectors, setSector, isNational } = useLabSectors();
  if (!isNational) return null;
  const handleChange = (e: SelectChangeEvent<string>) => setSector(e.target.value);

  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
      <Chip icon={<ApartmentIcon sx={{ fontSize: 16 }} />} label="القطاع النشط" size="small" color="primary" variant="outlined" />
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="lab-sector-label">القطاع</InputLabel>
        <Select
          labelId="lab-sector-label"
          value={activeSector ?? ''}
          label="القطاع"
          onChange={handleChange}
        >
          {allowedSectors.map((s) => (
            <MenuItem key={s.code} value={s.code}>
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: s.color || '#0c7f6a', flexShrink: 0 }} />
                {s.name_ar || s.code}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Typography variant="caption" color="text.secondary">
        تُعرض البيانات الخاصة بهذا القطاع فقط
      </Typography>
    </Stack>
  );
};

const LaboratoryPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const hash = location.hash.replace('#', '');
  const initial = Math.max(0, TABS.findIndex((t) => t.key === hash));
  const [tab, setTab] = useState(initial);
  const { activeSector } = useLabSectors();

  useEffect(() => {
    const idx = TABS.findIndex((t) => t.key === hash);
    if (idx >= 0 && idx !== tab) setTab(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  const handleChange = (index: number) => {
    setTab(index);
    const key = TABS[index]?.key;
    navigate(key ? { hash: `#${key}` } : location.pathname, { replace: true });
  };

  return (
    <>
      <PageHeader
        title="المعمل القومي للحجر الصحي"
        subtitle="National Quarantine Laboratory Information System — NQLIS"
        eyebrow="NQLIS"
      />
      <SectorSwitcher />
      <PageTabs
        key={activeSector ?? 'none'}
        variant="scrollable"
        scrollButtons="auto"
        value={tab}
        onChange={handleChange}
        tabs={TABS.map((t, i) => ({ label: t.label, icon: t.icon, panel: PANELS[i] }))}
      />
    </>
  );
};

const PANELS = [
  <NqlisDashboard />,
  <NqlisReception />,
  <NqlisSamples />,
  <NqlisWorklist />,
  <NqlisCritical />,
  <NqlisReagents />,
  <NqlisEquipment />,
  <NqlisQc />,
  <NqlisQuality />,
  <NqlisReports />,
  <NqlisUsers />,
];

export default LaboratoryPage;