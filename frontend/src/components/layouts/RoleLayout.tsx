import GenericRoleLayout from './GenericRoleLayout';
import WorkspaceUnavailable from './WorkspaceUnavailable';
import { ROLE_LAYOUT_CONFIG } from '../../config/roleLayouts';
import { useAuth } from '../../hooks/useAuth';

/**
 * توزيع القوائم الجانبية حسب الدور: جميع الأدوار تُقدَّم من
 * GenericRoleLayout عبر ROLE_LAYOUT_CONFIG — قائمة واحدة موحدة قابلة للإعداد.
 * الأدوار غير المعرَّفة تعرض حالة «مساحة العمل غير متاحة» صريحة بدل
 * إعادة المستخدم الموثَّق إلى /login (حلقة توجيه لا نهاية لها).
 */
const RoleLayout = () => {
  const { user } = useAuth();
  const role = user?.role;

  if (role && ROLE_LAYOUT_CONFIG[role]) {
    return <GenericRoleLayout role={role} />;
  }

  return <WorkspaceUnavailable role={role ?? null} />;
};

export default RoleLayout;
