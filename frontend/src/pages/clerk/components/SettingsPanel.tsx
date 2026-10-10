// Dashboard settings rows.
// Extracted from ClerkDashboardPage without behavioural change.
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

export const SettingRow = ({ label, value, onToggle }: { label: string; value: string; onToggle: () => void }) => (
  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.5, borderRadius: 2.5, border: '1px solid rgba(16,40,34,0.07)' }}>
    <Typography variant="body2" sx={{ fontWeight: 700 }}>{label}</Typography>
    <Button size="small" variant="outlined" onClick={onToggle} sx={{ borderRadius: 2 }}>
      {value}
    </Button>
  </Stack>
);
