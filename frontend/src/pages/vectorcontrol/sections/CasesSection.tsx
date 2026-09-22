import { useState } from 'react';
import Typography from '@mui/material/Typography';
import BiotechIcon from '@mui/icons-material/Biotech';
import { DataTable } from '../../../components/ui';
import type { VectorCase } from '../../../types/vectorControl';
import { SectionCard, SectionHeading } from './common';
import { formatDate } from '../../../utils/formatters';

const CasesSection = () => {
  const [rows] = useState<VectorCase[]>([]);
  const [loading, setLoading] = useState(false);

  // حالات الأوبئة تُقرأ عبر نظام الترصد الوبائي في البوابة — إطار عرض مستقل
  return (
    <SectionCard id="cases">
      <SectionHeading icon={<BiotechIcon color="error" />} title="الحالات" subtitle="أمراض منقولة بالنواقل" />
      <DataTable<VectorCase>
        columns={[
          { key: 'case_number', label: 'الرقم', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.case_number}</Typography> },
          { key: 'focus_number', label: 'البؤرة' },
          { key: 'disease', label: 'المرض' },
          { key: 'classification', label: 'التصنيف', render: (r) => r.classification_display || r.classification },
          { key: 'detected_at', label: 'تاريخ الرصد', render: (r) => formatDate(r.detected_at) },
        ]}
        rows={rows} rowKey={(r) => r.id} count={0} loading={loading}
        page={0} rowsPerPage={10} pageSizeOptions={[10]}
        onPageChange={() => {}} onRowsPerPageChange={() => {}}
        title="الحالات" subtitle="بيانات الحالات من نظام الترصد الوبائي"
        onRefresh={() => setLoading((l) => !l)}
        emptyTitle="الأمراض المنقولة بالنواقل"
        emptyDescription="تُعرض هنا الحالات المسجلة لدى نظام الترصد الوبائي — يُفتح رابطها من لوحة البوابة"
      />
    </SectionCard>
  );
};

export default CasesSection;