import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { roleHomePathFor } from '../../utils/roleHome';
import DashboardPage from './DashboardPage';

const AppHomeRoute = () => {
  const { user } = useAuth();
  const home = roleHomePathFor(user);
  if (home === '/app') {
    return <DashboardPage />;
  }
  return <Navigate to={home} replace />;
};

export default AppHomeRoute;