import Button from '@mui/material/Button';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportToCsv } from '../../utils/csv';

export interface ExportButtonProps {
  filename: string;
  headers: string[];
  rows: unknown[][];
  label?: string;
  exportingLabel?: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

const ExportButton = ({
  filename,
  headers,
  rows,
  label = 'تصدير',
  exportingLabel = 'جارٍ التصدير...',
  disabled = false,
  size = 'medium',
}: ExportButtonProps) => {
  const exporting = false;
  const canExport = rows.length > 0 && !disabled;

  const handleExport = () => {
    if (!canExport || exporting) return;
    exportToCsv(filename, headers, rows);
  };

  return (
    <Button
      variant="outlined"
      size={size}
      startIcon={<FileDownloadIcon />}
      onClick={handleExport}
      disabled={!canExport}
    >
      {exporting ? exportingLabel : label}
    </Button>
  );
};

export default ExportButton;
