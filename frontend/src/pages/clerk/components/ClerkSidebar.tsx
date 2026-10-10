// Collapsible navigation rail for the clerk dashboard.
// Extracted from ClerkDashboardPage without behavioural change.
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import Chip from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoIcon from '@mui/icons-material/Info';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export const NotificationDot = ({ tone }: { tone: 'error' | 'warning' | 'success' | 'info' }) => {
  const meta = {
    error: { color: 'error.main', label: 'خطأ', Icon: ErrorOutlineIcon },
    warning: { color: 'warning.main', label: 'تنبيه', Icon: WarningAmberIcon },
    success: { color: 'success.main', label: 'نجاح', Icon: CheckCircleIcon },
    info: { color: 'info.main', label: 'معلومة', Icon: InfoIcon },
  }[tone];
  return (
    <Tooltip title={meta.label}>
      <Box
        sx={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          mt: 0.35,
          flexShrink: 0,
          color: meta.color,
          bgcolor: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
        }}
      >
        <meta.Icon sx={{ fontSize: 15 }} aria-hidden="true" />
      </Box>
    </Tooltip>
  );
};

export const SidebarItem = ({
  item,
  active,
  collapsed,
  onClick,
  badge,
}: {
  item: { key: string; label: string; icon: React.ReactNode };
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  badge?: number | undefined;
}) => (
  <Tooltip title={collapsed ? item.label : ''} placement="left-start">
    <Button
      fullWidth
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      variant={active ? 'contained' : 'text'}
      color={active ? 'primary' : 'inherit'}
      startIcon={item.icon}
      sx={{
        justifyContent: collapsed ? 'center' : 'space-between',
        px: collapsed ? 0 : 1.25,
        minHeight: 42,
        borderRadius: 2,
        textTransform: 'none',
        fontWeight: active ? 800 : 700,
        fontSize: 13.5,
        '& .MuiButton-startIcon': { ml: collapsed ? 0 : -0.5 },
      }}
    >
      {!collapsed && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, textAlign: 'right' }}>
          <span>{item.label}</span>
          {badge != null && badge > 0 && (
            <Chip size="small" color="warning" label={badge} sx={{ height: 20, minWidth: 20, fontSize: 11, fontWeight: 700 }} />
          )}
        </Box>
      )}
      {collapsed && badge != null && badge > 0 && <Badge color="warning" variant="dot" />}
    </Button>
  </Tooltip>
);

