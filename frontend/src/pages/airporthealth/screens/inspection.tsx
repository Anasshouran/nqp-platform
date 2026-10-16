import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { PageTitle } from '../shared';
import { EmptyState } from '../../../components/uikit';

/* ============================ 13. تفتيش الطائرات ============================ */

export const Inspection = () => (
  <Box>
    <PageTitle title="تفتيش الطائرات" subtitle="فحص النظافة البيئية للطائرات الواصلة — المفتش والمعاين" />
    <EmptyState title="قيد الإعداد" description="بيانات تفتيش الطائرات تُحمل من نظام التفتيش عند توفّرها." />
  </Box>
);

/* ============================== 14. التحليلات ============================== */

export const Analytics = () => (
  <Box>
    <PageTitle title="التحليلات والإحصاءات" subtitle="مؤشرات أداء الفحص والمختبر وتفتيش الطائرات" />
    <EmptyState title="قيد الإعداد" description="بيانات التحليلات تُحمل من منصة التقارير عند توفّرها." />
  </Box>
);

/* ============================= 15. الشهادات ============================= */

export const Certificates = () => (
  <Box>
    <PageTitle title="الشهادات والفسوحات الصحية" subtitle="إصدار الشهادات الصحية وفسوح الطائرات وفق اللوائح الصحية الدولية" />
    <EmptyState title="قيد الإعداد" description="بيانات الشهادات تُحمل من نظام الإصدار عند توفّرها." />
  </Box>
);
