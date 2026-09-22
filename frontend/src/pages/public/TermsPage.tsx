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
  { title: 'بيعة الخدمة', body: 'تقدم المنصة خدمات الحجر الصحي والتسجيل المسبق والتحقق من الشهادات بناءً على اللوائح الصحية الدولية (IHR) والتشريعات الوطنية السودانية.' },
  { title: 'استخدام المنصة', body: 'الاستفادة من خدمات المنصة مسألة طوعية للجهات العامة؛ ويترتب على المستخدم الالتزام ببيانات صحيحة وكاملة عند التسجيل، وتُشكل أي بيانات مغلوطة مسؤولية مُدخلها.' },
  { title: 'المسؤوليات', body: 'تبذل المنصة جهداً معقولاً لتوافر الخدمة ودقة المعلومات، دون ضمان عدم انقطاعها؛ ولا تعتبر المنصة مسؤولة عن نتائج الدخول أو القرارات المتخذة بناءً على بيانات غير دقيقة أُدخلت من المستخدم.' },
  { title: 'الإجراءات واللوائح', body: 'تخضع الخدمات لإجراءات ولوائح العمل المنظمة في المنافذ الصحية، وقد تُحدَّث هذه الشروط من وقت لآخر مع إشعار على المنصة.' },
  { title: 'القانون الساري', body: 'يُحكم هذه الشروط والأحكام وفق قوانين جمهورية السودان، وأي نزاع يُعرض على القضاء المختص.' },
];

const TermsPage = () => {
  usePageTitle('الشروط والأحكام');
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCms, setHasCms] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCmsPage('terms')
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
        title="الشروط والأحكام"
        subtitle="الشروط المنظمة لاستخدام خدمات منصة الحجر الصحي القومي"
        eyebrow="شروط الاستخدام"
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

export default TermsPage;