import GenericRoleLayout from './GenericRoleLayout';
import { ROLE_LAYOUT_CONFIG } from '../../config/roleLayouts';
import { useAuth } from '../../hooks/useAuth';
import { Navigate } from 'react-router-dom';

/**
 * توزيع القوائم الجانبية حسب الدور: جميع الأدوار تُقدَّم من
 * GenericRoleLayout عبر ROLE_LAYOUT_CONFIG — قائمة واحدة موحدة قابلة للإعداد.
 * الأدوار غير المعرَّفة تُعيد التوجيه لصفحة الدخول.
 */
const RoleLayout = () => {
  const { user } = useAuth();
  const role = user?.role;

  if (role && ROLE_LAYOUT_CONFIG[role]) {
    return <GenericRoleLayout role={role} />;
  }

  return <Navigate to="/login" replace />;
};

export default RoleLayout;