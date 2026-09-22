import { Navigate, Outlet, useLocation } from 'react-router-dom';

const TravelerProtectedRoute = () => {
  const token = localStorage.getItem('access_token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/traveler/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
};

export default TravelerProtectedRoute;
