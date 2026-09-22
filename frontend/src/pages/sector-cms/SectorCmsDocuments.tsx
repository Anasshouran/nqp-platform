import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Skeleton from '@mui/material/Skeleton';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DescriptionIcon from '@mui/icons-material/Description';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import GridOnIcon from '@mui/icons-material/GridOn';
import ArticleIcon from '@mui/icons-material/Article';
import { getDocuments, type CmsDocument } from '../../api/endpoints/public';
import { SectorPageShell, SectorHomeLink, useSectorSite, ErrorNotice, usePageTitle } from './SectorCmsShared';

const categoryLabels: Record<string, string> = {
  LAW: 'قانون',
  REGULATION: 'لائحة',
  FORM: 'نموذج',
  GUIDE: 'دليل',
  OTHER: 'أخرى',
};

const categoryColors: Record<string, string> = {
  LAW: '#0e8a72',
  REGULATION: '#2f6f9f',
  FORM: '#c8a13a',
  GUIDE: '#7a5c9e',
  OTHER: '#4f6f8f',
};

const fileTypeIcons: Record<string, React.ReactNode> = {
  PDF: <PictureAsPdfIcon />,
  DOC: <DescriptionIcon />,
  DOCX: <DescriptionIcon />,
  XLS: <GridOnIcon />,
  XLSX: <GridOnIcon />,
  MD: <DescriptionIcon />,
};

const formatFileSize = (bytes?: number | null) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
};

const SectorCmsDocuments = () => {
  const { sector, loading: sectorLoading } = useSectorSite();
  const [documents, setDocuments] = useState<CmsDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');

  usePageTitle('مركز الوثائق');

  useEffect(() => {
    if (!sector) {
      setLoading(false);
      return;
    }
    getDocuments(sector.id)
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [sector]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    documents.forEach((doc) => {
      counts[doc.category] = (counts[doc.category] || 0) + 1;
    });
    return counts;
  }, [documents]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return documents.filter((doc) => {
      if (category !== 'ALL' && doc.category !== category) return false;
      if (!query) return true;
      return (
        doc.title.toLowerCase().includes(query) ||
        (doc.description || '').toLowerCase().includes(query) ||
        (doc.file_name || '').toLowerCase().includes(query)
      );
    });
  }, [documents, category, search]);

  const categoryOptions = [
    { value: 'ALL', label: 'الكل', count: documents.length },
    ...(['LAW', 'REGULATION', 'FORM', 'GUIDE', 'OTHER'] as const).map((key) => ({
      value: key,
      label: categoryLabels[key] || key,
      count: stats[key] || 0,
    })),
  ];

  if (sectorLoading) {
    return (
      <SectorPageShell>
        <Skeleton variant="rounded" height={160} />
        <Skeleton variant="rounded" height={100} sx={{ mt: 2 }} />
        <Skeleton variant="rounded" height={100} sx={{ mt: 2 }} />
      </SectorPageShell>
    );
  }

  if (!sector) {
    return (
      <SectorPageShell>
        <ErrorNotice title="قطاع غير متاح" />
      </SectorPageShell>
    );
  }

  return (
    <SectorPageShell>
      <SectorHomeLink />
      <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>مركز الوثائق</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {sector.name_ar} — القوانين واللوائح والبروتوكولات والنماذج الرسمية القابلة للتحميل.
      </Typography>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems="center"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <ToggleButtonGroup
          value={category}
          exclusive
          onChange={(_, value) => value && setCategory(value)}
          size="small"
          aria-label="تصفية حسب فئة الوثيقة"
        >
          {categoryOptions.map((option) => (
            <ToggleButton key={option.value} value={option.value} sx={{ fontWeight: 700 }}>
              {option.label}
              <Typography variant="caption" sx={{ mr: 0.5, opacity: 0.7 }}>
                ({option.count})
              </Typography>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن وثيقة بالعنوان أو الوصف..."
          size="small"
          sx={{ minWidth: { xs: '100%', sm: 320 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      {loading ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={90} />
          <Skeleton variant="rounded" height={90} />
          <Skeleton variant="rounded" height={90} />
        </Stack>
      ) : filtered.length === 0 ? (
        <Card sx={{ border: '1px solid', borderColor: 'divider', p: 4, textAlign: 'center' }}>
          <FolderOpenIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>لا توجد وثائق مطابقة</Typography>
          <Typography variant="body2" color="text.secondary">
            جرّب تغيير الفئة أو كلمة البحث.
          </Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
          {filtered.map((document) => {
            const fileType = document.file_type || document.file.split('.').pop()?.toUpperCase() || 'FILE';
            const fileIcon = fileTypeIcons[fileType] || <InsertDriveFileIcon />;
            return (
              <Card
                key={document.id}
                sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={2}
                  >
                    <Box
                      sx={{
                        width: 54,
                        height: 54,
                        borderRadius: 2.5,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        color: '#fff',
                        background: categoryColors[document.category] || '#0e8a72',
                      }}
                    >
                      {fileIcon}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                        <Chip
                          label={categoryLabels[document.category] || document.category}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip
                          label={fileType}
                          size="small"
                          color="default"
                          sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700 }}
                        />
                        {document.file_size != null && (
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(document.file_size)}
                          </Typography>
                        )}
                      </Stack>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {document.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {document.description || 'وثيقة رسمية صادرة عن القطاع.'}
                      </Typography>
                      {document.file_name && (
                        <Typography variant="caption" color="text.disabled" dir="ltr" sx={{ display: 'block', mt: 0.5 }}>
                          {document.file_name}
                        </Typography>
                      )}
                    </Box>
                    <Button
                      variant="contained"
                      size="medium"
                      startIcon={<DownloadIcon />}
                      href={document.file}
                      target="_blank"
                      rel="noreferrer"
                      sx={{ flexShrink: 0 }}
                    >
                      تحميل
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </SectorPageShell>
  );
};

export default SectorCmsDocuments;
