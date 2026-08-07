(function() {
  'use strict';

  var STORAGE_KEY = 'yubeiLanguageV1';
  var currentLanguage = 'en';
  var textState = new WeakMap();
  var attributeState = new WeakMap();

  var translations = {
    ar: {
      'About': 'من نحن', 'Products': 'المنتجات', 'Services': 'الخدمات', 'Certificates': 'الشهادات', 'Activity': 'الأنشطة', 'Contact': 'اتصل بنا',
      'Request Quote': 'اطلب عرض سعر', 'Quote': 'عرض سعر', '← Back to Home': 'العودة للرئيسية →', 'View Collection': 'عرض المجموعة',
      'Certified Quality Supplier': 'مورّد جودة معتمد', 'Professional Kidswear Manufacturer in China': 'مصنّع محترف لملابس الأطفال في الصين',
      "Yubei Apparel is a children's clothing manufacturer and exporter based in Zhili, Huzhou, China, offering wholesale kidswear, OEM, ODM, custom design, and private-label production for global buyers.": 'يوبي للملابس مصنّع ومصدّر لملابس الأطفال في تشيلي، هوتشو، الصين، ونوفر البيع بالجملة وخدمات OEM وODM والتصميم المخصص والعلامات التجارية الخاصة للمشترين حول العالم.',
      'Years Experience': 'سنوات الخبرة', 'Styles': 'موديلات', 'Countries': 'دول التصدير', 'Repeat Buyers': 'عملاء متكررون',
      'New Arrivals': 'وصل حديثاً', 'Latest Collection Highlights': 'أبرز الموديلات الجديدة', 'Global Reach': 'انتشار عالمي', 'Serving Clients Worldwide': 'نخدم العملاء حول العالم',
      'Our products are exported to numerous countries and regions, with a strong footprint across these key markets — built on trust, consistent quality, and reliable service.': 'نصدّر منتجاتنا إلى العديد من الدول والمناطق، وقد بنينا حضوراً قوياً في الأسواق الرئيسية بفضل الثقة والجودة المستقرة والخدمة الموثوقة.',
      'Our Core Advantages': 'مميزاتنا الأساسية', 'Common Buyer Questions': 'أسئلة المشترين الشائعة', 'Everything you need to know before placing your first order.': 'كل ما تحتاج إلى معرفته قبل تقديم طلبك الأول.',
      'What is the minimum order quantity (MOQ)?': 'ما الحد الأدنى لكمية الطلب؟', 'How long is the production lead time?': 'كم تستغرق مدة الإنتاج؟',
      'Can I request a sample before placing a bulk order?': 'هل يمكنني طلب عينة قبل الطلب بالجملة؟', 'What payment methods do you accept?': 'ما طرق الدفع المقبولة؟',
      'How does shipping work?': 'كيف يتم الشحن؟', 'Can I visit your factory?': 'هل يمكنني زيارة المصنع؟', 'Can you make custom designs with our own logo?': 'هل يمكنكم تنفيذ تصاميم مخصصة بشعارنا؟',
      'Still have questions?': 'هل لديك أسئلة أخرى؟', 'Our team replies within 24 hours. Reach out via WhatsApp for the fastest response.': 'يرد فريقنا خلال 24 ساعة. تواصل عبر واتساب للحصول على أسرع رد.', 'Ask on WhatsApp →': 'اسأل عبر واتساب ←',
      'About Us': 'من نحن', 'One-Stop Service for Global Clients': 'خدمة متكاملة للعملاء حول العالم',
      "We specialize in providing a one-stop service for global clients, including OEM, ODM, custom design, sample processing, and bulk wholesale. Our commitment is to deliver high-quality, comfortable, and fashionable children's clothing to customers worldwide.": 'نتخصص في تقديم خدمة متكاملة تشمل OEM وODM والتصميم المخصص وتنفيذ العينات والبيع بالجملة، ونلتزم بتوفير ملابس أطفال عالية الجودة ومريحة وعصرية للعملاء حول العالم.',
      'Our Mission': 'رسالتنا', 'Our Vision': 'رؤيتنا', 'A Look Inside Yubei': 'جولة داخل يوبي', 'Showroom': 'صالة العرض', 'Factory': 'المصنع', 'Founder & Vision': 'المؤسس والرؤية', 'Founder Speech': 'كلمة المؤسس',
      'Fashionable & Comfortable Overalls Sets': 'أطقم أطفال عصرية ومريحة',
      'Our main product line features high-quality overalls sets for children — designed for comfort, durability, and style. More seasonal collections coming soon.': 'يشمل خط منتجاتنا الرئيسي أطقم أطفال عالية الجودة تجمع بين الراحة والمتانة والأناقة، مع المزيد من المجموعات الموسمية قريباً.',
      'Search by model number': 'البحث برقم الموديل', 'Summer': 'صيفي', 'Autumn': 'خريفي', 'Winter': 'شتوي', 'Mix Items': 'تشكيلة متنوعة',
      'Size': 'المقاس', 'Weight': 'الوزن', 'Season': 'الموسم', 'Tap to zoom': 'اضغط للتكبير', '+ Add to Inquiry': '+ أضف إلى الاستفسار', '✓ Added to Inquiry': '✓ تمت الإضافة',
      'Product Detail': 'تفاصيل المنتج', 'Ask About This Style on WhatsApp': 'استفسر عن هذا الموديل عبر واتساب', 'Request a Sample': 'اطلب عينة', 'No image uploaded yet': 'لا توجد صورة حالياً',
      'Our Services': 'خدماتنا', 'Flexible Cooperation Models': 'خيارات تعاون مرنة', 'From Inquiry to Delivery': 'من الاستفسار إلى التسليم',
      'Simple, transparent, and fast. Here\'s how we work with buyers around the world.': 'خطوات بسيطة وشفافة وسريعة للتعاون مع المشترين حول العالم.',
      '1. Inquiry': '1. الاستفسار', '2. Quotation': '2. عرض السعر', '3. Sample & Confirm': '3. العينة والتأكيد', '4. Production': '4. الإنتاج', '5. Delivery': '5. التسليم',
      'Send us your design, quantity, and requirements via WhatsApp or email': 'أرسل التصميم والكمية والمتطلبات عبر واتساب أو البريد الإلكتروني',
      'We reply with pricing, lead time, and available fabric options within 24hrs': 'نرد خلال 24 ساعة بالسعر ومدة الإنتاج وخيارات الأقمشة المتاحة',
      'We produce a sample for your approval before starting bulk production': 'ننتج عينة لاعتمادها قبل بدء الإنتاج بالجملة',
      'Bulk manufacturing begins with strict quality inspection at every stage': 'يبدأ الإنتاج بالجملة مع فحص جودة صارم في كل مرحلة',
      'Your order ships worldwide by sea or air — we handle all export documentation': 'نشحن طلبك عالمياً بحراً أو جواً ونتولى جميع مستندات التصدير',
      'Choose Your Plan': 'اختر خطتك', 'Pricing & Lead Time': 'السعر ومدة الإنتاج', 'Choose your lead time and get the best price for your budget. Lower price for longer schedules': 'اختر مدة الإنتاج المناسبة لميزانيتك؛ المدة الأطول تمنح سعراً أفضل.',
      'Ready Stock Orders:': 'طلبات المخزون الجاهز:', 'Custom Orders:': 'الطلبات المخصصة:', 'Immediate delivery': 'تسليم فوري', 'no minimum quantity': 'دون حد أدنى للكمية',
      'Why Buyers Choose Yubei': 'لماذا يختار المشترون يوبي', 'Quality & Compliance You Can Trust': 'جودة وامتثال يمكنك الوثوق بهما',
      'Now That You\'ve Seen Our Credentials': 'بعد أن اطلعت على مؤهلاتنا', 'Let\'s talk business. Our team is ready to answer your questions, send samples, and give you the best price for your order.': 'لنبدأ التعاون. فريقنا جاهز للإجابة عن أسئلتك وإرسال العينات وتقديم أفضل سعر لطلبك.',
      'Request a Quote →': 'اطلب عرض سعر ←', '💬 WhatsApp Us': '💬 تواصل عبر واتساب',
      'Tell Us What You Need': 'أخبرنا بما تحتاج', 'Fill in your requirements below and our team will reply with pricing and lead time.': 'املأ متطلباتك أدناه وسيرد فريقنا بالسعر ومدة الإنتاج.',
      'Name *': 'الاسم *', 'Company': 'الشركة', 'Email *': 'البريد الإلكتروني *', 'Phone / WhatsApp': 'الهاتف / واتساب', 'Product Interest': 'المنتج المطلوب', 'Quantity Needed': 'الكمية المطلوبة', 'Additional Requirements': 'متطلبات إضافية', 'Submit Request': 'إرسال الطلب',
      'Our Activity': 'أنشطتنا', "Where We've Been & Who We've Met": 'معارضنا ولقاءاتنا', 'We actively participate in international trade exhibitions and welcome buyers from around the world to visit our showroom in Zhili, Huzhou.': 'نشارك بانتظام في المعارض التجارية الدولية ونرحب بالمشترين من جميع أنحاء العالم لزيارة صالة عرضنا في تشيلي، هوتشو.',
      "Huzhou Zhili Children's Clothing Exhibition": 'معرض هوتشو تشيلي لملابس الأطفال', "Zhili Children's Garments Global Selection Center · Huzhou, Zhejiang": 'مركز تشيلي العالمي لاختيار ملابس الأطفال · هوتشو، تشجيانغ',
      'Yubei Showroom': 'صالة عرض يوبي', 'International Welcome': 'ترحيب دولي', 'You Are Always Welcome to Visit Us!': 'نرحب بزيارتكم دائماً!',
      'Come see our showroom, browse the full collection, and meet our team in person. We are located in the heart of Zhili Town — the world\'s largest children\'s clothing hub.': 'تفضل بزيارة صالة العرض ومشاهدة المجموعة الكاملة ولقاء فريقنا. نحن في قلب بلدة تشيلي، أكبر مركز لصناعة ملابس الأطفال في العالم.',
      '💬 Contact to Arrange Visit': '💬 تواصل لترتيب الزيارة', 'View Contact Details': 'عرض بيانات الاتصال', 'Get In Touch': 'تواصل معنا', "We'd Love to Hear From You": 'يسعدنا التواصل معك',
      "Whether you're exploring a bulk order, custom design, or a new partnership, our team in Huzhou is ready to help. Reach out and we'll respond within 24 hours.": 'سواء كنت تبحث عن طلب بالجملة أو تصميم مخصص أو شراكة جديدة، فريقنا في هوتشو جاهز لمساعدتك وسنرد خلال 24 ساعة.',
      'Address': 'العنوان', 'Contact Person': 'جهة الاتصال', 'Director': 'المديرة', 'Business Hours': 'ساعات العمل', 'Email': 'البريد الإلكتروني', 'Email Us Now': 'راسلنا الآن',
      "Let's Build a Successful Partnership": 'لنبنِ شراكة ناجحة', 'Contact Us': 'اتصل بنا', 'Address:': 'العنوان:', 'Contact:': 'جهة الاتصال:', 'Director:': 'المديرة:', 'Phone:': 'الهاتف:', 'Email:': 'البريد الإلكتروني:',
      'Your Product Inquiry': 'استفسار المنتجات', 'Add up to 30 styles, quantities, and notes.': 'أضف حتى 30 موديلًا مع الكميات والملاحظات.',
      'Your name': 'اسمك', 'Country': 'الدولة', 'Required delivery date': 'تاريخ التسليم المطلوب', 'Destination port': 'ميناء الوصول', 'Target price': 'السعر المستهدف', 'Customization requirements': 'متطلبات التخصيص', 'Preferred contact method': 'طريقة التواصل المفضلة',
      'Apply one quantity to all selected styles': 'تطبيق كمية واحدة على جميع الموديلات', 'Apply to All': 'تطبيق على الكل', 'Quantity': 'الكمية', 'Notes': 'ملاحظات',
      'Copy Summary': 'نسخ الملخص', 'Copy Model No.': 'نسخ رقم الموديل', 'Copied!': 'تم النسخ!', 'Share Product': 'مشاركة المنتج', 'Link Copied!': 'تم نسخ الرابط!', 'Send on WhatsApp': 'إرسال عبر واتساب', 'Send by Email': 'إرسال بالبريد', 'Clear List': 'مسح القائمة', 'Inquiry List': 'قائمة الاستفسار',
      'WhatsApp': 'واتساب', 'WeChat': 'ويتشات', 'Ready to Order?': 'جاهز للطلب؟', 'Interested in our products?': 'مهتم بمنتجاتنا؟', 'Get a quote in 24 hours': 'احصل على عرض خلال 24 ساعة',
      'Your inquiry list is empty. Add styles from the Products page.': 'قائمة الاستفسار فارغة. أضف موديلات من صفحة المنتجات.',
      'Example: YB-WI-001': 'مثال: YB-WI-001', 'Name': 'الاسم', 'Company name': 'اسم الشركة', 'Country': 'الدولة',
      'Example: Port Klang': 'مثال: ميناء كلانغ', 'Example: 6.50 per piece': 'مثال: 6.50 للقطعة', 'Logo, label, colors, packaging': 'الشعار، الملصق، الألوان، التغليف',
      'Example: 300 pieces each': 'مثال: 300 قطعة لكل موديل', 'Pieces': 'عدد القطع', 'Color, label, or other request': 'اللون أو الملصق أو أي طلب آخر',
      'Add at least one style first.': 'أضف موديلًا واحدًا على الأقل أولاً.', 'Enter a valid quantity first.': 'أدخل كمية صحيحة أولاً.',
      'Inquiry summary copied.': 'تم نسخ ملخص الاستفسار.', 'Inquiry list cleared.': 'تم مسح قائمة الاستفسار.', 'Choose language': 'اختر اللغة',
      'Middle East': 'الشرق الأوسط', 'Southeast Asia': 'جنوب شرق آسيا', 'Central Asia': 'آسيا الوسطى', 'Africa': 'أفريقيا', 'Europe & America': 'أوروبا وأمريكا', 'Why Choose Us': 'لماذا تختارنا',
      'Superior Quality': 'جودة فائقة', 'We use premium fabrics and maintain strict quality control throughout the production process.': 'نستخدم أقمشة عالية الجودة ونطبق رقابة صارمة على الجودة طوال عملية الإنتاج.',
      'Rich Experience': 'خبرة واسعة', 'Years of experience exporting to diverse markets ensures we understand international standards and customer needs.': 'تضمن خبرتنا الطويلة في التصدير لأسواق متنوعة فهم المعايير الدولية واحتياجات العملاء.',
      'Fashionable Design': 'تصاميم عصرية', 'Our design team keeps up with global trends to create appealing and marketable products.': 'يتابع فريق التصميم الاتجاهات العالمية لإنتاج موديلات جذابة وقابلة للتسويق.',
      'Reliable Supply Chain': 'سلسلة توريد موثوقة', 'A mature and stable supply chain ensures on-time delivery and consistent quality.': 'تضمن سلسلة التوريد المستقرة التسليم في الموعد والجودة المتسقة.',
      'One-Stop Service': 'خدمة متكاملة', 'We handle everything from design concept to finished product delivery, ensuring a seamless experience.': 'نتولى كل شيء من فكرة التصميم إلى تسليم المنتج النهائي لضمان تجربة سلسة.',
      'Full-Season Collection': 'تشكيلة لجميع المواسم', "We offer a comprehensive range of children's clothing designed to suit diverse seasonal needs.": 'نقدم مجموعة شاملة من ملابس الأطفال لتلبية احتياجات المواسم المختلفة.',
      'Specialization in Sets': 'متخصصون في الأطقم', "Our expertise lies in high-quality children's clothing sets, a top-selling category in global markets.": 'نتخصص في أطقم الأطفال عالية الجودة، وهي من الفئات الأكثر مبيعاً عالمياً.',
      'Ready Stock & Delivery': 'مخزون جاهز وتسليم سريع', 'We maintain substantial ready stock to enable quick response to urgent orders and fast delivery.': 'نوفر مخزوناً جاهزاً لتلبية الطلبات العاجلة وتسريع التسليم.',
      'Yes! We encourage buyers to request a sample before committing to a bulk order. This allows you to check the fabric quality, sizing, stitching, and design before production begins. Contact us via WhatsApp or email to arrange your sample.': 'نعم، نشجع المشترين على طلب عينة قبل الالتزام بطلب بالجملة للتحقق من جودة القماش والمقاسات والخياطة والتصميم. تواصل معنا عبر واتساب أو البريد لترتيب العينة.',
      'We accept the following payment methods:': 'نقبل طرق الدفع التالية:', 'Bank Transfer (T/T)': 'تحويل بنكي (T/T)', 'international wire transfer': 'تحويل مصرفي دولي', 'WeChat Pay': 'WeChat Pay', 'for buyers with WeChat': 'للمشترين الذين يستخدمون ويتشات', 'Alipay': 'Alipay', 'fast and secure online payment': 'دفع إلكتروني سريع وآمن',
      'Please contact us to confirm payment details before transferring.': 'يرجى التواصل معنا لتأكيد بيانات الدفع قبل التحويل.', 'Contact us for a shipping quote to your country.': 'تواصل معنا للحصول على عرض شحن إلى بلدك.',
      'Original Equipment Manufacturer': 'تصنيع حسب تصميم العميل (OEM)', 'We can produce your designs and brand them with your label.': 'يمكننا إنتاج تصاميمك ووضع علامتك التجارية عليها.',
      'Original Design Manufacturer': 'تصميم وتصنيع المنتجات (ODM)', 'Our design team creates unique products based on your specifications and market needs.': 'يطور فريقنا تصاميم فريدة وفق مواصفاتك واحتياجات السوق.',
      'Customization': 'التخصيص', 'We offer customization in fabric, color, size, and printing/logo.': 'نوفر تخصيص القماش واللون والمقاس والطباعة أو الشعار.',
      'Wholesale': 'البيع بالجملة', 'We welcome bulk wholesale orders with competitive pricing to suit your business.': 'نرحب بطلبات الجملة ونقدم أسعاراً تنافسية تناسب أعمالك.',
      'Business License': 'الرخصة التجارية', 'Trademark Registration': 'تسجيل العلامة التجارية', 'Chamber of Commerce Member': 'عضوية غرفة التجارة', 'Quality Supplier Award': 'جائزة المورّد المتميز',
      'Certifications': 'الشهادات', 'Our Strengths': 'نقاط قوتنا', 'Strict Quality Control': 'رقابة صارمة على الجودة', 'Fast Turnaround': 'سرعة في التنفيذ', 'Flexible Pricing': 'أسعار مرنة', 'Countries Export Compliant': 'متوافق مع متطلبات التصدير لعدة دول',
      'Request a Quote': 'اطلب عرض سعر', 'Chat with us 👋': 'تواصل معنا 👋', 'Usually replies within minutes': 'نرد عادة خلال دقائق', 'buyers viewing today': 'مشترون يتصفحون اليوم', 'Open inquiry list': 'فتح قائمة الاستفسار', 'Back to top': 'العودة إلى الأعلى',
      'Choose language': 'اختر اللغة', 'FAQ': 'الأسئلة الشائعة', 'Behind The Brand': 'خلف العلامة التجارية',
      'Collection': 'المجموعة', 'Winter Collection': 'مجموعة الشتاء', 'Summer Collection': 'مجموعة الصيف', 'Autumn Collection': 'مجموعة الخريف', 'Mix Items Collection': 'مجموعة متنوعة',
      'Model No:': 'رقم الموديل:', 'Size:': 'المقاس:', 'Weight:': 'الوزن:', 'Season:': 'الموسم:',
      'Replace': 'استبدال', 'Edit': 'تعديل', 'Drop photo': 'أضف صورة', 'Chat on WhatsApp': 'تواصل عبر واتساب',
      'Close inquiry list': 'إغلاق قائمة الاستفسار', 'Target price currency': 'عملة السعر المستهدف', 'Clear all selected styles?': 'هل تريد مسح جميع الموديلات المختارة؟', 'Could not copy automatically.': 'تعذر النسخ تلقائياً.',
      'Dear Valued Customers and Partners, it is my pleasure to welcome you to Yubei and share the passion and vision behind our brand.': 'عملاءنا وشركاءنا الأعزاء، يسعدني أن أرحب بكم في يوبي وأن أشارككم الشغف والرؤية اللذين تقوم عليهما علامتنا التجارية.',
      'Yubei was created with a simple belief: every child deserves clothing that is comfortable, stylish, and made with care.': 'تأسست يوبي انطلاقاً من إيمان بسيط: كل طفل يستحق ملابس مريحة وأنيقة ومصنوعة بعناية.',
      "We believe children's clothing is not only about appearance, but also about comfort, confidence, and the beautiful memories created during childhood. Every design we create reflects our commitment to quality, creativity, and attention to detail.": 'نؤمن بأن ملابس الأطفال لا تتعلق بالمظهر فقط، بل بالراحة والثقة والذكريات الجميلة التي تتكوّن في الطفولة. ويعكس كل تصميم نقدمه التزامنا بالجودة والإبداع والاهتمام بالتفاصيل.',
      "At Yubei, we continuously develop fashionable and practical children's wear while building trusted and lasting relationships with customers and partners around the world.": 'في يوبي نطوّر باستمرار ملابس أطفال عصرية وعملية، ونبني علاقات موثوقة وطويلة الأمد مع العملاء والشركاء حول العالم.',
      'Thank you for your trust and support. Together, we hope to bring more happiness, confidence, and beautiful memories to children everywhere.': 'شكراً لثقتكم ودعمكم. ونتطلع معاً إلى منح الأطفال في كل مكان مزيداً من السعادة والثقة والذكريات الجميلة.',
      "Founder of Yubei Children's Clothes": 'مؤسس يوبي لملابس الأطفال',
      "To create high-quality children's clothing that combines comfort, creativity, and style, while bringing confidence and happiness to children and peace of mind to parents.": 'إنتاج ملابس أطفال عالية الجودة تجمع بين الراحة والإبداع والأناقة، وتمنح الأطفال الثقة والسعادة والوالدين راحة البال.',
      "To become a trusted global children's fashion brand, recognized for quality, innovation, and meaningful partnerships with families and businesses worldwide.": 'أن نصبح علامة عالمية موثوقة في أزياء الأطفال، معروفة بالجودة والابتكار والشراكات القيّمة مع العائلات والشركات حول العالم.',
      'For': 'بالنسبة إلى', '. For': '. أما بالنسبة إلى', 'custom orders': 'الطلبات المخصصة', '(your own design or label), the minimum is': '(بتصميمك أو علامتك الخاصة)، الحد الأدنى هو', '300 pieces per model': '300 قطعة لكل موديل',
      'ready stock': 'المخزون الجاهز', 'orders, there is': 'فالطلبات متاحة', '— you can order as little or as much as you need at great prices.': '— ويمكنك طلب الكمية التي تحتاجها بأسعار ممتازة.',
      '14 days': '14 يوماً', '20 days': '20 يوماً', '30 days': '30 يوماً', '60 days': '60 يوماً', 'Highest price': 'السعر الأعلى', 'Lower price': 'سعر أقل', 'Better price': 'سعر أفضل', 'Lowest price': 'أقل سعر',
      '— Express production ·': '— إنتاج سريع ·', '— Standard production ·': '— إنتاج قياسي ·', '— Relaxed schedule ·': '— جدول زمني مرن ·', '— Best value ·': '— أفضل قيمة ·', 'Best price available': 'أفضل سعر متاح',
      'Yes! We encourage buyers to request a sample before committing to a bulk order. This allows you to check the fabric quality, sizing, stitching, and design before production begins. Contact us via WhatsApp or email to arrange your sample.': 'نعم! نشجع المشترين على طلب عينة قبل تأكيد طلب الجملة، لتتمكن من فحص جودة القماش والمقاسات والخياطة والتصميم قبل بدء الإنتاج. تواصل معنا عبر واتساب أو البريد الإلكتروني لترتيب العينة.',
      'We accept the following payment methods:': 'نقبل طرق الدفع التالية:', 'Bank Transfer (T/T)': 'التحويل البنكي (T/T)', '— international wire transfer': '— تحويل بنكي دولي', 'WeChat Pay': 'الدفع عبر WeChat', '— for buyers with WeChat': '— للمشترين الذين يستخدمون WeChat', 'Alipay': 'Alipay', '— fast and secure online payment': '— دفع إلكتروني سريع وآمن', 'Please contact us to confirm payment details before transferring.': 'يرجى التواصل معنا لتأكيد بيانات الدفع قبل التحويل.',
      'We ship worldwide by': 'نشحن إلى جميع أنحاء العالم عبر', 'sea freight or air': 'الشحن البحري أو الجوي', 'depending on your needs and budget. We are flexible:': 'وفقاً لاحتياجاتك وميزانيتك، ونوفر خيارات مرنة:', 'We can arrange shipping': 'يمكننا ترتيب الشحن', 'for you — we handle everything from our factory to your door': 'لك — ونتولى كل شيء من مصنعنا حتى بابك', 'You can arrange your own shipping': 'يمكنك ترتيب الشحن بنفسك', "— if you have a preferred forwarder or courier, just let us know and we'll coordinate with them": '— إذا كان لديك وكيل شحن أو شركة توصيل مفضلة فأخبرنا وسننسق معهم', 'Contact us for a shipping quote to your country.': 'تواصل معنا للحصول على عرض شحن إلى بلدك.',
      'Absolutely — you are': 'بالتأكيد —', 'very welcome to visit us anytime!': 'نرحب بزيارتك في أي وقت!', "🎉 Our factory is located at the North Gate, 1st Floor, Building B1, No. 9 Zhanwang Road, Zhili Town, Huzhou, Zhejiang, China — in the heart of the world's largest children's clothing manufacturing hub. Contact Director Diana (孙海真) via WhatsApp to arrange your visit.": '🎉 يقع مصنعنا عند البوابة الشمالية، الطابق الأول، المبنى B1، رقم 9 طريق تشانوانغ، بلدة تشيلي، هوتشو، تشجيانغ، الصين — في قلب أكبر مركز لصناعة ملابس الأطفال في العالم. تواصل مع المديرة ديانا (孙海真) عبر واتساب لترتيب زيارتك.',
      'Yes! We specialize in OEM and ODM production. Our expert technical team can produce': 'نعم! نتخصص في إنتاج OEM وODM، ويستطيع فريقنا الفني الخبير تنفيذ', 'any design': 'أي تصميم', '— custom fabric, color, print, size, and your own brand label. Simply send us your design or concept and we will handle the rest. Minimum 300 pieces per model for custom orders.': '— مع تخصيص القماش واللون والطباعة والمقاس وعلامتك التجارية. أرسل لنا تصميمك أو فكرتك وسنتولى الباقي. الحد الأدنى للطلبات المخصصة هو 300 قطعة لكل موديل.',
      'Custom': 'مخصص', 'Bulk': 'جملة', 'How It Works': 'آلية العمل',
      'The longer your lead time, the better the price. Or buy from our ready stock for immediate delivery at great prices.': 'كلما كانت مدة الإنتاج أطول حصلت على سعر أفضل، أو يمكنك الشراء من مخزوننا الجاهز للتسليم الفوري بأسعار ممتازة.',
      'Order Type': 'نوع الطلب', 'Min. Order (MOQ)': 'الحد الأدنى للطلب', 'Lead Time': 'مدة الإنتاج', 'Price Level': 'مستوى السعر',
      '⚡ Express Custom': '⚡ طلب مخصص سريع', 'Rush production': 'إنتاج عاجل', 'Custom — 20 Days': 'طلب مخصص — 20 يوماً', 'Standard production': 'إنتاج قياسي', 'Custom — 30 Days': 'طلب مخصص — 30 يوماً', 'Relaxed schedule': 'جدول زمني مرن', 'Custom — 60 Days': 'طلب مخصص — 60 يوماً', 'Best value custom': 'أفضل قيمة للطلب المخصص',
      '300 pcs / model': '300 قطعة / موديل', '~14 days': 'نحو 14 يوماً', '~20 days': 'نحو 20 يوماً', '~30 days': 'نحو 30 يوماً', '~60 days': 'نحو 60 يوماً', '★★★★★ Highest': '★★★★★ الأعلى', '★★★★☆ Lower': '★★★★☆ أقل', '★★★☆☆ Better': '★★★☆☆ أفضل', '★★☆☆☆ Lowest': '★★☆☆☆ الأدنى',
      '🏪 Ready Stock': '🏪 مخزون جاهز', 'Buy from existing inventory': 'شراء من المخزون المتوفر', 'Flexible quantity': 'كمية مرنة', 'Immediate': 'فوري', '🏷️ Best Price': '🏷️ أفضل سعر',
      '* Custom orders: MOQ 300 pieces per model · Any design possible · Expert technical team on-site | 🏪 Stock orders:': '* الطلبات المخصصة: الحد الأدنى 300 قطعة لكل موديل · إمكانية تنفيذ أي تصميم · فريق فني خبير في الموقع | 🏪 طلبات المخزون:', 'flexible quantity accepted': 'نقبل كميات مرنة', '— no minimum required': '— دون حد أدنى',
      'Any Design Possible': 'إمكانية تنفيذ أي تصميم', 'Custom fabric, color, print, logo — our expert technical team can produce any design you need': 'قماش ولون وطباعة وشعار حسب الطلب — يستطيع فريقنا الفني تنفيذ أي تصميم تحتاجه', 'Custom orders ready in as little as 14 days. Stock orders ship immediately': 'الطلبات المخصصة جاهزة خلال 14 يوماً فقط، وطلبات المخزون تُشحن فوراً', 'Every piece inspected before shipment. Internationally certified. 98% repeat buyer rate': 'نفحص كل قطعة قبل الشحن. شهادات دولية ومعدل عودة المشترين 98٪', '30+ Countries Served': 'نخدم أكثر من 30 دولة', 'Experienced in international export — we handle shipping, customs, and all documentation': 'خبرة في التصدير الدولي — نتولى الشحن والجمارك وجميع المستندات', "Zhili — World's #1 Hub": 'تشيلي — المركز الأول عالمياً', "Based in Zhili Town, Huzhou — the world's largest children's clothing manufacturing center": 'مقرنا في بلدة تشيلي، هوتشو — أكبر مركز لصناعة ملابس الأطفال في العالم',
      'We hold internationally recognized certifications confirming our quality management, product safety, and export compliance standards.': 'نحمل شهادات معترفاً بها دولياً تؤكد معايير إدارة الجودة وسلامة المنتجات والامتثال لمتطلبات التصدير.', 'Years Licensed': 'سنوات الترخيص', 'Quality Checks Passed': 'عمليات فحص جودة ناجحة',
      'Officially registered enterprise, licensed for manufacturing and trade of apparel and related goods.': 'شركة مسجلة رسمياً ومرخصة لتصنيع وتجارة الملابس والمنتجات ذات الصلة.', 'Registered trademark certificate protecting our brand across clothing and apparel categories.': 'شهادة علامة تجارية مسجلة تحمي علامتنا ضمن فئات الملابس والأزياء.', "Recognized member of the Huzhou Zhili Children's Wear Chamber of Commerce, Overseas Trade Division.": 'عضو معترف به في قسم التجارة الخارجية بغرفة تجارة ملابس الأطفال في هوتشو تشيلي.', 'Presented for consistent product quality and reliability by bestsuppliers.com.': 'ممنوحة تقديراً لثبات جودة المنتجات والموثوقية من bestsuppliers.com.',
      "Our branded showroom at the Zhili exhibition center — featuring our full collection of children's clothing across all seasons.": 'صالة عرض يوبي في مركز تشيلي للمعارض، وتضم مجموعتنا الكاملة من ملابس الأطفال لجميع المواسم.', 'Our showroom proudly displays Arabic signage — welcoming buyers from the Middle East and ensuring they feel at home during their visit.': 'تعرض صالة يوبي لافتات باللغة العربية ترحيباً بالمشترين من الشرق الأوسط وليشعروا بالراحة خلال زيارتهم.', 'View full International Welcome photo': 'عرض صورة الترحيب الدولي بالحجم الكامل',
      'North Gate, 1st Floor, Building B1, No. 9 Zhanwang Road, Zhili Town, Huzhou, Zhejiang, China': 'البوابة الشمالية، الطابق الأول، المبنى B1، رقم 9 طريق تشانوانغ، بلدة تشيلي، هوتشو، تشجيانغ، الصين', 'North Gate, 1st Floor, Building B1, No. 9 Zhanwang Road, Zhili Town, Huzhou, Zhejiang': 'البوابة الشمالية، الطابق الأول، المبنى B1، رقم 9 طريق تشانوانغ، بلدة تشيلي، هوتشو، تشجيانغ', '孙海真 (Diana)': '孙海真 (ديانا)',
      'Mon – Sat · 9:00am – 6:00pm CST': 'الاثنين – السبت · 9:00 صباحاً – 6:00 مساءً بتوقيت الصين', 'GMT+8 · China Standard Time': 'غرينتش +8 · توقيت الصين القياسي', 'Zhili · Huzhou · Zhejiang': 'تشيلي · هوتشو · تشجيانغ', "Home to the world's largest children's clothing manufacturing hub — where 10 years of craftsmanship meets global fashion": 'موطن أكبر مركز لصناعة ملابس الأطفال في العالم — حيث تلتقي خبرة 10 سنوات مع الموضة العالمية', '🇨🇳 Made in China': '🇨🇳 صُنع في الصين', '✈️ Worldwide Shipping': '✈️ شحن إلى جميع أنحاء العالم', '⭐ Certified Exporter': '⭐ مصدّر معتمد',
      'e.g. Summer overalls set': 'مثال: طقم صيفي للأطفال', 'e.g. 500 pcs': 'مثال: 500 قطعة', '© 2026 Huzhou Zhili Yubei Clothing Co., Ltd. — All rights reserved.': '© 2026 شركة هوتشو تشيلي يوبي للملابس المحدودة — جميع الحقوق محفوظة.',
      '📌 North Gate, 1st Floor, Building B1, No. 9 Zhanwang Road, Zhili Town, Huzhou, Zhejiang, China (湖州市织里镇展望路9号B1幢1楼北大门，语贝服饰)': '📌 البوابة الشمالية، الطابق الأول، المبنى B1، رقم 9 طريق تشانوانغ، بلدة تشيلي، هوتشو، تشجيانغ، الصين (湖州市织里镇展望路9号B1幢1楼北大门，语贝服饰)',
      'Yubei logo': 'شعار يوبي', "Yubei children's clothing company in Zhili, Huzhou, China": 'شركة يوبي لملابس الأطفال في تشيلي، هوتشو، الصين', "Yubei kidswear showroom in Zhili children's clothing center": 'صالة عرض يوبي لملابس الأطفال في مركز تشيلي', "Yubei children's clothing showroom in Zhili": 'صالة عرض يوبي لملابس الأطفال في تشيلي', 'Yubei kidswear showroom welcoming international buyers': 'صالة عرض يوبي ترحب بالمشترين الدوليين', 'Yubei Apparel location map': 'خريطة موقع يوبي للملابس', 'Taihu Lake Huzhou': 'بحيرة تايهو في هوتشو'
    }
  };

  var metadata = {
    en: {
      title: "China Kidswear Manufacturer | Yubei Children's Clothing",
      description: "Yubei Apparel is a children's clothing manufacturer and exporter in Zhili, Huzhou, China, offering wholesale kidswear, OEM, ODM and private-label production."
    },
    ar: {
      title: 'مصنّع ملابس أطفال في الصين | يوبي للملابس',
      description: 'يوبي مصنّع ومصدّر لملابس الأطفال في تشيلي، الصين، ونوفر البيع بالجملة وخدمات OEM وODM والعلامات التجارية الخاصة.'
    }
  };

  function dictionary() { return translations[currentLanguage] || {}; }
  function translateValue(value, language) {
    if (!value || language === 'en') return value;
    var table = translations[language] || {};
    if (table[value]) return table[value];
    var match = value.match(/^Model No:\s*(.+)$/);
    if (match) return 'رقم الموديل: ' + match[1];
    match = value.match(/^(\d+) selected styles? · ([\d,]+) total pieces(?: · ([\d,]+) average per style)?$/);
    if (match) {
      if (match[1] === '1') return 'موديل واحد مختار · ' + match[2] + ' قطعة إجمالاً' + (match[3] ? ' · متوسط ' + match[3] + ' لكل موديل' : '');
      return match[1] + ' موديلات مختارة · ' + match[2] + ' قطعة إجمالاً' + (match[3] ? ' · متوسط ' + match[3] + ' لكل موديل' : '');
    }
    match = value.match(/^(\d+) matching styles?$/);
    if (match) return match[1] + ' موديلات مطابقة';
    match = value.match(/^Remove\s+(.+)$/);
    if (match) return 'إزالة ' + match[1];
    match = value.match(/^Applied\s+([\d,]+)\s+pieces to all\s+(\d+)\s+selected styles\.$/);
    if (match) return 'تم تطبيق ' + match[1] + ' قطعة على جميع الموديلات المختارة وعددها ' + match[2] + '.';
    match = value.match(/^Your inquiry list can contain up to\s+(\d+)\s+styles\.$/);
    if (match) return 'يمكن أن تحتوي قائمة الاستفسار على ' + match[1] + ' موديلًا كحد أقصى.';
    match = value.match(/^(.+) children's clothing by Yubei Apparel$/);
    if (match) return 'ملابس أطفال من يوبي — ' + match[1];
    match = value.match(/^View full (.+) photo$/);
    if (match) return 'عرض صورة ' + translateValue(match[1], language) + ' بالحجم الكامل';
    match = value.match(/^(.+) certificate for Yubei Apparel$/);
    if (match) return 'شهادة ' + translateValue(match[1], language) + ' ليوبي للملابس';
    match = value.match(/^Drop (.+) photo$/);
    if (match) return 'أضف صورة ' + translateValue(match[1], language);
    if (/^\* Custom orders: MOQ 300 pieces per model/.test(value)) return '* الطلبات المخصصة: الحد الأدنى 300 قطعة لكل موديل · إمكانية تنفيذ أي تصميم · فريق فني خبير في الموقع | 🏪 طلبات المخزون:';
    if (value.indexOf('On the Shores of Taihu Lake') !== -1) return 'على ضفاف بحيرة تايهو';
    var phraseMap = {
      'Express production': 'إنتاج سريع',
      'Standard production': 'إنتاج قياسي',
      'Relaxed schedule': 'جدول زمني مرن',
      'Best value': 'أفضل قيمة',
      'Best price available': 'أفضل سعر متاح'
    };
    var replaced = value;
    Object.keys(phraseMap).forEach(function(phrase) { replaced = replaced.split(phrase).join(phraseMap[phrase]); });
    if (replaced !== value) return replaced;
    return value;
  }

  var whatsappMessages = {
    'Hi, I have a question about your products.': 'مرحباً، لدي سؤال عن منتجاتكم.',
    "Hi, I've seen your certifications and I'm interested in placing an order.": 'مرحباً، اطلعت على شهاداتكم وأنا مهتم بتقديم طلب.',
    "Hi, I'd like to visit your showroom.": 'مرحباً، أود زيارة صالة العرض لديكم.',
    "Hi, I'm interested in your children's clothing products.": 'مرحباً، أنا مهتم بمنتجات ملابس الأطفال لديكم.'
  };

  function translateWhatsAppHref(href, language) {
    if (!href || language !== 'ar' || href.indexOf('wa.me/8618367259637?text=') === -1) return href;
    var marker = '?text=';
    var index = href.indexOf(marker);
    if (index === -1) return href;
    var message;
    try { message = decodeURIComponent(href.slice(index + marker.length)); } catch (e) { return href; }
    return whatsappMessages[message] ? href.slice(0, index + marker.length) + encodeURIComponent(whatsappMessages[message]) : href;
  }

  function shouldSkip(node) {
    var parent = node.parentElement;
    return !parent || parent.closest('script, style, noscript, [data-i18n-skip]') || /^(INPUT|TEXTAREA)$/.test(parent.tagName);
  }

  function translateTextNode(node) {
    if (shouldSkip(node)) return;
    var current = node.nodeValue;
    var trimmed = current.trim();
    if (!trimmed) return;
    var state = textState.get(node);
    if (!state || (current !== state.rendered && current !== state.original)) state = { original: current, rendered: current };
    var originalTrimmed = state.original.trim();
    var translated = translateValue(originalTrimmed, currentLanguage);
    var leading = state.original.match(/^\s*/)[0];
    var trailing = state.original.match(/\s*$/)[0];
    var next = leading + translated + trailing;
    state.rendered = next;
    textState.set(node, state);
    if (current !== next) node.nodeValue = next;
  }

  function translateAttributes(element) {
    if (!(element instanceof Element) || element.closest('[data-i18n-skip]')) return;
    var attrs = ['placeholder', 'aria-label', 'title'];
    var state = attributeState.get(element) || {};
    attrs.forEach(function(name) {
      if (!element.hasAttribute(name)) return;
      var current = element.getAttribute(name);
      var saved = state[name];
      if (!saved || (current !== saved.rendered && current !== saved.original)) saved = { original: current, rendered: current };
      var translated = translateValue(saved.original, currentLanguage);
      saved.rendered = translated;
      state[name] = saved;
      if (current !== translated) element.setAttribute(name, translated);
    });
    if (element.hasAttribute('href')) {
      var currentHref = element.getAttribute('href');
      var hrefState = state.href;
      if (!hrefState || (currentHref !== hrefState.rendered && currentHref !== hrefState.original)) hrefState = { original: currentHref, rendered: currentHref };
      var nextHref = translateWhatsAppHref(hrefState.original, currentLanguage);
      hrefState.rendered = nextHref;
      state.href = hrefState;
      if (currentHref !== nextHref) element.setAttribute('href', nextHref);
    }
    attributeState.set(element, state);
  }

  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) { translateTextNode(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root);
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
      else translateAttributes(node);
    }
  }

  function updateMetadata() {
    var data = metadata[currentLanguage] || metadata.en;
    document.title = data.title;
    var description = document.querySelector('meta[name="description"]');
    if (description) description.content = data.description;
    document.querySelectorAll('meta[property="og:title"], meta[name="twitter:title"]').forEach(function(el) { el.content = data.title; });
    document.querySelectorAll('meta[property="og:description"], meta[name="twitter:description"]').forEach(function(el) { el.content = data.description; });
  }

  function updateLanguageSpecificElements(language, root) {
    var scope = root && root.querySelectorAll ? root : document;
    var selector = scope.querySelector && scope.querySelector('#languageSwitcher');
    if (!selector && root && root.id === 'languageSwitcher') selector = root;
    if (selector) {
      selector.value = language;
      selector.setAttribute('aria-label', language === 'ar' ? 'اختر اللغة' : 'Choose language');
    }
    var map = scope.querySelector && scope.querySelector('#locationMap');
    if (!map && root && root.id === 'locationMap') map = root;
    if (map) {
      var originalMapSrc = map.dataset.i18nOriginalSrc || map.getAttribute('src');
      map.dataset.i18nOriginalSrc = originalMapSrc;
      map.setAttribute('src', language === 'ar' ? originalMapSrc + (originalMapSrc.indexOf('?') === -1 ? '?' : '&') + 'hl=ar' : originalMapSrc);
    }
  }

  function setLanguage(language) {
    if (!['en', 'ar'].includes(language)) language = 'en';
    currentLanguage = language;
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    try { localStorage.setItem(STORAGE_KEY, language); } catch (e) {}
    var selector = document.getElementById('languageSwitcher');
    if (selector) {
      if (selector.value !== language) selector.value = language;
      selector.setAttribute('aria-label', language === 'ar' ? 'اختر اللغة' : 'Choose language');
    }
    updateMetadata();
    translateTree(document.body);
    updateLanguageSpecificElements(language, document);
    document.dispatchEvent(new CustomEvent('yubei:languagechange', { detail: { language: language } }));
  }

  window.YubeiI18n = {
    getLanguage: function() { return currentLanguage; },
    setLanguage: setLanguage,
    translate: function(value) { return translateValue(value, currentLanguage); }
  };

  function initialize() {
    var saved = 'en';
    try { saved = localStorage.getItem(STORAGE_KEY) || 'en'; } catch (e) {}
    document.addEventListener('change', function(e) {
      if (e.target && e.target.id === 'languageSwitcher') setLanguage(e.target.value);
    });
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'characterData') translateTextNode(mutation.target);
        mutation.addedNodes.forEach(function(node) {
          translateTree(node);
          if (node.nodeType === Node.ELEMENT_NODE) {
            var selector = node.id === 'languageSwitcher' ? node : node.querySelector && node.querySelector('#languageSwitcher');
            if (selector) {
              selector.value = currentLanguage;
              selector.setAttribute('aria-label', currentLanguage === 'ar' ? 'اختر اللغة' : 'Choose language');
            }
            updateLanguageSpecificElements(currentLanguage, node);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    setLanguage(saved);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
