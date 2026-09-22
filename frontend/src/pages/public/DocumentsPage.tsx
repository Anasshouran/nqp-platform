import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DescriptionIcon from '@mui/icons-material/Description';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import GridOnIcon from '@mui/icons-material/GridOn';
import ArticleIcon from '@mui/icons-material/Article';
import { getDocuments } from '../../api/endpoints/public';
import type { CmsDocument } from '../../api/endpoints/public';
import { PageHeader, EmptyState, ListSkeleton, SectionTitle, ErrorState } from '../../components/common';
import { useApi } from '../../hooks/useApi';

const PAGE_SIZE = 8;

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

const categoryIcons: Record<string, React.ReactNode> = {
  LAW: <ArticleIcon />,
  REGULATION: <DescriptionIcon />,
  FORM: <InsertDriveFileIcon />,
  GUIDE: <FolderOpenIcon />,
  OTHER: <InsertDriveFileIcon />,
};

const fileTypeIcons: Record<string, React.ReactNode> = {
  PDF: <PictureAsPdfIcon />,
  DOC: <DescriptionIcon />,
  DOCX: <DescriptionIcon />,
  XLS: <GridOnIcon />,
  XLSX: <GridOnIcon />,
};

const formatFileSize = (bytes?: number | null) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
};

const DocumentsPage = () => {
  const { data, loading, error, retry } = useApi<CmsDocument[]>(getDocuments);
  const documents = useMemo(() => data ?? [], [data]);
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [category, search]);

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

  const shown = filtered.slice(0, visible);

  const categoryOptions = [
    { value: 'ALL', label: 'الكل', count: documents.length },
    ...(['LAW', 'REGULATION', 'FORM', 'GUIDE', 'OTHER'] as const).map((key) => ({
      value: key,
      label: categoryLabels[key] || key,
      count: stats[key] || 0,
    })),
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <PageHeader
        title="مركز الوثائق"
        subtitle="القوانين واللوائح والبروتوكولات والنماذج الرسمية القابلة للتحميل"
        eyebrow="مكتبة الوثائق"
      />

      {/* Library stats */}
      <Box sx={{ mb: 5 }}>
        <SectionTitle
          title="مكتبة الوثائق"
          subtitle="مرجع موحد للوثائق الرسمية الصادرة عن الإدارة الاتحادية للحجر الصحي"
          align="center"
        />
        <Grid container spacing={2}>
          {categoryOptions.filter((o) => o.value !== 'ALL').map((option) => (
            <Grid item xs={6} sm={4} md={2.4} key={option.value}>
              <Card
                className="fade-up"
                sx={{
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderTop: `4px solid ${categoryColors[option.value] || '#0e8a72'}`,
                  '&:hover': { boxShadow: 4, transform: 'translateY(-4px)' },
                }}
              >
                <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      mx: 'auto',
                      mb: 1,
                      borderRadius: 2.5,
                      display: 'grid',
                      placeItems: 'center',
                      color: categoryColors[option.value] || '#0e8a72',
                      bgcolor: `${categoryColors[option.value] || '#0e8a72'}1a`,
                    }}
                  >
                    {categoryIcons[option.value]}
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {option.count}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Filters */}
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

      {/* Documents list */}
      {loading ? (
        <ListSkeleton count={4} />
      ) : error ? (
        <ErrorState message="تعذّر تحميل الوثائق" onRetry={retry} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpenIcon />}
          title="لا توجد وثائق مطابقة"
          description="جرّب تغيير الفئة أو كلمة البحث."
        />
      ) : (
        <Stack spacing={2}>
          {shown.map((document) => {
            const fileType = document.file_type || document.file.split('.').pop()?.toUpperCase() || 'FILE';
            const fileIcon = fileTypeIcons[fileType] || <InsertDriveFileIcon />;
            return (
              <Card
                key={document.id}
                className="fade-up doc-card"
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                  transition: 'box-shadow 300ms ease, transform 300ms ease',
                  '&:hover': { boxShadow: 4, transform: 'translateY(-3px)' },
                }}
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
                        {document.description || 'وثيقة رسمية صادرة عن الإدارة الاتحادية للحجر الصحي.'}
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

      {!loading && !error && visible < filtered.length && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="outlined"
            color="primary"
            size="large"
            endIcon={<KeyboardArrowDownIcon />}
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            sx={{ px: 4 }}
          >
            عرض المزيد من الوثائق
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            تم عرض {visible} من {filtered.length} وثيقة
          </Typography>
        </Box>
      )}

      <Divider sx={{ my: 4 }} />
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
        لم تجد ما تبحث عنه؟ يمكنك التواصل معنا عبر صفحة <b>اتصل بنا</b> لطلب وثيقة رسمية محددة.
      </Typography>
    </Container>
  );
};

export default DocumentsPage;