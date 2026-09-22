import type { ReactNode } from 'react';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import BugReportIcon from '@mui/icons-material/BugReport';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import BiotechIcon from '@mui/icons-material/Biotech';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import ContactSupportOutlinedIcon from '@mui/icons-material/ContactSupportOutlined';
import { PageHeader } from '../../components/common';

export type VectorServiceVariant = 'info' | 'guidelines' | 'alerts' | 'general';

interface ContentRow {
  icon: ReactNode;
  title: string;
  body: string;
  points?: string[];
  tone?: 'default' | 'alert';
}

interface PageContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  intro: string;
  sections: ContentRow[];
  footer?: string;
}

const CONTENT: Record<VectorServiceVariant, PageContent> = {
  info: {
    eyebrow: 'خدمة مكافحة النواقل',
    title: 'معلومات مكافحة النواقل',
    subtitle:
      'خطة الترصد والحد من أخطار النواقل المنقولة للأمراض في منافذ الدخول السودانية، وإجراءات المكافحة المتكاملة التي تطبقها فرق الصحة العامة.',
    intro:
      'تشمل مقاربة المكافحة المتكاملة للنواقل (IVM) الترصد البيئي، والحد من مواقع التكاثر، والمكافحة الكيميائية الموجهة، والتثقيف الصحي، بما يضمن تقليل أخطار انتقال الأمراض الوافدة عبر المنافذ.',
    sections: [
      {
        icon: <BugReportIcon color="primary" />,
        title: 'نواقل الأمراض الرئيسية',
        body: 'تراقب الإدارة الحشرات والقوارض الناقلة للأمراض في المدارات ومنافذ الدخول، وتشمل:',
        points: [
          'البعوض الناقل لحمى الضنك والملاريا والحمى الصفراء وحمى الوادي المتصدع وحمى غرب النيل.',
          'الذباب (الذبابة الرملية والذبابة المنزلية) المرتبطة بنقل الأمراض الجلدية والمعوية.',
          'القراد والبعوض النقل للحمى النزفية (حمى القرم-الكونغو وحمى الضنك النزفية).',
          'القوارض الناقلة للطاعون والحمى المالطية داخل الحجرات والمخازن.',
        ],
      },
      {
        icon: <BiotechIcon color="primary" />,
        title: 'أهداف الترصد',
        body: 'يعمل فريق مكافحة النواقل على رصد المؤشرات التالية ضمن خطة الوطن للاستجابة للأوبئة:',
        points: [
          'قياس كثافة النواقل البالغة ومؤشرات مواقع التكاثر بشكل دوري.',
          'التحقق المختبرية للعينات الحشرية المشتبه بها وتحديد جنسها ونوعها.',
          'تقييم مقاومة النواقل للمبيدات المستخدمة في المنطقة.',
          'إخطار الجهات الصحية بالحالات المشتبهة فور اكتشافها.',
        ],
      },
      {
        icon: <HealthAndSafetyIcon color="primary" />,
        title: 'المكافحة الوقائية',
        body: 'تتبنى الإدارة الحزمة الوقائية التالية في كافة السفارات والمحطات:',
        points: [
          'التصريف والاستبدال الدوري لأوعية تجميع المياه الراكدة.',
          'الاستخدام المنظم للشبكات الحشرية والأبواب والفتحات المانعة لدخول النواقل.',
          'نشر اللوحات التوعوية للمسافرين والطاقم حول التفاف الوقاية الفردية.',
          'التنسيق مع إدارات الملوحة والوعي البيئي لتحسين ظروف الصرف الصحي.',
        ],
      },
    ],
    footer:
      'للإبلاغ عن حالة اشتباه لدغية أو ملاحظة تكاثر مفرط للنواقل في المرفق، يرجى التواصل مع إدارة الصحة البيئية أو عبر بوابة البلاغات.',
  },

  guidelines: {
    eyebrow: 'دليل إرشادات العمل الميداني',
    title: 'إرشادات مكافحة النواقل الفنية',
    subtitle:
      'الضوابط والإجراءات المعتمدة للفرق العاملة في الترصد والمكافحة، بما يشمل السلامة المهنية والاستخدام الرشيد للمبيدات وتوثيق الأنشطة.',
    intro:
      'يطبق هذا الدليل على كافة المنشآت والأراضي المحاذية للمنافذ، وينظم العمل الميداني وفق الإجراءات التشغيلية القياسية المعتمدة لضمان الفعالية والسلامة.',
    sections: [
      {
        icon: <ShieldOutlinedIcon color="primary" />,
        title: 'السلامة المهنية',
        body: 'الحد الأدنى الواجب توفره قبل بدء أي عمل ميداني:',
        points: [
          'إلزامية ارتداء معدات الوقاية الشخصية (نظارات، قفازات، أحذية مغلقة، أقنعة التنفس عند الرش).',
          'التدريب المسبق على استخدام المبيدات ومعدات الرش والمرور الآمن بالمناطق الحساسة.',
          'تقديم وقاية طبية مسبقة (اللقاحات الوقائية المتاحة) للفرق العاملة في المناطق الموبوءة.',
          'إيقاف العمل فوراً عند حدوث أي أعراض صحية غير متوقعة للعامل وإبلاغ المشرف.',
        ],
      },
      {
        icon: <WaterDropIcon color="primary" />,
        title: 'الحد من مواقع التكاثر',
        body: 'الإجراءات الميدانية الاعتيادية للحد من تجمعات المياه الراكدة:',
        points: [
          'رصد جميع الحاويات والبراميل والإطارات المخزنة وقنوات الصرف داخل المدارات.',
          'التخلص بانتظام من المياه الراكدة أو معالجتها بمبيدات اليرقات (Larvicides).',
          'الإصلاح الفوري لأي تسريب في شبكات المياه والري يخلق تجمعات مستديمة.',
          'توثيق كل عملية رش بالتاريخ والموقع والكمية في السجلات المعتمدة.',
        ],
      },
      {
        icon: <VaccinesIcon color="primary" />,
        title: 'المكافحة الكيميائية',
        body: 'استخدام المبيدات وفق الضوابط التالية دون استثناء:',
        points: [
          'الالتزام بالمبيدات والتراكيز المسجلة وطنياً والمعتمدة منظمة الصحة العالمية للاستخدام العمومي.',
          'تدوير مجموعات المبيدات (فوسفات عضوية/بيريترويدات) كيذاً لتقليل احتمال تطور مقاومة.',
          'إجراء الرش الفوضي الخارجي في المناطق الخارجية فقط وبعيداً عن ساحات الطعام.',
          'تسجيل معلومات المبيد (الدفعة، تاريخ الصلاحية، المصرح، الكمية) في دفتر الجرعات المتوافرة.',
        ],
      },
      {
        icon: <AssessmentOutlinedIcon color="primary" />,
        title: 'الرصد والتوثيق',
        body: 'توثيق جميع الأنشطة في النظام الوطني وفق البطاقة القياسية:',
        points: [
          'مؤشرات الترصد (كثافة النواقل، نسبة المنازل الموجبة، مؤشر الحاويات).',
          'سجل أنشطة المكافحة اليومية (فريق، منطقة، مبيد، مساحة، استهلاك).',
          'سجل نتائج المختبر للعينات الحشرية (نوع، تحديد، مقاومة).',
          'تقرير شهري موجز يُدرج ضمن تقارير الصحة البيئية للمنافذ.',
        ],
      },
    ],
    footer:
      'لأي استفسار فني حول تطبيق الإرشادات، يرجى التواصل مع الوحدة الإقليمية لمكافحة النواقل المختصة بمنطقتك.',
  },

  alerts: {
    eyebrow: 'الإنذار المبكر',
    title: 'تنبيهات النواقل الفعالة',
    subtitle:
      'التنبيهات الحالية والموسمية حول نشاط النواقل في منافذ الدخول والمناطق المتاخمة لها، وترشد فرق الصحة لوضع خطة الاستجابة الملائمة.',
    intro:
      'صُممت هذه التنبيهات بالتكامل مع نظام الترصد الوبائي الوطني وبيانات المنظمة العالمية، وتعكس تقييم وتيرة الأنشطة الفصلية.',
    sections: [
      {
        icon: <WarningAmberIcon color="error" />,
        title: 'تنبيه أول: موسم الأمطار وارتفاع مؤشر اليرقات',
        body: 'بدءاً من يوليو وحتى أكتوبر، ترتفع كثافة بعوض الأيدس الناقل لحمى الضنك بعد هطول الأمطار الغزيرة في الولايات الوسطى والشرقية.',
        points: [
          'تكثيف الترصد الأسبوعي داخل 500 متر المحيطة بالمنافذ في هذه الفترة.',
          'مراجعة مواقع التكاثر الداخلية (أشجار البامبو، حاويات الماء، وحدات الرش).',
          'تفعيل الإبلاغ الفوري لأي تجمع من الحالات الحموية المشتبهة بالضنك.',
        ],
        tone: 'alert',
      },
      {
        icon: <ReportProblemIcon color="error" />,
        title: 'تنبيه ثانٍ: تدابير رفع تجمعات بعوض الكيولكس والأنوفيليس',
        body: 'رصدت الوحدات الميدانية في الأسابيع الأخيرة زيادة طفيفة في مؤشر الحاويات في محيط المحطات البرية الغربية.',
        points: [
          'التأكيد على إغلاق آبار الصرف والتطبيق الحتمي للرش الضبابي المسائي.',
          'مراجعة شحنات القوارض المحتملة في مخازن الحبوب القريبة.',
          'التنسيق مع فرق المكافحة للولايات الأحمر ودارفور الكبري لوضع خطة رقابة مشتركة.',
        ],
        tone: 'alert',
      },
      {
        icon: <SchoolOutlinedIcon color="primary" />,
        title: 'التوجيهات الدائمة',
        body: 'إرشادات عامة تُفعَّل على مدار العام في جميع المواقع:',
        points: [
          'إبلاغ أي حالة حمى مجهولة السبب خلال 24 ساعة إلى فرقة الاستجابة للطوارئ الصحية.',
          'الالتزام بمؤشرات رد الفعل الشهري (تقرير الكثافة، نسبة المنازل الموجبة).',
          'الاحتفاظ بسجل المشغلات الحشرية لحالات الشد العصبي وعدم التحضر للوصول.',
          'متابعة لوائح الإشراف على النواقل الصادرة عن وزارة الصحة الاتحادية.',
        ],
      },
    ],
    footer:
      'تم إصدار هذه التنبيهات في إطار نظام الإنذار المبكر للترصد الوبائي — يُرجى الإبلاغ عن أي ملاحظات طارئة عبر بوابة الاتصال بالمنصة.',
  },

  general: {
    eyebrow: 'برنامج الترصد الوطني',
    title: 'معلومات عامة عن النظام',
    subtitle:
      'تعريف شامل بالنظام الوطني لمكافحة النواقل، وكيفية استخدامه من قبل الجهات والمسافرين، والخدمات والمواد المرجعية المتاحة.',
    intro:
      'النظام الوطني لمكافحة النواقل هو المظلة المؤسسية لبرامج الترصد والمكافحة والاستجابة؛ ويُدير من وزارة الصحة الاتحادية بالشراكة مع منظمة الصحة العالمية وشركاء التنمية.',
    sections: [
      {
        icon: <ContactSupportOutlinedIcon color="primary" />,
        title: 'من يخاطب النظام؟',
        body: 'يخدم النظام الفئات التالية:',
        points: [
          'فرق الترصد والمكافحة في الولايات والمنافذ (عمل ميداني وتوثيق).',
          'وحدات الرعاية الأولية والكادر الطبي للإحالات الناتجة عن عينات النواقل.',
          'إدارات الصحة البيئية والمتروبول لتبادل المؤشرات والنتائج.',
          'الجمهور العام والمسافرون للحصول على نصائح الوقاية والمعلومات الحالية.',
        ],
      },
      {
        icon: <InfoOutlinedIcon color="primary" />,
        title: 'ما الخدمات المتوفرة؟',
        body: 'من المفيد أن تعرف أن النظام يقدم:',
        points: [
          'بوابة للترصد اليومي ببيانات تنبيهية للمؤشرات الحشرية.',
          'أداة للإبلاغ السريع عن حالات اشتباه لدغية من الجمهور.',
          'أرشيف وطني للدراسات والتقييمات ومعدلات مقاومة المبيدات.',
          'منصات توعوية متعددة اللغات حول السلوكيات الوقائية.',
        ],
      },
      {
        icon: <ShieldOutlinedIcon color="primary" />,
        title: 'المسؤولية المشتركة',
        body: 'نجاح النظام يقوم على تكامل الأدوار:',
        points: [
          'الوزارة الاتحادية: السياسات، المعايير، وتوفير المرجعيات.',
          'الولايات: تنفيذ الأنشطة الميدانية وتقارير المؤشرات.',
          'شركاء التنمية: الدعم اللوجستي والدراسات العلمية.',
          'المواطن: الإبلاغ المبكر والمشاركة في النظافة والوقاية المنزلية.',
        ],
      },
    ],
    footer:
      'للمزيد من المعلومات حول خدمات الصحة البيئية أو للانضمام لبرامج التوعية، يرجى زيارة مكتب العلاقات العامة بالوزارة أو استخدام بوابة «تواصل معنا».',
  },
};

