import Box from '@mui/material/Box';
import { AppButton, StatusChip } from '../../../components/uikit';
import { labPriority, labSampleStatus } from '../../../utils/status';

type SampleRow = {
  sample_barcode: string;
  product: string;
  test_type: string;
  priority: string;
  sla: string;
  status: string;
};

const SampleList = ({
  samples,
  onStartAnalysis,
  onViewDetail,
}: {
  samples: SampleRow[];
  onStartAnalysis: (sampleId: string) => void;
  onViewDetail: (sampleId: string) => void;
}) => {
  return (
    <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
      {samples.map((sample) => (
        <Box
          component="li"
          key={sample.sample_barcode}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 1.5,
            mb: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 160 }}>
            <Box sx={{ fontWeight: 700 }}>{sample.sample_barcode}</Box>
            <Box sx={{ color: 'text.secondary', fontSize: 13 }}>
              {sample.product} {sample.test_type ? `• ${sample.test_type}` : ''}
            </Box>
          </Box>
          <StatusChip label={labPriority[sample.priority]?.label ?? sample.priority} tone={labPriority[sample.priority]?.tone} />
          <StatusChip label={labSampleStatus[sample.status]?.label ?? sample.status} tone={labSampleStatus[sample.status]?.tone} />
          <Box sx={{ color: 'text.secondary', fontSize: 13 }}>{sample.sla}</Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {onStartAnalysis && (
              <AppButton size="small" onClick={() => onStartAnalysis(sample.sample_barcode)}>▶️ بدء</AppButton>
            )}
            <AppButton size="small" variant="secondary" onClick={() => onViewDetail(sample.sample_barcode)}>👁️ تفاصيل</AppButton>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default SampleList;
