/**
 * Unified UI kit — the single import point for the platform's reusable components.
 *
 * ```ts
 * import { PageHeader, DataTable, StatCard, FormDialog, FormTextField, FormSelect, PageTabs, ExportButton, StatusChip, ConfirmDialog, SectionCard } from '../../components/uikit';
 * ```
 */

// Layout & common
export { default as PageHeader } from '../common/PageHeader';
export { default as SectionTitle } from '../common/SectionTitle';
export { default as EmptyState } from '../common/EmptyState';
export { default as StatCard } from '../common/StatCard';
export { default as BrandLogo } from '../common/BrandLogo';
export { default as BackToTop } from '../common/BackToTop';
export { default as Particles } from '../common/Particles';
export { default as PageLoader } from '../common/PageLoader';
export { default as LiveClock } from '../common/LiveClock';
export { default as SmartAssistant } from '../common/SmartAssistant';
export { CardSkeleton, CardsGridSkeleton, ListSkeleton, TableSkeleton } from '../common/LoadingSkeleton';

// Data display
export { default as DataTable } from '../ui/DataTable';
export type { DataTableColumn, DataTableFilterDef, DataTableProps } from '../ui/DataTable';
export { default as StatusChip } from '../ui/StatusChip';
export type { StatusTone, StatusChipProps } from '../ui/StatusChip';
export { default as SectionCard } from './SectionCard';

// Forms
export { default as FormTextField } from '../ui/FormTextField';
export type { FormTextFieldProps } from '../ui/FormTextField';
export { default as FormSelect } from './FormSelect';
export type { FormSelectOption, FormSelectProps } from './FormSelect';
export { default as FormDialog } from './FormDialog';
export type { FormDialogProps } from './FormDialog';
export { default as ConfirmDialog } from '../ui/ConfirmDialog';
export { default as AppButton } from '../ui/AppButton';

// Navigation
export { default as PageTabs } from './PageTabs';
export type { PageTab, PageTabsProps } from './PageTabs';

// Actions
export { default as ExportButton } from './ExportButton';
export type { ExportButtonProps } from './ExportButton';

// Feedback
export { default as NotificationPanel } from './NotificationPanel';
export type { NotificationPanelProps } from './NotificationPanel';
