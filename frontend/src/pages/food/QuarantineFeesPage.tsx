import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import type { QuarantineFee, QuarantineFeeCategory, QuarantineFeeSchedule } from '../../types/food';
import { PageHeader } from '../../components/common';
import { getQuarantineFees } from '../../api/endpoints/food';

const YEAR = 2025;

const pluralizeItems = (t: (key: string, opts?: Record<string, string | number>) => string, count: number) => {
  if (count === 1) return t('food.quarantineFees.pluralize.itemsOne');
  if (count === 2) return t('food.quarantineFees.pluralize.itemsTwo');
  if (count >= 3 && count <= 10) return t('food.quarantineFees.pluralize.itemsFew', { count });
  return t('food.quarantineFees.pluralize.itemsMany', { count });
};

const pluralizeCategories = (t: (key: string, opts?: Record<string, string | number>) => string, count: number) => {
  if (count === 1) return t('food.quarantineFees.pluralize.categoriesOne');
  if (count === 2) return t('food.quarantineFees.pluralize.categoriesTwo');
  if (count >= 3 && count <= 10) return t('food.quarantineFees.pluralize.categoriesFew', { count });
  return t('food.quarantineFees.pluralize.categoriesMany', { count });
};

const QuarantineFeesPage = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<QuarantineFeeSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getQuarantineFees(YEAR)
      .then((response) => {
        setData(response.data.data);
        setError(false);
      })
      .catch(() => {
        setData(null);
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = data?.categories ?? [];
  const isEmpty = !loading && !error && categories.length === 0;

  return (
    <Box>
      <PageHeader
        title={t('food.quarantineFees.pageHeader.title', { year: YEAR })}
        subtitle={t('food.quarantineFees.pageHeader.subtitle')}
        eyebrow={t('food.quarantineFees.pageHeader.eyebrow')}
      />

      {!loading && !error && !isEmpty && data && (
        <Box sx={{ mb: 4 }}>
          <Alert severity="info" icon={false}>
            {t('food.quarantineFees.alert.info', {
              items: pluralizeItems(t, data.total_fees),
              categories: pluralizeCategories(t, data.total_categories),
            })}
          </Alert>
        </Box>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={load}>{t('food.quarantineFees.alert.retry')}</Button>}>
          {t('food.quarantineFees.alert.loadError')}
        </Alert>
      )}

      {isEmpty && (
        <Alert severity="warning">
          {t('food.quarantineFees.alert.empty', { year: YEAR })}
        </Alert>
      )}

      {!loading && !error && categories.length > 0 && (
        <Stack direction="row" spacing={3} alignItems="stretch" sx={{ flexWrap: 'wrap' }}>
          {categories.map((category: QuarantineFeeCategory) => (
            <FeeCategoryCard key={category.key} category={category} t={t} />
          ))}
        </Stack>
      )}
    </Box>
  );
};

const FeeCategoryCard = ({ category, t }: { category: QuarantineFeeCategory; t: (key: string, opts?: Record<string, string | number>) => string }) => {
  const hasSdg = category.fees.some((f) => f.amount_sdg !== null);
  const hasUsd = category.fees.some((f) => f.amount_usd !== null);
  const hasNote = category.fees.some((f) => f.currency_note);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        flex: '1 1 560px',
        minWidth: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
          {category.label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {pluralizeItems(t, category.fees.length)}
        </Typography>
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        <TableContainer sx={{ bgcolor: 'transparent' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={thStyle}>{t('food.quarantineFees.table.code')}</TableCell>
                <TableCell sx={thStyle}>{t('food.quarantineFees.table.name')}</TableCell>
                {hasSdg && <TableCell sx={{ ...thStyle, color: '#16a34a' }}>SDG</TableCell>}
                {hasUsd && <TableCell sx={{ ...thStyle, color: '#2563eb' }}>USD</TableCell>}
                {hasNote && <TableCell sx={thStyle}>{t('food.quarantineFees.table.note')}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {category.fees.map((fee: QuarantineFee) => (
                <TableRow key={fee.id}>
                  <TableCell sx={{ ...tdStyle, fontFamily: 'monospace', color: '#334155' }}>{fee.code}</TableCell>
                  <TableCell sx={{ ...tdStyle, color: '#1e293b', fontWeight: 500 }}>{fee.name_ar}</TableCell>
                  {hasSdg && (
                    <TableCell sx={{ ...tdStyle, color: fee.amount_sdg !== null ? '#16a34a' : '#94a3b8' }}>
                      {fee.amount_sdg !== null ? Number(fee.amount_sdg).toLocaleString('en-US') : '—'}
                    </TableCell>
                  )}
                  {hasUsd && (
                    <TableCell sx={{ ...tdStyle, color: fee.amount_usd !== null ? '#2563eb' : '#94a3b8' }}>
                      {fee.amount_usd !== null ? Number(fee.amount_usd).toLocaleString('en-US') : '—'}
                    </TableCell>
                  )}
                  {hasNote && (
                    <TableCell sx={{ ...tdStyle, color: '#94a3b8' }}>{fee.currency_note || '—'}</TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Paper>
  );
};

const thStyle = {
  textAlign: 'right',
  padding: '8px',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: '#64748b',
  borderBottom: '2px solid #e2e8f0',
  whiteSpace: 'nowrap',
} as const;

const tdStyle = {
  textAlign: 'right',
  padding: '10px 8px',
  fontSize: '0.8rem',
  borderBottom: '1px solid #eef2f7',
  whiteSpace: 'nowrap',
} as const;

export default QuarantineFeesPage;