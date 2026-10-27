import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ScienceIcon from '@mui/icons-material/Science';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { PageHeader, EmptyState } from '../../components/common';
import { StatusChip } from '../../components/ui';
import type { StatusTone } from '../../components/ui/StatusChip';
import { getClinicLabRequests } from '../../api/endpoints/clinic';
import type { ClinicLabRequest } from '../../types/clinic';
import { extractErrorMessage, notifyError } from '../../utils/toast';
import { GlassPanel, PersonAvatar, SectionHeader } from './ui';

const barcodeChip = (code: string) => (
  <Box
    component="span"
    sx={{
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontWeight: 700,
      fontSize: '0.72rem',
      letterSpacing: '0.04em',
      color: '#1d4f9e',
      bgcolor: 'rgba(47,109,208,0.1)',
      px: 1,
      py: 0.4,
      borderRadius: 1.5,
      whiteSpace: 'nowrap',
    }}
  >
    {code}
  </Box>
);

const LabPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [items, setItems] = useState<ClinicLabRequest[] | null>(null);
  const priorityMeta = useMemo<Record<string, { label: string; tone: StatusTone }>>(
    () => ({
      ROUTINE: { label: t('clinic.visitDetail.triage.priority.routine'), tone: 'info' },
      HIGH: { label: t('clinic.visitDetail.triage.priority.high'), tone: 'warning' },
      URGENT: { label: t('clinic.visitDetail.triage.priority.urgent'), tone: 'error' },
    }),
    [t]
  );

  useEffect(() => {
    getClinicLabRequests({ page_size: 200 })
      .then((res) => setItems(res.data.data.results ?? []))
      .catch((err) => {
        setItems([]);
        notifyError(extractErrorMessage(err, t('clinic.lab.errors.load')));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box>
      <PageHeader
        title={t('clinic.lab.header.title')}
        subtitle={t('clinic.lab.header.subtitle')}
        eyebrow={t('clinic.clinic.header.title')}
      />
      <GlassPanel accent="linear-gradient(90deg, #2f6dd0, transparent)">
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <SectionHeader
            icon={<ScienceIcon fontSize="small" />}
            title={t('clinic.lab.section.title')}
            count={items?.length ?? '…'}
            tone="#2f6dd0"
          />
          {items === null ? (
            <Stack spacing={1.5}>
              <Skeleton variant="rounded" height={52} />
              <Skeleton variant="rounded" height={52} />
              <Skeleton variant="rounded" height={52} />
            </Stack>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<ScienceIcon sx={{ fontSize: 40 }} />}
              title={t('clinic.lab.empty.title')}
              description={t('clinic.lab.empty.description')}
            />
          ) : (
            <TableContainer sx={{ borderRadius: 3, '& .MuiTableCell-root': { borderColor: 'rgba(16,40,34,0.08)' } }}>
              <Table size="small" aria-label={t('clinic.lab.aria.table')}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>{t('clinic.lab.table.traveler')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>{t('clinic.lab.table.sampleType')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>{t('clinic.lab.table.disease')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>{t('clinic.lab.table.priority')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>{t('clinic.lab.table.barcode')}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>
                      {t('clinic.lab.table.open')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((r) => {
                    const prio = priorityMeta[r.priority] ?? { label: r.priority, tone: 'neutral' as const };
                    return (
                      <TableRow key={r.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ py: 1.5 }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <PersonAvatar name={r.visit_traveler_name} size={36} square />
                            <Typography sx={{ fontWeight: 700, fontSize: 13.5 }} noWrap>
                              {r.visit_traveler_name || '—'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 13 }}>{r.sample_type}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 13 }}>{r.disease_name || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <StatusChip label={prio.label} tone={prio.tone} size="small" />
                        </TableCell>
                        <TableCell>{barcodeChip(r.barcode)}</TableCell>
                        <TableCell align="center">
                          <Tooltip title={t('clinic.lab.tooltip.openVisit')}>
                            <IconButton
                              aria-label={t('clinic.common.view')}
                              size="small"
                              color="primary"
                              onClick={() => r.visit && navigate(`/app/clinic/visits/${r.visit}`)}
                              sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </GlassPanel>
    </Box>
  );
};

export default LabPage;