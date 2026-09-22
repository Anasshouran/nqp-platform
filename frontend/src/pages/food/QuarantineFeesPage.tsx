import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
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

const QuarantineFeesPage = () => {
  const [data, setData] = useState<QuarantineFeeSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getQuarantineFees(YEAR)
      .then((response) => {
        if (mounted) {
          setData(response.data.data);
          setError(false);
        }
      })
      .catch(() => {
        if (mounted) setError(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Box>
      <PageHeader
        title="رسوم اللائحة المالية 2025"
        subtitle="تقرير شامل بجميع رسوم اللائحة المالية السارية لعام 2025"
        eyebrow="رسوم اللائحة المالية"
      />

      <Box sx={{ mb: 4 }}>
        <Alert severity="info" icon={false}>
          يتضمن هذا التقرير <strong>86 بنداً</strong> موزعة عبر <strong>12 قسمًا</strong>، مع دعم عملتين:
          السوداني (SDG) والدولي (USD). أي بند يمتلك العملتين يتم عرضه في عمودين منفصلين.
        </Alert>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error">
          تعذر تحميل رسوم اللائحة المالية. تأكد من اتصال الخادم وحاول مرة أخرى.
        </Alert>
      )}

      {!loading && !error && data && (
        <Stack direction="row" spacing={3} alignItems="flex-start" sx={{ flexWrap: 'wrap' }}>
          {data.categories.map((category: QuarantineFeeCategory) => (
            <FeeCategoryCard key={category.key} category={category} />
          ))}
        </Stack>
      )}
    </Box>
  );
};

const FeeCategoryCard = ({ category }: { category: QuarantineFeeCategory }) => {
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
          {category.fees.length} بند
        </Typography>
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        <TableContainer sx={{ bgcolor: 'transparent' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={thStyle}>الكود</TableCell>
                <TableCell sx={thStyle}>الاسم</TableCell>
                {hasSdg && <TableCell sx={{ ...thStyle, color: '#16a34a' }}>SDG</TableCell>}
                {hasUsd && <TableCell sx={{ ...thStyle, color: '#2563eb' }}>USD</TableCell>}
                {hasNote && <TableCell sx={thStyle}>ملاحظة</TableCell>}
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