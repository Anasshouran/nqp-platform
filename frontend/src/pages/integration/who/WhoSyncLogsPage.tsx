import Box from '@mui/material/Box';
import { PageHeader } from '../../../components/common';
import WhoSyncLogsTable from './WhoSyncLogsTable';

/**
 * صفحة سجلات مزامنة WHO مستقلّة، لسببين:
 *
 * (1) عنصر «سجلات المزامنة» في القائمة كان يشير إلى صفحة «أمراض ICD-11» —
 *     خطأ تسمية كان يُدخل المستخدم صفحة خريطة الأمراض.
 * (2) جدول السجلات كان معرّفاً داخل لوحة التكاملات، فلا يصل إليه دور يملك
 *     ``who_logs:view`` دون ``who_integration:view`` دون أن يصطدم بـ403 على
 *     جدول التكاملات. الصفحة هنا محروسة بـ``who_logs:view`` وحدها.
 */
const WhoSyncLogsPage = () => (
  <Box>
    <PageHeader
      title="سجلات المزامنة"
      subtitle="سجل عمليات الاتصال بمنظمة الصحة العالمية: مزامنة ICD-11، فحوص الاتصال، وإرسال أحداث اللائحة الصحية الدولية"
      eyebrow="WHO / Sync Logs"
    />
    <WhoSyncLogsTable />
  </Box>
);

export default WhoSyncLogsPage;
