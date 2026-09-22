import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import ScienceIcon from '@mui/icons-material/Science';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HistoryIcon from '@mui/icons-material/History';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { getTravelers } from '../../api/endpoints/travelers';
import { getLabSamples } from '../../api/endpoints/laboratory';
import { getShipments } from '../../api/endpoints/food';
import { getClinicVisits, getReferrals, searchPatients } from '../../api/endpoints/clinic';
import type { AxiosResponse } from 'axios';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type { Traveler } from '../../types/traveler';
import type { LabSample } from '../../types/laboratory';
import type { FoodShipment } from '../../types/food';
import type { ClinicPatient, ClinicReferral, ClinicVisit } from '../../types/clinic';
import { referralStatus, sampleStatus, visitStatus } from '../../utils/status';

export const OPEN_SEARCH_EVENT = 'nqp:open-global-search';

export const openGlobalSearch = () =>
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  path: string;
}

interface SearchSection {
  key: string;
  label: string;
  icon: ReactNode;
  items: SearchResultItem[];
}

const entries = <T,>(r: PromiseSettledResult<AxiosResponse<ApiResponse<PaginatedResponse<T>>>>): T[] =>
  r.status === 'fulfilled' ? (r.value?.data?.data?.results ?? []) : [];

const entriesArray = <T,>(r: PromiseSettledResult<AxiosResponse<ApiResponse<T[]>>>): T[] =>
  r.status === 'fulfilled' ? (r.value?.data?.data ?? []) : [];

const GlobalSearchPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<SearchSection[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    const onOpen = () => {
      setQuery('');
      setSections([]);
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  const runSearch = useCallback(async (q: string) => {
    const needle = q.trim();
    if (needle.length < 2) {
      setSections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [travelers, samples, shipments, patients, referrals, visits] = await Promise.allSettled([
      getTravelers({ search: needle, page_size: 6 }),
      getLabSamples({ search: needle, page_size: 6 }),
      getShipments({ search: needle, page_size: 6 }),
      searchPatients(needle),
      getReferrals({ search: needle, page_size: 6 }),
      getClinicVisits({ search: needle, page_size: 6 }),
    ]);

    const result: SearchSection[] = [];

    const travelerRows = entries<Traveler>(travelers);
    if (travelerRows.length) {
      result.push({
        key: 'travelers',
        label: 'المسافرون',
        icon: <PeopleIcon sx={{ fontSize: 18 }} />,
        items: travelerRows.map((t) => ({
          id: t.id,
          title: t.full_name,
          subtitle: t.passport_number,
          path: '/app/travelers',
        })),
      });
    }

    const patientRows = entriesArray<ClinicPatient>(patients);
    if (patientRows.length) {
      result.push({
        key: 'patients',
        label: 'مرضى العيادة',
        icon: <MedicalServicesIcon sx={{ fontSize: 18 }} />,
        items: patientRows.map((p) => ({
          id: p.id,
          title: p.full_name,
          subtitle: p.medical_file_no ? `${p.passport_number} • ${p.medical_file_no}` : p.passport_number,
          path: '/app/clinic?tab=referrals',
        })),
      });
    }

    const referralRows = entries<ClinicReferral>(referrals);
    if (referralRows.length) {
      result.push({
        key: 'referrals',
        label: 'إحالات العيادة',
        icon: <ReceiptLongIcon sx={{ fontSize: 18 }} />,
        items: referralRows.map((r) => ({
          id: r.id,
          title: r.traveler_name ?? r.passport_number ?? r.id,
          subtitle: `${r.passport_number ?? ''} • ${referralStatus[r.status]?.label ?? r.status}`,
          path: '/app/clinic?tab=referrals',
        })),
      });
    }

    const visitRows = entries<ClinicVisit>(visits);
    if (visitRows.length) {
      result.push({
        key: 'visits',
        label: 'زيارات العيادة',
        icon: <HistoryIcon sx={{ fontSize: 18 }} />,
        items: visitRows.map((v) => ({
          id: v.id,
          title: v.traveler_name ?? v.passport_number ?? v.id,
          subtitle: `${v.passport_number ?? ''} • ${visitStatus[v.visit_status]?.label ?? v.visit_status}`,
          path: `/app/clinic/visits/${v.id}`,
        })),
      });
    }

    const sampleRows = entries<LabSample>(samples);
    if (sampleRows.length) {
      result.push({
        key: 'samples',
        label: 'عينات المختبر',
        icon: <ScienceIcon sx={{ fontSize: 18 }} />,
        items: sampleRows.map((s) => ({
          id: s.id,
          title: s.sample_number,
          subtitle: `${s.sample_barcode} • ${sampleStatus[s.status]?.label ?? s.status}`,
          path: '/app/laboratory',
        })),
      });
    }

    const shipmentRows = entries<FoodShipment>(shipments);
    if (shipmentRows.length) {
      result.push({
        key: 'shipments',
        label: 'شحنات الأغذية',
        icon: <LocalShippingIcon sx={{ fontSize: 18 }} />,
        items: shipmentRows.map((s) => ({
          id: s.id,
          title: s.manifest_number,
          subtitle: s.supplier_name,
          path: `/app/food/shipments/${s.id}`,
        })),
      });
    }

    setSections(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void runSearch(query);
    }, 350);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      onClose={() => setOpen(false)}
      PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}
    >
      <Box sx={{ p: 2.5, pb: 1.5 }}>
        <TextField
          autoFocus
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن مسافر، شحنة، عينة، مريض، إحالة، زيارة…"
          size="medium"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'primary.main' }} />
              </InputAdornment>
            ),
            endAdornment: loading ? (
              <CircularProgress size={18} />
            ) : (
              <Chip label="Ctrl+K" size="small" variant="outlined" sx={{ fontWeight: 700 }} />
            ),
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        />
      </Box>
      <DialogContent sx={{ p: 0, maxHeight: '60vh', overflowY: 'auto' }}>
        {query.trim().length < 2 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <SearchIcon sx={{ fontSize: 42, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary" fontWeight={600}>
              اكتب حرفين على الأقل لبدء البحث
            </Typography>
          </Box>
        ) : sections.length === 0 && !loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary" fontWeight={600}>
              لا توجد نتائج مطابقة
            </Typography>
          </Box>
        ) : (
          sections.map((section) => (
            <Box key={section.key}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ px: 2.5, pt: 2, pb: 0.5 }}
              >
                <Box sx={{ color: 'primary.main', display: 'inline-flex' }}>{section.icon}</Box>
                <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: 0.5 }}>
                  {section.label}
                </Typography>
              </Stack>
              <List disablePadding>
                {section.items.map((item) => (
                  <ListItemButton
                    key={`${section.key}-${item.id}`}
                    onClick={() => {
                      navigate(item.path);
                      setOpen(false);
                    }}
                    sx={{ py: 1.1, px: 2.5, '&:hover': { bgcolor: 'primary.lighter' } }}
                  >
                    <ListItemText
                      primary={
                        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{item.title}</Typography>
                      }
                      secondary={
                        <Typography
                          component="span"
                          variant="caption"
                          noWrap
                          sx={{ color: 'text.secondary', fontWeight: 600 }}
                        >
                          {item.subtitle}
                        </Typography>
                      }
                    />
                    <KeyboardArrowLeftIcon sx={{ color: 'text.disabled' }} />
                  </ListItemButton>
                ))}
              </List>
            </Box>
          ))
        )}
      </DialogContent>
      <Box sx={{ px: 2.5, py: 1.25, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Ctrl+K للفتح • Enter/نقرة للانتقال • Esc للإغلاق
        </Typography>
      </Box>
    </Dialog>
  );
};

export default GlobalSearchPalette;