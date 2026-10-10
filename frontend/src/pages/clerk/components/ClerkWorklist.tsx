// The clerk worklist table.
// Extracted from ClerkDashboardPage without behavioural change.
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
}) => (
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
    searchPlaceholder="بحث برقم البيان، جمركي، بوليصة، مورد، باخرة…"
    sortBy={table.sortBy}
    sortOrder={table.sortOrder}
    onSortChange={table.setSorting}
    onPageChange={table.setPage}
    onRowsPerPageChange={table.setRowsPerPage}
    onRefresh={table.refresh}
    emptyTitle="لا توجد طلبات"
    emptyDescription="لم يتم العثور على طلبات تطابق هذه المعايير"
    actions={(r) => (
      <>
        {isDraftRow(r) && (
          <Tooltip title="إرسال لتحصيل الرسوم">
            <IconButton aria-label="إرسال" size="medium" color="success" onClick={() => onSend(r)} sx={{ borderRadius: 2 }}>
              <SendIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={isDraftRow(r) ? 'مسودة — قابلة للتعديل والحذف' : 'مشاهدة'}>
          <IconButton aria-label="تعديل" size="medium" color={isDraftRow(r) ? 'primary' : 'default'} onClick={() => onAction(r)} sx={{ borderRadius: 2 }}>
            {isDraftRow(r) ? <EditIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        {isDraftRow(r) && (
          <IconButton aria-label="حذف" size="medium" color="error" onClick={() => onDelete(r)} sx={{ borderRadius: 2 }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </>
    )}
  />
);
