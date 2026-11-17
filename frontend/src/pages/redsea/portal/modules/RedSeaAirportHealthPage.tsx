import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import ScienceIcon from '@mui/icons-material/Science';
import { PageHeader, SectionCard, EmptyState } from '../../../../components/uikit';
import {
  getAirportPorts,
  getAirportTerminals,
  getScreeningPoints,
  getAirportScreenings,
  getAircraftInspections,
} from '../../../../api/endpoints/airport';
import { useList } from './shared';
import type { AirportScreening, ScreeningPoint, AircraftInspection } from '../../../../types/airport';

const riskTone: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  HIGH: 'error',
  MODERATE: 'warning',
  LOW: 'success',
  NONE: 'success',
};

const RedSeaAirportHealthPage = () => {
  const { t } = useTranslation();
  const ports = useList(getAirportPorts, { is_active: 'true' });
  const terminals = useList(getAirportTerminals);
  const points = useList<ScreeningPoint>(getScreeningPoints);
  const screenings = useList<AirportScreening>(getAirportScreenings, { page_size: 10 });
  const inspections = useList<AircraftInspection>(getAircraftInspections, { page_size: 6 });

  const kpis = [
    { label: t('redsea.portal.modules.airportHealth.kpi.airports.label'), value: ports.count, icon: <FlightTakeoffIcon />, color: 'primary.main' as const },
    { label: t('redsea.portal.modules.airportHealth.kpi.terminals.label'), value: terminals.count, icon: <TravelExploreIcon />, color: 'info.main' as const },
    { label: t('redsea.portal.modules.airportHealth.kpi.points.label'), value: points.count, icon: <HealthAndSafetyIcon />, color: 'success.main' as const },
    { label: t('redsea.portal.modules.airportHealth.kpi.screenings.label'), value: screenings.count, icon: <ScienceIcon />, color: 'warning.main' as const },
  ];

  return (
    <Box>
      <PageHeader
        eyebrow={t('redsea.portal.modules.airportHealth.eyebrow')}
        title={t('redsea.portal.modules.airportHealth.title')}
        subtitle={t('redsea.portal.modules.airportHealth.subtitle')}
      />

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {kpis.map((k) => (
          <Grid item xs={6} sm={3} key={k.label}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ color: k.color, display: 'flex' }}>{k.icon}</Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>{k.value}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{k.label}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <SectionCard title={t('redsea.portal.modules.airportHealth.screeningsSection.title')} subtitle={t('redsea.portal.modules.airportHealth.screeningsSection.subtitle')}>
            {screenings.loading ? (
              <Stack spacing={1}><Skeleton height={40} /><Skeleton height={40} /><Skeleton height={40} /></Stack>
            ) : screenings.data.length === 0 ? (
              <EmptyState title={t('redsea.portal.modules.airportHealth.screeningsEmpty.title')} description={t('redsea.portal.modules.airportHealth.screeningsEmpty.description')} />
            ) : (
              <Stack spacing={1.5}>
                {screenings.data.map((s) => (
                  <Stack key={s.id} direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ color: 'primary.main', display: 'flex' }}><ScienceIcon /></Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {s.traveler_name || s.traveler}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {s.point_name || s.screening_point} — {s.flight_number || t('redsea.portal.modules.airportHealth.noFlight')}
                      </Typography>
                    </Box>
                    <Chip size="small" label={s.status} variant="outlined" />
                    <Chip
                      size="small"
                      label={s.risk_level}
                      color={riskTone[s.risk_level] ?? 'default'}
                      variant="outlined"
                    />
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={5}>
          <SectionCard title={t('redsea.portal.modules.airportHealth.pointsSection.title')} subtitle={t('redsea.portal.modules.airportHealth.pointsSection.subtitle')}>
            {points.data.length === 0 ? (
              <EmptyState title={t('redsea.portal.modules.airportHealth.pointsEmpty.title')} description={t('redsea.portal.modules.airportHealth.pointsEmpty.description')} />
            ) : (
              <Stack spacing={1.5}>
                {points.data.slice(0, 8).map((p) => (
                  <Stack key={p.id} direction="row" spacing={1} alignItems="center">
                    <Box sx={{ color: 'info.main', display: 'flex' }}><HealthAndSafetyIcon fontSize="small" /></Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{p.point_code}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">{p.point_type} — {p.terminal_name || p.terminal}</Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
          <SectionCard title={t('redsea.portal.modules.airportHealth.inspectionsSection.title')} subtitle={t('redsea.portal.modules.airportHealth.inspectionsSection.subtitle')} sx={{ mt: 2.5 }}>
            {inspections.loading ? (
              <Skeleton height={60} />
            ) : inspections.data.length === 0 ? (
              <EmptyState title={t('redsea.portal.modules.airportHealth.inspectionsEmpty.title')} description={t('redsea.portal.modules.airportHealth.inspectionsEmpty.description')} />
            ) : (
              <Stack spacing={1.5}>
                {inspections.data.map((i) => (
                  <Stack key={i.id} direction="row" spacing={1} alignItems="center">
                    <Box sx={{ color: 'success.main', display: 'flex' }}><FlightTakeoffIcon fontSize="small" /></Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{i.aircraft_registration}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">{i.flight_number} — {i.inspection_date}</Typography>
                    </Box>
                    <Chip size="small" label={i.overall_status} />
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RedSeaAirportHealthPage;
