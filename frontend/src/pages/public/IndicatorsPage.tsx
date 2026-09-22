import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { getPublicStatistics } from '../../api/endpoints/public';
import type { PublicStatistics } from '../../api/endpoints/public';
import { PageHeader, ErrorState } from '../../components/common';
import PerformanceKpiCards from '../../components/PerformanceKpiCards';
import { useApi } from '../../hooks/useApi';

const IndicatorsPage = () => {
  const { data, loading, error, retry } = useApi<PublicStatistics>(() =>
    getPublicStatistics().then((response) => response.data.data),
  );

  return (
    <Box sx={{ py: 4, bgcolor: 'grey.50', flex: 1 }}>
      <Container maxWidth="lg">
        <PageHeader
          eyebrow="إحصاءات المنصة"
          title="المؤشرات العامة"
          subtitle="مؤشرات وإحصاءات المنصة: قطاعات ومنافذ وفحوصات وشهادات وأنشطة تشغيلية"
        />
        {error ? (
          <ErrorState onRetry={retry} />
        ) : (
          <PerformanceKpiCards stats={data ?? null} loading={loading} onRetry={retry} />
        )}
      </Container>
    </Box>
  );
};

export default IndicatorsPage;