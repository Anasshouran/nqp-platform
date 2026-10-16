import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { PageTitle } from '../shared';
import { EmptyState } from '../../../components/uikit';

/* ========================== 8. الحالات المشتبهة ========================== */

export const Suspected = () => (
  <Box>
    <PageTitle title="الحالات المشتبهة" subtitle="تابع الحالات المحالة للفحص التفصيلي وإدارة قرارات العزل" />
    <EmptyState title="قيد الإعداد" description="بيانات الحالات المشتبهة تُحمل من مركز القيادة عند توفّرها." />
  </Box>
);

/* ============================= 9. العزل ============================= */

export const Isolation = () => (
  <Box>
    <PageTitle title="إدارة العزل" subtitle="وحدة عزل الطوارئ الصحية بجوار الطيران — السعة والحالات والإشراف الطبي" />
    <EmptyState title="قيد الإعداد" description="بيانات حالات العزل تُحمل من نظام العزل عند توفّرها." />
  </Box>
);

/* ============================= 10. المختبر ============================= */

export const Lab = () => (
  <Box>
    <PageTitle title="مختبر الصحة بالمطار" subtitle="إدارة أوامر التحاليل والعينات ونتائج RT-PCR والمستضد السريع" />
    <EmptyState title="قيد الإعداد" description="بيانات أوامر المختبر تُحمل من نظام المعامل عند توفّرها." />
  </Box>
);

/* ========================= 11. تتبع المخالطين ========================= */

export const ContactTracing = () => (
  <Box>
    <PageTitle title="تتبع المخالطين" subtitle="الحالة المؤشرة ومخالطي الرحلة — تتبع 가까운 المقاعد" />
    <EmptyState title="قيد الإعداد" description="بيانات تتبع المخالطين تُحمل من نظام الترصد عند توفّرها." />
  </Box>
);

/* ============================= 12. الطوارئ ============================= */

export const Emergency = () => (
  <Box>
    <PageTitle title="غرفة عمليات الطوارئ" subtitle="إدارة الاستجابة للطوارئ الصحية في المطار" />
    <EmptyState title="قيد الإعداد" description="بيانات غرفة العمليات تُحمل من نظام إدارة الطوارئ عند توفّرها." />
  </Box>
);
