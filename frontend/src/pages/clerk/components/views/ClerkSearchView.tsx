// Shipment search: recent queries, loading and error states, results list.
// Extracted from ClerkDashboardPage without behavioural change.
import type { useClerkActions } from '../../hooks/useClerkActions';
import type { useClerkSearch } from '../../hooks/useClerkSearch';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import SearchIcon from '@mui/icons-material/Search';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { StatusChip } from '../../../../components/uikit';
import { counterpartyOf, shipmentTypeChip, statusLabel, statusTone } from '../../constants';

type Props = {
  actions: Pick<ReturnType<typeof useClerkActions>, 'setDetailView'>;
  search: Pick<ReturnType<typeof useClerkSearch>, 'recentSearches' | 'searchError' | 'searchInput' | 'searchLoading' | 'searchResults' | 'setRecentSearches' | 'setSearchInputLocal'>;
};

export const ClerkSearchView = ({ actions, search }: Props) => {
  const { setDetailView } = actions;
  const { recentSearches, searchError, searchInput, searchLoading, searchResults, setRecentSearches, setSearchInputLocal } = search;
  return (
    <>
                <Card variant="outlined" sx={{ borderRadius: 3, maxWidth: 720, mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>البحث عن طلب</Typography>
                    <TextField
                      fullWidth
                      size="small"
                      label="رقم الطلب، جمركي، بوليصة، مستورد، مصدر، باخرة"
                      value={searchInput}
                      onChange={(e) => setSearchInputLocal(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                    {recentSearches.length > 0 && (
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }} alignItems="center">
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>عمليات البحث الأخيرة:</Typography>
                        {recentSearches.map((q) => (
                          <Chip key={q} label={q} size="small" variant="outlined" onClick={() => setSearchInputLocal(q)} />
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>

                {searchInput.trim() && searchError && (
                  <Alert severity="error" sx={{ mb: 2, maxWidth: 720 }}>{searchError}</Alert>
                )}

                {searchLoading ? (
                  <Paper variant="outlined" sx={{ borderRadius: 3, p: 3, maxWidth: 720 }}>
                    <Stack spacing={1.5}>
                      {[0, 1, 2].map((i) => (
                        <Skeleton key={i} variant="rounded" height={64} />
                      ))}
                    </Stack>
                  </Paper>
                ) : searchResults.length > 0 ? (
                  <Stack spacing={1.25} sx={{ maxWidth: 720 }}>
                    {searchResults.map((r) => (
                      <Paper
                        key={r.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2.5,
                          cursor: 'pointer',
                          transition: 'all .15s ease',
                          '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)' },
                        }}
                        onClick={() => { setDetailView(r); setRecentSearches((prev) => Array.from(new Set([searchInput.trim(), ...prev])).slice(0, 5)); }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={1}>
                          <Stack spacing={0.25}>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.manifest_number}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {counterpartyOf(r)} · {r.items.length} أصناف · {Number(r.total_weight_kg || 0).toLocaleString('ar-EG')} كجم · {(r.arrival_date || '—').slice(0, 10)}
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {shipmentTypeChip(r.shipment_type)}
                            <StatusChip label={statusLabel(r.status)} tone={statusTone(r.status)} />
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                ) : searchInput.trim() ? (
                  <Box sx={{ maxWidth: 720, p: 3, textAlign: 'center' }}>
                    <Inventory2Icon sx={{ fontSize: 40, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>لا توجد نتائج مطابقة لـ «{searchInput.trim()}»</Typography>
                  </Box>
                ) : null}
    </>
  );
};
