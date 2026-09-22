import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import SearchIcon from '@mui/icons-material/Search';
import FlightIcon from '@mui/icons-material/Flight';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import ScienceIcon from '@mui/icons-material/Science';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { getTravelRequirements, getCountries } from '../../api/endpoints/public';
import type { TravelRequirement, PublicCountry } from '../../api/endpoints/public';
import { PageHeader, EmptyState } from '../../components/common';

const TravelRequirementsPage = () => {
  const [countries, setCountries] = useState<PublicCountry[]>([]);
  const [from, setFrom] = useState('SD');
  const [to, setTo] = useState('');
  const [mode, setMode] = useState<'AIR' | 'SEA' | 'LAND'>('AIR');
  const [requirements, setRequirements] = useState<TravelRequirement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCountries()
      .then((r) => setCountries(r.data.data))
      .catch(() => setCountries([]))
      .finally(() => {});
  }, []);

  const submit = async () => {
    if (!to) return;
    setLoading(true);
    setError(null);
    setRequirements(null);
    try {
      const response = await getTravelRequirements(to);
      const data = response.data.data;
      setRequirements(Array.isArray(data) && data.length > 0 ? data[0] : null);
    } catch {
      setError('تعذر جلب متطلبات السفر، حاول مرة أخرى لاحقاً.');
      setRequirements(null);
    } finally {
      setLoading(false);
    }
  };

  const modeOptions = [
    { value: 'AIR' as const, label: 'طيران', icon: <FlightIcon />, emoji: '✈️' },
    { value: 'SEA' as const, label: 'بحري', icon: <DirectionsBoatIcon />, emoji: '🚢' },
    { value: 'LAND' as const, label: 'بري', icon: <DirectionsBusIcon />, emoji: '🚌' },
  ];

  const groupRequirements = (reqs: TravelRequirement['requirements']) => {
    const groups = {
      التطعيمات: [] as TravelRequirement['requirements'],
      الفحوصات: [] as TravelRequirement['requirements'],
      الشهادات: [] as TravelRequirement['requirements'],
      التنبيهات: [] as TravelRequirement['requirements'],
    };
    reqs?.forEach((r) => {
      const title = r.title.toLowerCase();
      if (title.includes('تطعيم') || title.includes('لقاح') || title.includes('vaccine')) {
        groups.التطعيمات.push(r);
      } else if (title.includes('فحص') || title.includes('اختبار') || title.includes('test') || title.includes('pcr')) {
        groups.الفحوصات.push(r);
      } else if (title.includes('شهادة') || title.includes('certificate')) {
        groups.الشهادات.push(r);
      } else {
        groups.التنبيهات.push(r);
      }
    });
    return groups;
  };

  const requirementGroups = useMemo(() => groupRequirements(requirements?.requirements ?? []), [requirements]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader
        title="✈️ متطلبات السفر"
        subtitle="أدخِل بيانات رحلتك لعرض المتطلبات الصحية الدقيقة"
        eyebrow="إرشادات الدخول"
      />

      <Card sx={{ mb: 4, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={3} sx={{ width: '100%' }}>
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel id="from-label">من</InputLabel>
                  <Select
                    labelId="from-label"
                    value={from}
                    label="من"
                    onChange={(e) => setFrom(e.target.value)}
                  >
                    {countries
                      .filter((c) => c.code === 'SD')
                      .map((c) => (
                        <MenuItem key={c.code} value={c.code}>
                          {c.name_ar} ({c.code})
                        </MenuItem>
                      ))}
                    <MenuItem value="SD" disabled>
                      ————————————————
                    </MenuItem>
                    {countries
                      .filter((c) => c.code !== 'SD')
                      .map((c) => (
                        <MenuItem key={c.code} value={c.code}>
                          {c.name_ar} ({c.code})
                        </MenuItem>
                      ))}
                  </Select>
                  <FormHelperText>دولة المغادرة (السودان افتراضياً)</FormHelperText>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel id="to-label">إلى</InputLabel>
                  <Select
                    labelId="to-label"
                    value={to}
                    label="إلى"
                    onChange={(e) => setTo(e.target.value)}
                  >
                    <MenuItem value="">اختر دولة الوجهة</MenuItem>
                    {countries.map((c) => (
                      <MenuItem key={c.code} value={c.code}>
                        {c.name_ar} ({c.code})
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>دولة الوصول</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>

            <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center" sx={{ pt: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, minWidth: 100 }}>
                وسيلة السفر
              </Typography>
              <RadioGroup
                value={mode}
                onChange={(e) => setMode(e.target.value as 'AIR' | 'SEA' | 'LAND')}
                row
                sx={{ flex: 1 }}
              >
                {modeOptions.map((m) => (
                  <FormControlLabel
                    key={m.value}
                    value={m.value}
                    control={<Radio />}
                    label={
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <span style={{ fontSize: 18 }}>{m.emoji}</span>
                        {m.label}
                      </Stack>
                    }
                    labelPlacement="end"
                  />
                ))}
              </RadioGroup>
            </Stack>

            <Button
              variant="contained"
              size="large"
              startIcon={<SearchIcon />}
              onClick={submit}
              disabled={loading || !to}
              fullWidth
              sx={{ mx: 'auto', mt: 2, maxWidth: 360 }}
            >
              {loading ? 'جاري البحث...' : 'عرض المتطلبات'}
            </Button>

            {error && (
              <Typography variant="body2" sx={{ color: 'error.main', textAlign: 'center', mt: 1 }}>
                {error}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {loading ? (
        <Stack spacing={2} sx={{ minHeight: 200 }}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  <span className="skeleton" style={{ width: '60%' }} />
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : requirements ? (
        <Stack spacing={3}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            المتطلبات الصحية لـ {countries.find((c) => c.code === to)?.name_ar || to}
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        display: 'grid',
                        placeItems: 'center',
                        color: '#1d7a54',
                        bgcolor: '#e3f4ec',
                      }}
                    >
                      <LocalHospitalIcon fontSize="large" />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      التطعيمات المطلوبة
                    </Typography>
                  </Stack>
                  {requirementGroups.التطعيمات.length > 0 ? (
                    <Stack spacing={1}>
                      {requirementGroups.التطعيمات.map((r) => (
                        <Chip
                          key={r.title}
                          label={r.title}
                          size="small"
                          variant="outlined"
                          color="success"
                          icon={<LocalHospitalIcon fontSize="small" />}
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      لا توجد تطعيمات مطلوبة
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        display: 'grid',
                        placeItems: 'center',
                        color: '#2f6dd0',
                        bgcolor: '#e8f0fc',
                      }}
                    >
                      <ScienceIcon fontSize="large" />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      الفحوصات المطلوبة
                    </Typography>
                  </Stack>
                  {requirementGroups.الفحوصات.length > 0 ? (
                    <Stack spacing={1}>
                      {requirementGroups.الفحوصات.map((r) => (
                        <Chip
                          key={r.title}
                          label={r.title}
                          size="small"
                          variant="outlined"
                          color="info"
                          icon={<ScienceIcon fontSize="small" />}
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      لا توجد فحوصات مطلوبة
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        display: 'grid',
                        placeItems: 'center',
                        color: '#8c6d1f',
                        bgcolor: '#f7efd9',
                      }}
                    >
                      <VerifiedIcon fontSize="large" />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      الشهادات الصحية
                    </Typography>
                  </Stack>
                  {requirementGroups.الشهادات.length > 0 ? (
                    <Stack spacing={1}>
                      {requirementGroups.الشهادات.map((r) => (
                        <Chip
                          key={r.title}
                          label={r.title}
                          size="small"
                          variant="outlined"
                          color="warning"
                          icon={<VerifiedIcon fontSize="small" />}
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      لا توجد شهادات مطلوبة
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        display: 'grid',
                        placeItems: 'center',
                        color: '#c63a3a',
                        bgcolor: '#fdeaea',
                      }}
                    >
                      <WarningAmberIcon fontSize="large" />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      التنبيهات الصحية
                    </Typography>
                  </Stack>
                  {requirementGroups.التنبيهات.length > 0 ? (
                    <Stack spacing={1}>
                      {requirementGroups.التنبيهات.map((r) => (
                        <Chip
                          key={r.title}
                          label={r.title}
                          size="small"
                          variant="outlined"
                          color="error"
                          icon={<WarningAmberIcon fontSize="small" />}
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      لا توجد تنبيهات صحية
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      ) : !loading && !requirements && to ? (
        <EmptyState
          icon={<FlightIcon />}
          title="لا توجد متطلبات مسجلة"
          description="لم تُسجل متطلبات صحية لهذه الدولة بعد."
        />
      ) : (
        <EmptyState
          icon={<FlightIcon />}
          title="اختر دولة الوجهة"
          description="حدد دولة الوصول واضغط «عرض المتطلبات» لرؤية الإرشادات الصحية."
        />
      )}
    </Container>
  );
};

export default TravelRequirementsPage;