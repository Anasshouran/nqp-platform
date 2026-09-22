import { useState, type ReactElement, type ReactNode } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

export interface PageTab {
  label: string;
  icon?: ReactElement;
  panel?: ReactNode;
}

export interface PageTabsProps {
  tabs: PageTab[];
  /** Controlled active tab index. */
  value?: number;
  /** Initial tab index when uncontrolled. */
  defaultTab?: number;
  onChange?: (index: number) => void;
  /** Keep all panels mounted (hides inactive with CSS). */
  keepMounted?: boolean;
  variant?: 'standard' | 'scrollable' | 'fullWidth';
  scrollButtons?: 'auto' | true | false;
  sx?: SxProps<Theme>;
  panelSx?: SxProps<Theme>;
}

const PageTabs = ({
  tabs,
  value,
  defaultTab = 0,
  onChange,
  keepMounted = false,
  variant = 'scrollable',
  scrollButtons = 'auto',
  sx,
  panelSx,
}: PageTabsProps) => {
  const [inner, setInner] = useState(defaultTab);
  const active = value ?? inner;

  const setActive = (index: number) => {
    setInner(index);
    onChange?.(index);
  };

  return (
    <Box>
      <Tabs
        value={active}
        onChange={(_, index: number) => setActive(index)}
        variant={variant}
        scrollButtons={scrollButtons}
        allowScrollButtonsMobile
        sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 700 }, ...sx }}
      >
        {tabs.map((tab) =>
          tab.icon ? (
            <Tab key={tab.label} label={tab.label} icon={tab.icon} iconPosition="start" />
          ) : (
            <Tab key={tab.label} label={tab.label} />
          )
        )}
      </Tabs>
      {keepMounted ? (
        tabs.map((tab, index) => (
          <Box
            key={tab.label}
            sx={{ display: index === active ? 'block' : 'none', ...panelSx }}
          >
            {tab.panel}
          </Box>
        ))
      ) : (
        <Box sx={panelSx}>{tabs[active]?.panel}</Box>
      )}
    </Box>
  );
};

export default PageTabs;
