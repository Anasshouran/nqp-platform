import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Typography from '@mui/material/Typography';
import BiotechIcon from '@mui/icons-material/Biotech';
import { DataTable } from '../../../components/ui';
import type { VectorCase } from '../../../types/vectorControl';
import { SectionCard, SectionHeading } from './common';
import { formatDate } from '../../../utils/formatters';

const CasesSection = () => {
  const { t } = useTranslation();
  const [rows] = useState<VectorCase[]>([]);
  const [loading, setLoading] = useState(false);

  // حالات الأوبئة تُقرأ عبر نظام الترصد الوبائي في البوابة — إطار عرض مستقل
  return (
    <SectionCard id="cases">
      <SectionHeading icon={<BiotechIcon color="error" />} title={t('vectorcontrol.casesSection.title')} subtitle={t('vectorcontrol.casesSection.sectionSubtitle')} />
      <DataTable<VectorCase>
        columns={[
          { key: 'case_number', label: t('vectorcontrol.casesSection.caseNumberLabel'), render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.case_number}</Typography> },
          { key: 'focus_number', label: t('vectorcontrol.casesSection.focusNumberLabel') },
          { key: 'disease', label: t('vectorcontrol.casesSection.diseaseLabel') },
          { key: 'classification', label: t('vectorcontrol.casesSection.classificationLabel'), render: (r) => r.classification_display || r.classification },
          { key: 'detected_at', label: t('vectorcontrol.casesSection.detectedAtLabel'), render: (r) => formatDate(r.detected_at) },
        ]}
        rows={rows} rowKey={(r) => r.id} count={0} loading={loading}
        page={0} rowsPerPage={10} pageSizeOptions={[10]}
        onPageChange={() => {}} onRowsPerPageChange={() => {}}
        title={t('vectorcontrol.casesSection.title')} subtitle={t('vectorcontrol.casesSection.casesSubtitle')}
        onRefresh={() => setLoading((l) => !l)}
        emptyTitle={t('vectorcontrol.casesSection.emptyTitle')}
        emptyDescription={t('vectorcontrol.casesSection.emptyDescription')}
      />
    </SectionCard>
  );
};

export default CasesSection;