import { useEffect, useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { PageHeader } from '../../components/common';
import { getCmsPage } from '../../api/endpoints/public';

const FALLBACK = [
  { title: 'مقدمة', body: 'نلتزم في منصة الحجر الصحي القومي (عافيتنا) بحماية بياناتكم الشخصية واحترام خصوصيتكم عند استخدام خدمات المنصة الإلكترونية.' },
  { title: 'البيانات التي نجمعها', body: 'نقوم بجمع البيانات الضرورية لتقديم خدمات الحجر الصحي والتسجيل المسبق للمسافرين، بما يشمل بيانات الهوية والسفر والصحة، وفق الأسس القانونية المنظمة للعمل.' },
  { title: 'استخدام البيانات', body: 'تستخدم البيانات لأغراض الرصد الوبائي وإصدار الشهادات الصحية وخدمات التحقق، ولا تتم مشاركتها إلا مع الجهات المختصة وفق مقتضيات الصحة العامة واللوائح الصحية الدولية.' },
  { title: 'حفظ وأمن البيانات', body: 'نعتمد إجراءات فنية وتنظيمية لحماية البيانات من الوصول غير المصرح به أو الإفصاح أو التعديل، وتُحتفظ البيانات للمدة التي يتطلبها النظام القانوني.' },
  { title: 'حقوق المستخدم', body: 'يحق لك الاطلاع على بياناتك أو طلب تصحيحها أو طلب حذفها ضمن الحدود التي لا تتعارض مع الالتزامات القانونية للصحة العامة.' },
];

const PrivacyPage = () => {
  usePageTitle('سياسة الخصوصية');
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCms, setHasCms] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCmsPage('privacy')
      .then((response) => {
        if (!mounted) return;
        if (response.data.data.content) {
          setContent(response.data.data.content);
          setHasCms(true);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <PageHeader
        title="سياسة الخصوصية"
        subtitle="كيف نتعامل مع بياناتكم الصحية والشخصية في منصة الحجر الصحي القومي"
        eyebrow="خصوصية البيانات"
      />

      {loading ? (
        <Box sx={{ maxWidth: 760, mx: 'auto' }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={120} sx={{ mb: 2 }} />
          ))}
        </Box>
      ) : hasCms ? (
        <Box
          sx={{
            maxWidth: 760,
            mx: 'auto',
            '& p': { mb: 2, lineHeight: 1.9 },
            '& h2, & h3': { fontWeight: 700, mb: 1, mt: 3 },
          }}
          dangerouslySetInnerHTML={{ __html: content ?? '' }}
        />
      ) : (
        <Stack spacing={3} sx={{ maxWidth: 760, mx: 'auto' }}>
          {FALLBACK.map((section, index) => (
            <Box key={section.title}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'primary.lighter',
                    color: 'primary.main',
                    fontWeight: 800,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {section.title}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.9 }}>
                {section.body}
              </Typography>
              {index < FALLBACK.length - 1 && <Divider sx={{ mt: 3 }} />}
            </Box>
          ))}
        </Stack>
      )}
    </Container>
  );
};

export default PrivacyPage;