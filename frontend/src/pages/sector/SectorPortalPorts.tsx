import En from '../../components/uikit/En';
import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FlightIcon from '@mui/icons-material/Flight';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';
import { useSectorPortal } from '../../components/sectors/SectorPortalLayout';
import { EmptyState } from '../../components/common';
import { getSectorPorts } from '../../api/endpoints/public';
import type { PublicPort } from '../../api/endpoints/public';

const portTypeLabels: Record<string, string> = { AIRPORT: 'sector.portal.ports.portType.airport', SEAPORT: 'sector.portal.ports.portType.seaport', LAND_PORT: 'sector.portal.ports.portType.landPort' };
const portTypeIcons: Record<string, React.ReactNode> = { AIRPORT: <FlightIcon />, SEAPORT: <DirectionsBoatIcon />, LAND_PORT: <DirectionsBusIcon /> };

const groups = [
  { type: 'AIRPORT', labelKey: 'sector.portal.ports.group.airports', icon: <FlightIcon /> },
  { type: 'SEAPORT', labelKey: 'sector.portal.ports.group.seaports', icon: <DirectionsBoatIcon /> },
  { type: 'LAND_PORT', labelKey: 'sector.portal.ports.group.landPorts', icon: <DirectionsBusIcon /> },
];

const SectorPortalPorts = () => {
  const { sector } = useSectorPortal();
  const { t } = useTranslation();
  const [ports, setPorts] = useState<PublicPort[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!sector) { setLoading(false); return; }
    setLoading(true);
    getSectorPorts(sector.id)
      .then((res) => setPorts(res.data.data))
      .catch(() => setPorts([]))
      .finally(() => setLoading(false));
  }, [sector]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return ports;
    return ports.filter(
      (p) => p.name_ar.toLowerCase().includes(term) || (p.name_en || '').toLowerCase().includes(term) || p.code.toLowerCase().includes(term)
    );
  }, [ports, search]);

  if (loading) return <Skeleton variant="rounded" height={200} />;

  const countBy = (t: string) => ports.filter((p) => p.type === t).length;
  const byType = (t: string) => filtered.filter((p) => p.type === t);

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>{t('sector.portal.ports.title')}</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t('sector.portal.ports.subtitle', { sectorName: sector?.name_ar || t('sector.portal.ports.defaultSectorName') })}
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { labelKey: 'sector.portal.ports.stat.airports', value: countBy('AIRPORT'), icon: <FlightIcon /> },
          { labelKey: 'sector.portal.ports.stat.seaports', value: countBy('SEAPORT'), icon: <DirectionsBoatIcon /> },
          { labelKey: 'sector.portal.ports.stat.landPorts', value: countBy('LAND_PORT'), icon: <DirectionsBusIcon /> },
        ].map((k) => (
          <Grid item xs={12} sm={4} key={k.labelKey}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="h5" component="span" sx={{ color: 'primary.main', display: 'flex' }}>{k.icon}</Typography>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{k.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{t(k.labelKey)}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <TextField
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('sector.portal.ports.searchPlaceholder')}
        fullWidth
        sx={{ maxWidth: 520, mb: 4 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {ports.length === 0 ? (
        <EmptyState icon={<LocationOnIcon />} title={t('sector.portal.ports.emptyTitle')} description={t('sector.portal.ports.emptyDescription')} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<SearchIcon />} title={t('sector.portal.ports.noMatchTitle')} description={t('sector.portal.ports.noMatchDescription')} />
      ) : (
        groups.map((g) => {
          const list = byType(g.type);
          return list.length === 0 ? null : (
            <Box key={g.type} sx={{ mb: 5 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Box sx={{ width: 42, height: 42, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'primary.main' }}>
                  {g.icon}
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{t(g.labelKey)}</Typography>
                <Chip label={`${list.length}`} size="small" variant="outlined" />
              </Stack>
              <Grid container spacing={2.5}>
                {list.map((port) => (
                  <Grid item xs={12} sm={6} md={4} key={port.id}>
                    <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider', transition: 'box-shadow 250ms ease, transform 250ms ease', '&:hover': { boxShadow: 4, transform: 'translateY(-4px)' } }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box sx={{ width: 44, height: 44, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'primary.main' }}>
                            {portTypeIcons[port.type] || <LocationOnIcon />}
                          </Box>
                          <Chip label={t(portTypeLabels[port.type] || port.type)} size="small" variant="outlined" />
                        </Stack>
                        <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>{port.name_ar}</Typography>
                        <Typography variant="body2" color="text.secondary"><En>{port.name_en}</En></Typography>
                        {port.address && <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{port.address}</Typography>}
                        <Typography variant="caption" color="text.secondary" dir="ltr" sx={{ display: 'block', mt: 1.5 }}>{port.code}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          );
        })
      )}
    </Box>
  );
};

export default SectorPortalPorts;