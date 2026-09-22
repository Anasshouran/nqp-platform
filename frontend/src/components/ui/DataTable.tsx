import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import StorageIcon from '@mui/icons-material/Storage';
import EmptyState from '../common/EmptyState';
import type { SortOrder } from '../../hooks/useServerTable';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T, index: number) => ReactNode;
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  hideOnMobile?: boolean;
  noWrap?: boolean;
}

export interface DataTableFilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  count: number;
  page: number;
  rowsPerPage: number;
  pageSizeOptions?: number[];
  loading?: boolean;
  error?: string | null;
  title?: string;
  subtitle?: string;
  search?: string;
  searchInput?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: DataTableFilterDef[];
  sortBy?: string;
  sortOrder?: SortOrder;
  onSortChange?: (field: string) => void;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (size: number) => void;
  hidePagination?: boolean;
  onExport?: () => void;
  exporting?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  actions?: (row: T) => ReactNode;
  actionsLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbar?: ReactNode;
}

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const DataTable = <T,>({
  columns,
  rows,
  rowKey,
  count,
  page,
  rowsPerPage,
  pageSizeOptions = ROWS_PER_PAGE_OPTIONS,
  loading = false,
  error = null,
  title,
  subtitle,
  search,
  searchInput,
  onSearchChange,
  searchPlaceholder = 'بحث...',
  filters = [],
  sortBy,
  sortOrder,
  onSortChange,
  onPageChange,
  onRowsPerPageChange,
  hidePagination = false,
  onExport,
  exporting = false,
  onRefresh,
  refreshing = false,
  actions,
  actionsLabel = 'إجراءات',
  emptyTitle = 'لا توجد بيانات',
  emptyDescription = 'لم يتم العثور على سجلات تطابق هذه المعايير',
  toolbar,
}: DataTableProps<T>) => {
  const hasToolbar =
    title ||
    subtitle ||
    onSearchChange ||
    filters.length > 0 ||
    onRefresh ||
    onExport ||
    toolbar;

  return (
    <Paper
      role="region"
      aria-label={title || 'جدول البيانات'}
      aria-busy={loading || undefined}
      sx={{
        borderRadius: 4,
        overflow: 'hidden',
        border: '1px solid rgba(16,40,34,0.07)',
        bgcolor: 'rgba(255,255,255,0.86)',
        backdropFilter: 'blur(18px) saturate(1.35)',
        boxShadow: '0 1px 2px rgba(16,40,34,0.03), 0 10px 30px rgba(16,40,34,0.06)',
      }}
    >
      {hasToolbar && (
        <Box
          sx={{
            p: 2.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            alignItems: { xs: 'stretch', md: 'center' },
            justifyContent: 'space-between',
          }}
        >
          {(title || subtitle) && (
            <Box sx={{ minWidth: 0 }}>
              {title && (
                <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
          )}

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', md: 'center' }}
            sx={{ flexWrap: 'wrap' }}
          >
            {onSearchChange && (
              <TextField
                value={searchInput ?? search ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                size="small"
                sx={{
                  width: { xs: '100%', md: 240 },
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(16,40,34,0.05)',
                    borderRadius: 2.5,
                    transition: 'background-color 150ms ease, box-shadow 150ms ease',
                    '&:hover': { bgcolor: 'rgba(16,40,34,0.08)' },
                    '&.Mui-focused': {
                      bgcolor: '#fff',
                      boxShadow: (t) => `0 0 0 3px ${t.palette.primary.main}26`,
                    },
                  },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (searchInput || search) ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        aria-label="مسح البحث"
                        onClick={() => onSearchChange('')}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
            )}

            {filters.map((filter) => (
              <Select
                key={filter.key}
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                size="small"
                displayEmpty
                sx={{
                  minWidth: 160,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(16,40,34,0.05)',
                  '&:hover': { bgcolor: 'rgba(16,40,34,0.08)' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
                }}
                renderValue={(selected) =>
                  selected
                    ? filter.options.find((o) => o.value === selected)?.label
                    : filter.label
                }
              >
                <MenuItem value="">{filter.label}</MenuItem>
                {filter.options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            ))}

            {toolbar}

            {onRefresh && (
              <Tooltip title="تحديث">
                <IconButton aria-label="تحديث" onClick={onRefresh} disabled={refreshing || loading} sx={{ color: 'text.secondary' }}>
                  <RefreshIcon sx={{ animation: refreshing ? 'none' : undefined, fontSize: 22 }} />
                </IconButton>
              </Tooltip>
            )}
            {onExport && (
              <Button
                variant="outlined"
                size="medium"
                startIcon={<FileDownloadIcon />}
                onClick={onExport}
                disabled={exporting || loading || rows.length === 0}
              >
                {exporting ? 'جارٍ التصدير...' : 'تصدير'}
              </Button>
            )}
          </Stack>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
        <Table size="medium" aria-label={title}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  align={column.align || 'right'}
                  sx={{
                    width: column.width,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    display: { xs: column.hideOnMobile ? 'none' : 'table-cell', md: 'table-cell' },
                  }}
                >
                  {column.sortable && onSortChange ? (
                    <Button
                      size="small"
                      onClick={() => onSortChange(column.key)}
                      endIcon={
                        sortBy === column.key ? (
                          sortOrder === 'asc' ? (
                            <ArrowUpwardIcon fontSize="small" />
                          ) : (
                            <ArrowDownwardIcon fontSize="small" />
                          )
                        ) : undefined
                      }
                      sx={{
                        fontWeight: 700,
                        color: sortBy === column.key ? 'primary.main' : 'text.primary',
                        textTransform: 'none',
                        p: 0,
                        minWidth: 0,
                      }}
                    >
                      {column.label}
                    </Button>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
              {actions && (
                <TableCell align="left" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {actionsLabel}
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: Math.min(rowsPerPage, 8) }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      sx={{
                        display: { xs: column.hideOnMobile ? 'none' : 'table-cell', md: 'table-cell' },
                      }}
                    >
                      <Skeleton variant="text" width={i % 3 === 0 ? '70%' : '50%'} />
                    </TableCell>
                  ))}
                  {actions && <TableCell align="left"><Skeleton variant="circular" width={28} height={28} /></TableCell>}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (actions ? 1 : 0)} sx={{ py: 8 }}>
                  <EmptyState
                    icon={<StorageIcon sx={{ fontSize: 44 }} />}
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow
                  key={rowKey(row)}
                  hover
                  sx={{ '&:last-child td': { borderBottom: 0 }, transition: 'background-color 150ms ease' }}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      align={column.align || 'right'}
                      sx={{
                        whiteSpace: column.noWrap === false ? 'normal' : 'nowrap',
                        wordBreak: column.noWrap === false ? 'break-word' : 'normal',
                        display: { xs: column.hideOnMobile ? 'none' : 'table-cell', md: 'table-cell' },
                      }}
                    >
                      {column.render ? column.render(row, index) : (row as Record<string, unknown>)[column.key] as ReactNode}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell align="left" sx={{ whiteSpace: 'nowrap' }}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {actions(row)}
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {!hidePagination && (
        <TablePagination
          component="div"
          count={count}
          page={page - 1}
          onPageChange={(_, newPage) => onPageChange?.(newPage + 1)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => onRowsPerPageChange?.(Number(e.target.value))}
          rowsPerPageOptions={pageSizeOptions}
          labelRowsPerPage="صفوف لكل صفحة"
          labelDisplayedRows={({ from, to, count: total }) => `${from}-${to} من ${total}`}
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            '.MuiTablePagination-toolbar': { flexWrap: 'wrap', gap: 1 },
            '.MuiTablePagination-select': { borderRadius: 1.5 },
          }}
        />
      )}
    </Paper>
  );
};

export default DataTable;
