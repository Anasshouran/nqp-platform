import { useEffect, useMemo, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
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
  { key: '', labelKey: 'dashboard', icon: <DashboardIcon /> },
  { key: 'reception', labelKey: 'reception', icon: <MoveToInboxIcon /> },
  { key: 'samples', labelKey: 'samples', icon: <ScienceIcon /> },
  { key: 'worklist', labelKey: 'worklist', icon: <AssignmentTurnedInIcon /> },
  { key: 'critical', labelKey: 'critical', icon: <WarningAmberIcon /> },
  { key: 'reagents', labelKey: 'reagents', icon: <MedicationIcon /> },
  { key: 'equipment', labelKey: 'equipment', icon: <BiotechIcon /> },
  { key: 'qc', labelKey: 'qc', icon: <FactCheckIcon /> },
  { key: 'quality', labelKey: 'quality', icon: <RuleIcon /> },
  { key: 'reports', labelKey: 'reports', icon: <AssessmentIcon /> },
  { key: 'users', labelKey: 'users', icon: <GroupIcon /> },
];

const SectorSwitcher = () => {
  const { t } = useTranslation();
  const { activeSector, allowedSectors, setSector, isNational } = useLabSectors();
  if (!isNational) return null;
  const handleChange = (e: SelectChangeEvent<string>) => setSector(e.target.value);

  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
      <Chip icon={<ApartmentIcon sx={{ fontSize: 16 }} />} label={t('laboratory.laboratoryPage.activeSector')} size="small" color="primary" variant="outlined" />
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="lab-sector-label">{t('laboratory.laboratoryPage.sector')}</InputLabel>
        <Select
          labelId="lab-sector-label"
          value={activeSector ?? ''}
          label={t('laboratory.laboratoryPage.sector')}
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
        {t('laboratory.laboratoryPage.sectorOnly')}
      </Typography>
    </Stack>
  );
};

const LaboratoryPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const hash = location.hash.replace('#', '');
  const initial = Math.max(0, TABS.findIndex((tb) => tb.key === hash));
  const [tab, setTab] = useState(initial);
  const { activeSector } = useLabSectors();

  useEffect(() => {
    const idx = TABS.findIndex((tb) => tb.key === hash);
    if (idx >= 0 && idx !== tab) setTab(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  const handleChange = (index: number) => {
    setTab(index);
    const key = TABS[index]?.key;
    navigate(key ? { hash: `#${key}` } : location.pathname, { replace: true });
  };

  const tabs = useMemo(
    () =>
      TABS.map((tb, i) => ({
        label: t(`laboratory.laboratoryPage.${tb.labelKey}`),
        icon: tb.icon,
        panel: PANELS[i],
      })),
    [t],
  );

  return (
    <>
      <PageHeader
        title={t('laboratory.laboratoryPage.title')}
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
        tabs={tabs}
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
