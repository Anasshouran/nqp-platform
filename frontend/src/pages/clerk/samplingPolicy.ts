export type SamplingPolicyProduct = {
  quantity: string;
  product_name: string;
  package_size: string;
  risk_group: string;
  sampling_rate: string;
  sampling_conditions: string;
};

export const SAMPLING_POLICY_TITLE = 'كميات العينات المطلوبة للتحليل مع تصنيف المخاطر';
export const SAMPLING_POLICY_NOTE = 'بالنسبة للتحاليل الكيميائية 500 جرام كافية، ما عدا الأفلاتوكسين 1500 جرام.';

export const SAMPLING_POLICY_PRODUCTS: SamplingPolicyProduct[] = [
  { quantity: '6', product_name: 'الحليب الخام', package_size: '120-1000 ml', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'الحليب المبستر', package_size: '120-1000 ml', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'الحليب المجفف', package_size: 'جوال', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'في حالات: تكرار الورود مع نتائج سابقة غير مطابقة، مؤشر فساد، أول مرة، ظروف تخزين سيئة، انقضاء شهادة صحية، إعادة تصدير، اشتباه غش' },
  { quantity: '5', product_name: 'الحليب المجفف', package_size: '2.5 kg', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس الشروط أعلاه' },
  { quantity: '6', product_name: 'الحليب المجفف', package_size: '200-400 gm', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس الشروط أعلاه' },
  { quantity: '6', product_name: 'الحليب والحليب المركز المعامل بالحرارة الفائقة', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'قشدة مبسترة', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'الحليب والحليب المركز المضاف إليه نكهة ومعامل بالحرارة الفائقة', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'الحليب المكثف و المكثف المُحلي والحليب المكرمل', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'قشدة مبسترة بالنكهة', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'قشدة مخفوقة', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'قشدة متخمرة', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'منتجات الحليب المتخمر (الزبادي واللبنة)', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'منتجات الحليب المتخمر (الزبادي واللبنة) بالنكهة', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'مسحوق خليط الآيس كريم', package_size: 'جوال', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'مسحوق خليط الآيس كريم', package_size: 'عبوات صغيره', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'الآيس كريم (مثلوجات لبنية ومائية)', package_size: 'عبوات كبيره', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'الآيس كريم (مثلوجات لبنية ومائية)', package_size: 'عبوات صغيره', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'الأجبان الطرية', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'الأجبان الصلبة وشبه الصلبة (الجبن السوداني الأبيض والجبن المضفر والجبن الرومي)', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'الأجبان المدخنة', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'الاجبان المطبوخة (المصنعة)', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'كازينات', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'سمن من دهن الحليب', package_size: 'عبوات كبيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'سمن من دهن الحليب', package_size: 'عبوات صغيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'الزبـد', package_size: 'عبوات صغيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'الزبـد', package_size: 'كرتونه كبيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'الشرش المجفف', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'الحبوب (الذرة, الدخن, القمح, الشعير, الذرة الشامية, الأرز ...إلخ)', package_size: 'عبوات كبيره', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'فحص ظاهري أولاً، تحليل عند الشك، وتحليل مرتين سنوياً' },
  { quantity: '6', product_name: 'الحبوب (الذرة, الدخن, القمح, الشعير, الذرة الشامية, الأرز ...إلخ)', package_size: 'عبوات صغيره', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'نفس الشروط أعلاه' },
  { quantity: '5', product_name: 'دقيق الحبوب، الردة (النخالة) والمواد الناتجة الشبيه', package_size: 'عبوات كبيره', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'نفس الشروط أعلاه' },
  { quantity: '6', product_name: 'دقيق الحبوب، الردة (النخالة) والمواد الناتجة الشبيه', package_size: 'عبوات صغيره', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'نفس الشروط أعلاه' },
  { quantity: '5', product_name: 'دقيق فول الصويا أو مركزات الصويا او مستخلصات من فول الصويا', package_size: 'عبوات كبيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'دقيق فول الصويا أو مركزات الصويا او مستخلصات من فول الصويا', package_size: 'عبوات صغيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'النشا (كورن فلور, كاسترد, الخ....)', package_size: 'عبوات صغيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'النشا (كورن فلور, كاسترد, الخ....)', package_size: 'عبوات كبيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'الكيك، التورتات، الجاتوهات ومنتجات المخابز التي تؤكل مباشرة بدون تسخين', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'المخبوزات المجمدة غير المطهية مثل: البيتزا وفطائر اللحم والعجائن المجمدة المحشوة أو المغلفة', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'رقائق ومنتفخات الأرز والذرة الشامية والبطاطس', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'شرائح المعجنات الطازجة', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'المعكرونة والشعيريـة والسكسكانية (جميع الأنواع الجافة)', package_size: 'عبوات كبيره', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'فحص ظاهري أولاً، تحليل عند الشك، وتحليل مرتين سنوياً' },
  { quantity: '6', product_name: 'المعكرونة والشعيريـة والسكسكانية (جميع الأنواع الجافة)', package_size: 'عبوات صغيره', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'نفس الشروط أعلاه' },
  { quantity: '6', product_name: 'وجبة الإفطار (الكورنفليكس و الرقاق ... وما شابه ذلك)', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'الخبـز', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'خبز محلي أو بالبيض أو بالحليب', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'البسكويت العادي، المحشو و المغطي بطبقة', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'البسكويت الجاف (العادي، المحشو و المغطي بطبقة)', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'منتجات مجففة سريعة الذوبان (فورية) (لا تحتاج تسخين قبل الأكل)', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'وجبات الاطفال المكونة من الحبوب', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'المنتجات المجففة التي تتطلب تسخين', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'وجبات الاطفال الجاهزة في شكل بودرة والمضاف اليها بكتريا حامض اللاكتيك', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'وجبـات الأطفـال السائلة المعقمة', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'معلبات الأطفال المعالجة حراريا', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'الذبيح المبرد (أنصاف أو أرباع الذبيح الطازج بعظم أو بدون عظم)', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'الأحشاء المبردة والمجمدة', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'لحم مجمد، بدون عظم (فخذه)', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'اللحم المفروم المجمد', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'اللحم المفروم المبرد', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'اللحوم ومستخلصاتها المجففة', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'منتجات البروتين المشتقة من اللحوم مثل مركز مرق لحوم البقر', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'اللحوم المعاملة بالتمليح والتجفيف كاملة أو قطع أو أى شكل شرائح مثل (بسطرمة ...)', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'أنواع السجق الطازج', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'منتجات اللحوم الطازجة المجمدة مثل (البيرقر، الكفتة الكبة... الخ)', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'اللحوم ومنتجات اللحوم المطبوخة (الجاهزة للأكل)', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'منتجات اللحوم المصنعة المطبوخة سواء كانت مدخنة أو غير مدخنة مثل: الفرانكفورتر، المورتديلا, البولوقنا، لانشون ...إلخ', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'الشوربات الجاهزة التى تحتوي علي لحوم وخضروات ومكونات أخرى', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'الخضروات الطازجة (تستهلك طازجة)', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'الخضروات المجمدة او المبردة (تستهلك طازجة)', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'الخضر الطازجة أو المجمدة المعدة للطبخ', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'الخضر المجمدة بعد السلق الخفيف (بطاطس شرائح ومكعبات إلخ)', package_size: '', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'الخضراوات المجففة', package_size: '', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'الفاكهة الطازجة أو المجمدة', package_size: '', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'الفاكهة الجاهزة للاستهلاك', package_size: '', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'الفاكهة والخضروات المجففة التي تستخدم كمواد أولية في التصنيع', package_size: 'عبوات صغيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'الفاكهة والخضروات المجففة التي تستخدم كمواد أولية في التصنيع', package_size: 'عبوات كبيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'الفاكهه و الخضروات المحفوظه في الخل أو الزيت أو المحلول الملحي', package_size: 'عبوات صغيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'الفاكهه و الخضروات المحفوظه في الخل أو الزيت أو المحلول الملحي', package_size: 'عبوات كبيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'الفاكهة والخضروات المعلبة ذات الاس الهيدروجيني 4.6 فما دون (معجون الطماطم، كاتشب الخوخ)', package_size: 'عبوات صغيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'الفاكهة والخضروات المعلبة ذات الاس الهيدروجيني 4.6 فما دون (معجون الطماطم، كاتشب الخوخ)', package_size: 'عبوات كبيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'الدواجن الطازجة والمبردة أو المجمدة', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'الدواجن المطهية , المجمدة (الجاهزة للأكل أو بعد التسخين مثل برغر الدجاج وفطائر الدجاج)', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'الدجاج المطهي المغطي بطبقة من البقسماط', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'الدواجن المملحة والمطهية و/أو المدخنة، مثل منتجات الدواجن في صورة مارتديلا، فرانكفورتر، بسطرمة الديك الرومى أو صدر الديك الرومى المدخن... الخ)', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'منتجات الدواجن المجففة (مكعبات المرق وغيرها)', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'بيض سائل مبرد أو مجمد (كامل ، بياض أو مح)', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'البيض المبستر (سائل أو مجمد أو مجفف)', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'منتجات البيض المعدة لأغراض خاصة (رضع، كبار السن، أغذية النقاهة، الحساسية)', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'الأسماك الطازجة أو المجمدة ومنتجاتها (بلوكات, ومسحوق, ومفروم أو شرائح الخ...)', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'الأسماك المطهوة مسبقا ومغطاة بطبقة من الخبز الجاف المجروش (بقسماط)', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'القشريات المطهية المجمدة', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'لحوم السرطانات المطهية المبردة والمجمدة', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'الرخويات الطازجة والمجمدة', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '5', product_name: 'فسيخ (السمك المملح المخمر, كامل, بودرة, مفرومة, عجينه. ملوحة (تركين)', package_size: 'كل الاحجام', risk_group: 'الأولى', sampling_rate: '100%', sampling_conditions: 'تسحب عينة من كل الرسائل الواردة' },
  { quantity: '6', product_name: 'ماء الشرب', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'الماء المعالج الداخل لشبكة التوزيع', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'الماء المعالج داخل شبكة التوزيع', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'المياه المعبأة في قناني', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'الثلج المعد للاستهلاك', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'السكر', package_size: 'كل الاحجام', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'فحص ظاهري أولاً، تحليل عند الشك، وتحليل مرتين سنوياً' },
  { quantity: '6', product_name: 'السكر', package_size: 'كل الاحجام', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'نفس الشروط أعلاه' },
  { quantity: '5', product_name: 'عسل النحل', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'الشاي والأعشاب التي تغلي وتشرب كالشاي', package_size: 'عبوات كبيره', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'فحص ظاهري أولاً، تحليل عند الشك، وتحليل مرتين سنوياً' },
  { quantity: '6', product_name: 'الشاي والأعشاب التي تغلي وتشرب كالشاي', package_size: 'عبوات صغيره', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'نفس الشروط أعلاه' },
  { quantity: '6', product_name: 'حبوب البن الخام', package_size: 'عبوات صغيره', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'نفس الشروط أعلاه' },
  { quantity: '5', product_name: 'حبوب البن الخام', package_size: 'عبوات كبيره', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'نفس الشروط أعلاه' },
  { quantity: '5', product_name: 'البن المحمص او المطحون أو الأنواع سريعة الذوبان', package_size: 'عبوات كبيره', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'نفس الشروط أعلاه' },
  { quantity: '6', product_name: 'البن المحمص او المطحون أو الأنواع سريعة الذوبان', package_size: 'عبوات صغيره', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'نفس الشروط أعلاه' },
  { quantity: '5', product_name: 'خميرة الخبز الفورية (الجافة والمضغوطة)', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'علك المضغ', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'الشوكولاته بأنواعها، سادة أو محلاة بالحليب أو أحد مكوناته أو بالمكسرات محشوة أو مغلفة', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'الحلوي الجافة مثل الكرامل والمنتجات الشبيهة بها', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'بودرة الكاكاو', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'جوز الهند المجفف (مبشور)', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'المكسرات (فول سوداني, الخ....)', package_size: 'عبوات صغيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'المكسرات (فول سوداني, الخ....)', package_size: 'عبوات كبيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'المولاس بانواعه - الدبس/ كتل السكر البنية وعسل سكر القصب', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'الهلام (الجلي)', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'الجلاتين (حيواني)', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'إنزيمات مجففة (حيوانية, نباتية أو ميكروبية عن طريق التخمر)', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'الطحينة والدكوة', package_size: 'عبوات كبيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'الطحينة والدكوة', package_size: 'عبوات صغيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'المارجرين (السمن النباتي)', package_size: 'عبوات كبيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'المارجرين (السمن النباتي)', package_size: 'عبوات صغيره', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'العصائر الطبيعية والصناعية', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'المشروبات الغازية (غير الكحولية)', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'المربات', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'الصمغ العربي', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'المايونيز وصلصات البيض الأخرى والمستردة', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'مسحوق الكركدي الرزازي', package_size: 'كل الاحجام', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'فحص ظاهري أولاً، تحليل عند الشك، وتحليل مرتين سنوياً' },
  { quantity: '6', product_name: 'الكركدي الزهرة والمسحوق', package_size: 'كل الاحجام', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'نفس الشروط أعلاه' },
  { quantity: '6', product_name: 'الطحنية', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '6', product_name: 'التوابل', package_size: 'كل الاحجام', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'فحص ظاهري أولاً، تحليل عند الشك، وتحليل مرتين سنوياً' },
  { quantity: '6', product_name: 'الكاتشب والمستردة', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '5', product_name: 'زبدة الكاكاو', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '1 kg', product_name: 'الملح', package_size: 'عبوات كبيرة', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'فحص ظاهري أولاً، تحليل عند الشك، وتحليل مرتين سنوياً' },
  { quantity: '2', product_name: 'الملح', package_size: 'عبوات صغيرة', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'نفس الشروط أعلاه' },
  { quantity: '1 kg', product_name: 'العدس', package_size: 'عبوات كبيرة', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'نفس الشروط أعلاه' },
  { quantity: '1', product_name: 'العدس', package_size: 'عبوات صغيرة', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'نفس الشروط أعلاه' },
  { quantity: '1 kg', product_name: 'الكركدى', package_size: 'عبوات كبيرة', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'نفس الشروط أعلاه' },
  { quantity: '1', product_name: 'الكركدى', package_size: 'عبوات صغيرة', risk_group: 'الثالثة', sampling_rate: '25%', sampling_conditions: 'نفس الشروط أعلاه' },
  { quantity: '1.5 kg', product_name: 'الصمغ العربى', package_size: '', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '1', product_name: 'الباكنج بودر', package_size: 'عبوات كبيرة', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '3', product_name: 'الباكنج بودر', package_size: 'عبوات صغيرة', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '3', product_name: 'الفانيليا', package_size: 'عبوات صغيرة', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '2', product_name: 'الخل والمخللات', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
  { quantity: '1', product_name: 'مدخلات الانتاج (حمض الستريك - صوديوم بيروفوسفيت - صوديوم كربونيت ومثبتات القوام)', package_size: 'كل الاحجام', risk_group: 'الثانية', sampling_rate: '75%', sampling_conditions: 'نفس شروط المجموعة الثانية' },
];

const normalize = (s: string) => (s || '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/ـ/g, '')
  .toLowerCase();

type SizeBucket = 'large' | 'small' | 'any' | null;

const itemSizeBucket = (packageType: string): SizeBucket => {
  const v = normalize(packageType);
  if (!v) return null;
  if (/(جوال|برمي|كرتون|صندوق|كبيره|كبيرة)/.test(v)) return 'large';
  if (/(عبوه|عبوة|طرد|صغيره|صغيرة)/.test(v)) return 'small';
  if (/(كل الاحجام|كل الاحجام)/.test(v)) return 'any';
  return null;
};

const policySizeBucket = (packageSize: string): SizeBucket => {
  if (!packageSize || !packageSize.trim()) return null;
  if (/(كل الاحجام|كل الاحجام)/.test(normalize(packageSize))) return 'any';
  if (/(كبيره|كبيرة|جوال|برمي|كرتون|صندوق|كرتونه)/.test(normalize(packageSize))) return 'large';
  if (/(صغيره|صغيرة|عبوه|عبوة|عبوات|طرد)/.test(normalize(packageSize))) return 'small';
  return null;
};

export type SamplingMatch = SamplingPolicyProduct & { matched_by_size?: boolean };

export function resolveSamplingPolicy(itemName: string, packageType: string): SamplingMatch | null {
  const n = normalize(itemName);
  if (!n) return null;
  const inputBucket = itemSizeBucket(packageType);

  let best: SamplingMatch | null = null;
  let bestScore = -1;

  for (const p of SAMPLING_POLICY_PRODUCTS) {
    const pn = normalize(p.product_name);
    let score = -1;
    if (pn === n) score = 100;
    else if (pn.includes(n)) score = 60;
    else if (n.includes(pn)) score = 40;
    else continue;

    const pb = policySizeBucket(p.package_size);
    if (inputBucket && pb) {
      if (inputBucket === pb) score += 20;
      else if (pb === 'any') score += 5;
    }
    if (score > bestScore) {
      best = { ...p, matched_by_size: Boolean(inputBucket) && (pb === inputBucket) };
      bestScore = score;
    }
  }
  return best;
}

export const riskGroupMeta = (group: string) => {
  if (group === 'الأولى') return { color: 'error' as const, label: 'مجموعة عالية الخطر' };
  if (group === 'الثانية') return { color: 'warning' as const, label: 'مجموعة متوسطة الخطر' };
  return { color: 'info' as const, label: 'مجموعة منخفضة الخطر' };
};