import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { RoleCode } from '../utils/roleHome';
import { roleHomePathFor } from '../utils/roleHome';
import { isUserInSector } from '../utils/scopes';

interface ProtectedRouteProps {
  /** إذا حُدّد، يجب أن يكون دور المستخدم ضمن هذه القائمة وإلا يُعاد توجيهه. */
  roles?: RoleCode[];
  /** إذا حُدّد، يجب أن يكون قطاع المستخدم مطابقاً (كود، مثل RED_SEA). */
  sectorCode?: string;
}

/**
 * حارس المسارات: يتحقق أولاً من تسجيل الدخول، ثم من الدور (إن حُدّد) ونطاق
 * القطاع (إن حُدّد). عند عدم استيفاء الشروط يُعاد توجيه المستخدم إلى مساره
 * الرئيسي حسب الدور، بدلاً من السماح بالوصول المباشر عبر الرابط.
 */
const ProtectedRoute = ({ roles, sectorCode }: ProtectedRouteProps = {}) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const role = user?.role;
  if (roles && !role) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (roles && role && !(roles as string[]).includes(role)) {
    return <Navigate to={roleHomePathFor(user)} replace />;
  }

  if (sectorCode && !isUserInSector(user, sectorCode)) {
    return <Navigate to={roleHomePathFor(user)} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
