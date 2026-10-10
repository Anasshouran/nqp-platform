import { lazy, Suspense, useEffect, useState } from 'react';
import { Box, Grid, Typography, Paper, IconButton, Menu, MenuItem, Tooltip, Stack, Tabs, Tab } from '@mui/material';
import { Dashboard, DirectionsBoat, LocalShipping, Business, Assignment, Description, Notifications, Settings, Person, Logout } from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { ShippingDashboard } from './components/ShippingDashboard';
import { VesselList } from './components/VesselList';
import { VesselVisitList } from './components/VesselVisitList';
import { PreArrivalList } from './components/PreArrivalList';
import { ClearanceList } from './components/ClearanceList';
import { DepartureList } from './components/DepartureList';
import { DocumentList } from './components/DocumentList';
import { NotificationList } from './components/NotificationList';
import { CompanyProfile } from './components/CompanyProfile';
import { AgentManagement } from './components/AgentManagement';
import { VesselRelationships } from './components/VesselRelationships';

const sections = [
  { key: 'dashboard', label: 'Dashboard', icon: <Dashboard /> },
  { key: 'vessels', label: 'Vessels', icon: <DirectionsBoat /> },
  { key: 'visits', label: 'Visits', icon: <LocalShipping /> },
  { key: 'pre-arrivals', label: 'Pre-Arrivals', icon: <Assignment /> },
  { key: 'clearance', label: 'Clearance', icon: <Description /> },
  { key: 'departures', label: 'Departures', icon: <DirectionsBoat /> },
  { key: 'documents', label: 'Documents', icon: <Description /> },
  { key: 'notifications', label: 'Notifications', icon: <Notifications /> },
  { key: 'company', label: 'Company', icon: <Business /> },
  { key: 'agents', label: 'Agents', icon: <Person /> },
  { key: 'relationships', label: 'Relationships', icon: <Assignment /> },
];

const ShippingPortalPage = () => {
  const { user, token } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <ShippingDashboard />;
      case 'vessels': return <VesselList />;
      case 'visits': return <VesselVisitList />;
      case 'pre-arrivals': return <PreArrivalList />;
      case 'clearance': return <ClearanceList />;
      case 'departures': return <DepartureList />;
      case 'documents': return <DocumentList />;
      case 'notifications': return <NotificationList />;
      case 'company': return <CompanyProfile />;
      case 'agents': return <AgentManagement />;
      case 'relationships': return <VesselRelationships />;
      default: return <ShippingDashboard />;
    }
  };

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', minHeight: '100vh' }}>
      <Box sx={{ width: 240, borderRight: 1, borderColor: 'divider', p: 2 }}>
        <Typography variant="h6" gutterBottom>Shipping Portal</Typography>
        <Tabs
          orientation="vertical"
          value={activeSection}
          onChange={(_, v) => setActiveSection(v)}
          sx={{ alignItems: 'flex-start' }}
        >
          {sections.map(s => (
            <Tab key={s.key} value={s.key} label={s.label} icon={s.icon} iconPosition="start" sx={{ minHeight: 48 }} />
          ))}
        </Tabs>
      </Box>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {renderSection()}
      </Box>
    </Box>
  );
};

export default ShippingPortalPage;
