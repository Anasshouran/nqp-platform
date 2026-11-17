// The clerk worklist table.
// Extracted from ClerkDashboardPage without behavioural change.
import { useTranslation } from 'react-i18next';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import type { FoodShipment } from '../../../types/food';
import { DataTable } from '../../../components/uikit';
import { type DataTableFilterDef, type UseServerTableResult } from '../../../hooks/useServerTable';
import { WORKLIST_COLUMNS, isDraftRow } from '../constants';

export const WorklistTable = ({
  table,
  filters,
  title,
  subtitle,
  onAction,
  onDelete,
  onSend,
}: {
  table: UseServerTableResult<FoodShipment>;
  filters: DataTableFilterDef[];
  title: string;
  subtitle: string;
  onAction: (r: FoodShipment) => void;
  onDelete: (r: FoodShipment) => void;
  onSend: (r: FoodShipment) => void;
}) => {
  const { t } = useTranslation();
  return (
    <DataTable<FoodShipment>
      columns={WORKLIST_COLUMNS}
    rows={table.rows}
    rowKey={(r) => r.id}
    count={table.count}
    page={table.page}
    rowsPerPage={table.rowsPerPage}
    pageSizeOptions={table.pageSizeOptions}
    loading={table.loading}
    error={table.error}
    filters={filters}
    title={title}
    subtitle={subtitle}
    searchInput={table.searchInput}
    onSearchChange={table.setSearchInput}
    searchPlaceholder={t('clerk.components.worklist.searchPlaceholder')}
    sortBy={table.sortBy}
    sortOrder={table.sortOrder}
    onSortChange={table.setSorting}
    onPageChange={table.setPage}
    onRowsPerPageChange={table.setRowsPerPage}
    onRefresh={table.refresh}
    emptyTitle={t('clerk.components.worklist.emptyTitle')}
    emptyDescription={t('clerk.components.worklist.emptyDescription')}
    actions={(r) => (
      <>
        {isDraftRow(r) && (
          <Tooltip title={t('clerk.components.worklist.sendTitle')}>
            <IconButton aria-label={t('clerk.components.worklist.send')} size="medium" color="success" onClick={() => onSend(r)} sx={{ borderRadius: 2 }}>
              <SendIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={isDraftRow(r) ? t('clerk.components.worklist.draftTooltip') : t('clerk.components.worklist.viewTooltip')}>
          <IconButton aria-label={t('clerk.components.worklist.edit')} size="medium" color={isDraftRow(r) ? 'primary' : 'default'} onClick={() => onAction(r)} sx={{ borderRadius: 2 }}>
            {isDraftRow(r) ? <EditIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        {isDraftRow(r) && (
          <IconButton aria-label={t('clerk.components.worklist.delete')} size="medium" color="error" onClick={() => onDelete(r)} sx={{ borderRadius: 2 }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </>
    )}
  />
  );
}
