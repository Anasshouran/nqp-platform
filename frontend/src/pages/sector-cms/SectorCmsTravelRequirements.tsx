import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import { SectorPageShell, SectorHomeLink, usePageTitle } from './SectorCmsShared';
import { getTravelRequirements } from '../../api/endpoints/public';
import type { TravelRequirement } from '../../api/endpoints/public';

const riskColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  GREEN: 'success',
  YELLOW: 'warning',
  RED: 'error',
};

const riskLabels: Record<string, string> = {
  GREEN: 'منخفض',
  YELLOW: 'متوسط',
  RED: 'مرتفع',
};

const SectorCmsTravelRequirements = () => {
  const [countries, setCountries] = useState<TravelRequirement[]>([]);
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(true);

  usePageTitle('متطلبات الدخول والخروج');

  useEffect(() => {
    getTravelRequirements()
      .then((response) => setCountries(response.data.data))
      .catch(() => setCountries([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (country ? countries.filter((c) => c.country_code === country) : countries),
    [countries, country],
  );

  return (
    <SectorPageShell>
      <SectorHomeLink />
      <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>متطلبات الدخول والخروج</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        متطلبات السفر والدخول عبر منافذ القطاع وفق الدولة القادم منها المسافر ومستوى الخطورة الصحية.
      </Typography>

      <TextField
        select
        label="الدولة القادم منها"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        size="medium"
        sx={{ mb: 3, minWidth: { xs: '100%', sm: 340 } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        SelectProps={{ displayEmpty: true }}
      >
        <MenuItem value="">جميع الدول ({countries.length})</MenuItem>
        {countries.map((c) => (
          <MenuItem key={c.country_code} value={c.country_code}>
            {c.country_name_ar} ({c.country_code})
          </MenuItem>
        ))}
      </TextField>

      {loading ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={70} />
          <Skeleton variant="rounded" height={70} />
          <Skeleton variant="rounded" height={70} />
        </Stack>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
          <TravelExploreIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>لا توجد بيانات متاحة</Typography>
          <Typography variant="body2" color="text.secondary">لم يتم تسجيل متطلبات سفر بعد.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: 2 }}>
          <Table sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '28%' }}>الدولة</TableCell>
                <TableCell sx={{ width: '15%' }}>مستوى الخطورة</TableCell>
                <TableCell>متطلبات الدخول</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((entry) => (
                <TableRow key={entry.country_code} hover sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>{entry.country_name_ar}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {entry.country_name_en} · {entry.country_code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={riskLabels[entry.risk_level] || entry.risk_level}
                      size="small"
                      color={riskColors[entry.risk_level] || 'default'}
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell>
                    {entry.requirements.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    ) : (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {entry.requirements.map((r) => (
                          <Chip key={r.title} label={r.title} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </SectorPageShell>
  );
};

export default SectorCmsTravelRequirements;
