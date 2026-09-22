import { useState } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { RoleNavItem } from '../../config/roleLayouts';

export interface RoleNavSection {
  label?: string;
  items: RoleNavItem[];
}

interface RoleNavMenuProps {
  /** أقسام القائمة (كل قسم بعنوان overline اختياري) */
  sections: RoleNavSection[];
  /** اللون الأساسي للدور (تدرّجات النص النشط والخلفية) */
  accent: string;
  /** وضع الطي لأيقونات فقط (أدوار Generic) */
  collapsed?: boolean;
  /** عدّاد شارة التنبيهات الحية (badge: 'micro') */
  microBadgeCount?: number;
  currentPathname: string;
  currentSearch: string;
  onNavigate: (target: string) => void;
}

const badgeValue = (badge: RoleNavItem['badge'], microCount: number): number | undefined => {
  if (badge === 'micro') return microCount;
  if (typeof badge === 'number' && badge > 0) return badge;
  return undefined;
};

const matchActive = (target: string | undefined, pathname: string, search: string, exact = false): boolean => {
  if (!target) return false;
  const [path, query] = target.split('?');
  const pathOk = exact ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);
  if (!pathOk) return false;
  if (query === undefined || query === '') return true;
  return search.slice(1).split('&').includes(query);
};

/** قالب تنقّل موحّد مُدار بالتهيئة: يُستخدم نفسه في جميع تخطيطات الأدوار
 *  (Generic + ADMIN) لإزالة تكرار القوائم وحفظ الأسلوب البصري. */
const RoleNavMenu = ({
  sections,
  accent,
  collapsed = false,
  microBadgeCount = 0,
  currentPathname,
  currentSearch,
  onNavigate,
}: RoleNavMenuProps) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (label: string) =>
    setExpanded((s) => ({ ...s, [label]: !s[label] }));

  const renderLeaf = (item: RoleNavItem) => {
    const b = badgeValue(item.badge, microBadgeCount);
    const active = matchActive(item.target, currentPathname, currentSearch, item.exact);
    const button = (
      <ListItemButton
        component="a"
        onClick={() => item.target && onNavigate(item.target)}
        sx={{
          mx: collapsed ? 1 : 1.25,
          position: 'relative',
          color: active ? 'primary.main' : 'text.primary',
          fontWeight: active ? 800 : 600,
          borderRadius: 2,
          bgcolor: active ? `${accent}14` : 'transparent',
          justifyContent: collapsed ? 'center' : 'flex-start',
          ...(active
            ? {
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  insetInlineStart: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 4,
                  height: 20,
                  borderRadius: '999px',
                  bgcolor: 'primary.main',
                },
              }
            : {}),
          '&:hover': { bgcolor: `${accent}12`, color: 'primary.main' },
        }}
      >
        <ListItemIcon sx={{ color: 'inherit', minWidth: collapsed ? 0 : 38, '& .MuiSvgIcon-root': { fontSize: 21 } }}>
          {item.icon}
        </ListItemIcon>
        {!collapsed && <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 'inherit', fontSize: 14 }} />}
        {!collapsed && b !== undefined && (
          <Chip size="small" label={b} sx={{ bgcolor: 'rgba(198,58,58,0.12)', color: '#c63a3a', fontWeight: 700, fontSize: 11 }} />
        )}
      </ListItemButton>
    );
    return (
      <ListItem key={item.label} disablePadding>
        {collapsed ? <Tooltip title={item.label} placement="left">{button}</Tooltip> : button}
      </ListItem>
    );
  };

  const renderParent = (item: RoleNavItem) => {
    const activeChild = !!item.children?.some((c) =>
      matchActive(c.target, currentPathname, currentSearch)
    );
    const open = expanded[item.label] ?? activeChild;
    const parentButton = (
      <ListItemButton
        onClick={() => toggle(item.label)}
        sx={{
          mx: collapsed ? 1 : 1.25,
          position: 'relative',
          color: activeChild ? 'primary.main' : 'text.primary',
          fontWeight: 700,
          borderRadius: 2,
          justifyContent: collapsed ? 'center' : 'flex-start',
          bgcolor: activeChild ? `${accent}14` : 'transparent',
          ...(activeChild
            ? {
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  insetInlineStart: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 4,
                  height: 20,
                  borderRadius: '999px',
                  bgcolor: 'primary.main',
                },
              }
            : {}),
          '&:hover': { bgcolor: `${accent}12`, color: 'primary.main' },
        }}
      >
        <ListItemIcon sx={{ color: 'inherit', minWidth: collapsed ? 0 : 38, '& .MuiSvgIcon-root': { fontSize: 21 } }}>
          {item.icon}
        </ListItemIcon>
        {!collapsed && <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 'inherit', fontSize: 14 }} />}
        {!collapsed && !open && <ExpandMoreIcon fontSize="small" sx={{ color: 'text.disabled' }} />}
        {!collapsed && open && <ExpandLessIcon fontSize="small" sx={{ color: 'primary.main' }} />}
      </ListItemButton>
    );
    return (
      <ListItem key={item.label} disablePadding sx={{ display: 'block' }}>
        {collapsed ? (
          <Tooltip title={item.label} placement="left">
            {parentButton}
          </Tooltip>
        ) : (
          parentButton
        )}
        {!collapsed && (
          <Collapse in={open} timeout="auto" unmountOnExit>
            <List disablePadding sx={{ position: 'relative' }}>
              {item.children!.map((child) => {
                const b = badgeValue(child.badge, microBadgeCount);
                const active = matchActive(child.target, currentPathname, currentSearch);
                return (
                  <ListItem key={child.label} disablePadding>
                    <ListItemButton
                      component="a"
                      onClick={() => child.target && onNavigate(child.target)}
                      sx={{
                        mx: 1.25,
                        pl: 6,
                        py: 0.5,
                        color: active ? 'primary.main' : 'text.secondary',
                        fontWeight: active ? 800 : 600,
                        borderRadius: 2,
                        bgcolor: active ? `${accent}14` : 'transparent',
                        position: 'relative',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          insetInlineStart: 34,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          bgcolor: active ? 'primary.main' : `${accent}55`,
                        },
                        ...(active
                          ? {
                              '&::after': {
                                content: '""',
                                position: 'absolute',
                                insetInlineStart: 34,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                boxShadow: '0 0 0 5px rgba(12,127,106,0.12)',
                              },
                            }
                          : {}),
                        '&:hover': { bgcolor: `${accent}12`, color: 'primary.main' },
                      }}
                    >
                      <ListItemText
                        primary={child.label}
                        primaryTypographyProps={{ fontWeight: 'inherit', fontSize: 12.5 }}
                      />
                      {b !== undefined && (
                        <Chip size="small" label={b} sx={{ bgcolor: 'rgba(198,58,58,0.12)', color: '#c63a3a', fontWeight: 700, fontSize: 11 }} />
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Collapse>
        )}
      </ListItem>
    );
  };

  const renderItem = (item: RoleNavItem) =>
    item.children && item.children.length > 0 ? renderParent(item) : renderLeaf(item);

  return (
    <>
      {sections.map((section) => (
        <Box key={section.label ?? 'القائمة'} sx={{ mb: section.label ? 1 : 0 }}>
          {section.label && !collapsed && (
            <Typography
              variant="overline"
              sx={{ px: 2.5, pt: 0.5, color: 'text.disabled', fontWeight: 700, fontSize: 11, display: 'block', mb: 0.5 }}
            >
              {section.label}
            </Typography>
          )}
          <List disablePadding>{section.items.map(renderItem)}</List>
        </Box>
      ))}
    </>
  );
};

export default RoleNavMenu;