const SectionCard = ({ row, index }: { row: ContentRow; index: number }) => {
  const isAlert = row.tone === 'alert';
  return (
    <Card
      sx={{
        border: '1px solid',
        borderColor: isAlert ? 'error.light' : 'divider',
        height: '100%',
        transition: 'border-color .2s ease',
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: isAlert
                ? 'rgba(211,47,47,0.08)'
                : 'rgba(12,127,106,0.08)',
            }}
          >
            {row.icon}
          </Box>
          <Box>
            <Chip
              size="small"
              label={`المحور ${index + 1}`}
              variant="outlined"
              sx={{ mb: 0.25, height: 18, fontSize: 10 }}
            />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
              {row.title}
            </Typography>
          </Box>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: row.points ? 1 : 0, lineHeight: 1.75 }}>
          {row.body}
        </Typography>
        {row.points && (
          <List dense disablePadding>
            {row.points.map((point) => (
              <ListItem key={point} disableGutters sx={{ alignItems: 'flex-start' }}>
                <ListItemIcon sx={{ minWidth: 22, mt: 0.5 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: isAlert ? 'error.main' : 'primary.main',
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primaryTypographyProps={{ variant: 'body2', sx: { lineHeight: 1.7 } }}
                >
                  {point}
                </ListItemText>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

const VectorServicesPage = ({ variant }: { variant: VectorServiceVariant }) => {
  const content = CONTENT[variant];
  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <PageHeader eyebrow={content.eyebrow} title={content.title} subtitle={content.subtitle} />
      <Alert
        severity="info"
        sx={{ mb: 3.5, alignItems: 'center' }}
        icon={<BugReportIcon />}
      >
        {content.intro}
      </Alert>
      <Grid container spacing={3}>
        {content.sections.map((row, index) => (
          <Grid item xs={12} md={6} key={row.title}>
            <SectionCard row={row} index={index} />
          </Grid>
        ))}
      </Grid>
      {content.footer && (
        <>
          <Divider sx={{ my: 4 }} />
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="flex-start"
            sx={{ color: 'text.secondary' }}
          >
            <HealthAndSafetyIcon fontSize="small" sx={{ mt: 0.25 }} />
            <Typography variant="body2" sx={{ lineHeight: 1.8 }}>
              {content.footer}
            </Typography>
          </Stack>
        </>
      )}
    </Container>
  );
};

export default VectorServicesPage;