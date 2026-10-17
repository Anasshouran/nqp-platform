import { useLocation } from 'react-router-dom';
import { ShippingDashboard } from './components/ShippingDashboard';
import { VesselList } from './components/VesselList';
import { VesselVisitList } from './components/VesselVisitList';
import { PreArrivalList } from './components/PreArrivalList';
import { ClearanceList } from './components/ClearanceList';
import { DepartureList } from './components/DepartureList';
import { DocumentList } from './components/DocumentList';
import { NotificationList } from './components/NotificationList';
import { AgentManagement } from './components/AgentManagement';
import { VesselRelationships } from './components/VesselRelationships';

/**
 * بوابة الشحن البحري.
 *
 * قسم واحد يُختار من `#hash` الذي تحدّده القائمة الجانبية للدور
 * (مثل `/app/shipping#vessels`) — على نمط laboratory/borders؛ لا توجد
 * قائمة تنقّل ثانية داخل الصفحة.
 */
const ShippingPortalPage = () => {
  const { hash } = useLocation();
  const section = hash.replace('#', '');

  switch (section) {
    case 'vessels': return <VesselList />;
    case 'visits': return <VesselVisitList />;
    case 'pre-arrivals': return <PreArrivalList />;
    case 'clearance': return <ClearanceList />;
    case 'departures': return <DepartureList />;
    case 'documents': return <DocumentList />;
    case 'notifications': return <NotificationList />;
    case 'agents': return <AgentManagement />;
    case 'relationships': return <VesselRelationships />;
    case 'dashboard':
    default: return <ShippingDashboard />;
  }
};

export default ShippingPortalPage;
