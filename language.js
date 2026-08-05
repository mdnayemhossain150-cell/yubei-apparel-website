(function() {
  'use strict';

  var STORAGE_KEY = 'yubeiLanguageV1';
  var currentLanguage = 'en';
  var textState = new WeakMap();
  var attributeState = new WeakMap();

  var translations = {
    zh: {
      'About': '关于我们', 'Products': '产品', 'Services': '服务', 'Certificates': '资质证书', 'Activity': '企业动态', 'Contact': '联系我们',
      'Request Quote': '获取报价', 'Quote': '报价', '← Back to Home': '← 返回首页', 'View Collection': '查看产品',
      'Certified Quality Supplier': '认证优质供应商', 'Professional Kidswear Manufacturer in China': '中国专业童装制造商',
      "Yubei Apparel is a children's clothing manufacturer and exporter based in Zhili, Huzhou, China, offering wholesale kidswear, OEM, ODM, custom design, and private-label production for global buyers.": '语贝服饰位于中国湖州织里，是一家专业童装制造商和出口商，为全球买家提供童装批发、OEM、ODM、定制设计及自有品牌生产服务。',
      'Years Experience': '行业经验', 'Styles': '款式', 'Countries': '出口国家', 'Repeat Buyers': '回购客户',
      'New Arrivals': '新品上市', 'Latest Collection Highlights': '最新系列精选', 'Global Reach': '全球市场',
      'Serving Clients Worldwide': '服务全球客户',
      'Our products are exported to numerous countries and regions, with a strong footprint across these key markets — built on trust, consistent quality, and reliable service.': '我们的产品出口到多个国家和地区，凭借诚信、稳定品质和可靠服务，在重点市场建立了长期合作。',
      'Our Core Advantages': '我们的核心优势', 'Common Buyer Questions': '买家常见问题',
      'Everything you need to know before placing your first order.': '首次下单前需要了解的重要信息。',
      'What is the minimum order quantity (MOQ)?': '最低起订量（MOQ）是多少？',
      'How long is the production lead time?': '生产周期需要多久？',
      'Can I request a sample before placing a bulk order?': '批量下单前可以申请样品吗？',
      'What payment methods do you accept?': '你们接受哪些付款方式？', 'How does shipping work?': '如何安排运输？',
      'Can I visit your factory?': '我可以参观你们的工厂吗？', 'Can you make custom designs with our own logo?': '可以生产带有我们自有标志的定制款吗？',
      'Still have questions?': '还有其他问题？', 'Our team replies within 24 hours. Reach out via WhatsApp for the fastest response.': '我们的团队将在24小时内回复。通过 WhatsApp 联系可获得最快响应。',
      'Ask on WhatsApp →': '通过 WhatsApp 咨询 →',
      'About Us': '关于我们', 'One-Stop Service for Global Clients': '为全球客户提供一站式服务',
      "We specialize in providing a one-stop service for global clients, including OEM, ODM, custom design, sample processing, and bulk wholesale. Our commitment is to deliver high-quality, comfortable, and fashionable children's clothing to customers worldwide.": '我们为全球客户提供一站式服务，包括 OEM、ODM、定制设计、来样加工和批量批发，致力于向世界各地客户提供优质、舒适、时尚的童装。',
      'Our Mission': '我们的使命', 'Our Vision': '我们的愿景', 'A Look Inside Yubei': '走进语贝',
      'Showroom': '展厅', 'Factory': '工厂', 'Founder & Vision': '创始人与愿景', 'Founder Speech': '创始人寄语',
      'Fashionable & Comfortable Overalls Sets': '时尚舒适的童装套装',
      'Our main product line features high-quality overalls sets for children — designed for comfort, durability, and style. More seasonal collections coming soon.': '我们的主打产品是高品质儿童套装，兼顾舒适、耐穿与时尚。更多四季新品将陆续推出。',
      'Search by model number': '按款号搜索', 'Summer': '夏季', 'Autumn': '秋季', 'Winter': '冬季', 'Mix Items': '混合款',
      'Size': '尺码', 'Weight': '重量', 'Season': '季节', 'Tap to zoom': '点击放大', '+ Add to Inquiry': '+ 加入询价', '✓ Added to Inquiry': '✓ 已加入询价',
      'Product Detail': '产品详情', 'Ask About This Style on WhatsApp': '通过 WhatsApp 咨询此款', 'Request a Sample': '申请样品', 'No image uploaded yet': '暂无产品图片',
      'Our Services': '我们的服务', 'Flexible Cooperation Models': '灵活的合作模式', 'From Inquiry to Delivery': '从询价到交付',
      'Simple, transparent, and fast. Here\'s how we work with buyers around the world.': '流程简单、透明、高效。以下是我们与全球买家的合作方式。',
      '1. Inquiry': '1. 提交询价', '2. Quotation': '2. 报价', '3. Sample & Confirm': '3. 样品确认', '4. Production': '4. 批量生产', '5. Delivery': '5. 发货',
      'Send us your design, quantity, and requirements via WhatsApp or email': '通过 WhatsApp 或邮件发送您的设计、数量和要求',
      'We reply with pricing, lead time, and available fabric options within 24hrs': '我们将在24小时内回复价格、交期和可选面料',
      'We produce a sample for your approval before starting bulk production': '批量生产前先制作样品供您确认',
      'Bulk manufacturing begins with strict quality inspection at every stage': '批量生产开始后，每个环节都进行严格质量检验',
      'Your order ships worldwide by sea or air — we handle all export documentation': '订单可通过海运或空运发往全球，我们负责全部出口文件',
      'Choose Your Plan': '选择您的生产方案', 'Pricing & Lead Time': '价格与交期',
      'Choose your lead time and get the best price for your budget. Lower price for longer schedules': '根据预算选择交期，交期越充裕，价格越优惠。',
      'Ready Stock Orders:': '现货订单：', 'Custom Orders:': '定制订单：', 'Immediate delivery': '立即发货', 'no minimum quantity': '不限最低数量',
      'Why Buyers Choose Yubei': '买家选择语贝的理由', 'Quality & Compliance You Can Trust': '值得信赖的品质与合规',
      'Now That You\'ve Seen Our Credentials': '了解我们的资质后', 'Let\'s talk business. Our team is ready to answer your questions, send samples, and give you the best price for your order.': '欢迎洽谈合作。我们的团队随时为您解答问题、寄送样品并提供有竞争力的报价。',
      'Request a Quote →': '获取报价 →', '💬 WhatsApp Us': '💬 WhatsApp 联系我们',
      'Tell Us What You Need': '告诉我们您的需求', 'Fill in your requirements below and our team will reply with pricing and lead time.': '请填写以下需求，我们的团队将回复价格和交期。',
      'Name *': '姓名 *', 'Company': '公司', 'Email *': '邮箱 *', 'Phone / WhatsApp': '电话 / WhatsApp', 'Product Interest': '意向产品', 'Quantity Needed': '需求数量', 'Additional Requirements': '其他要求', 'Submit Request': '提交询价',
      'Our Activity': '企业动态', "Where We've Been & Who We've Met": '我们的足迹与客户交流',
      'We actively participate in international trade exhibitions and welcome buyers from around the world to visit our showroom in Zhili, Huzhou.': '我们积极参加国际贸易展会，并欢迎世界各地买家到访湖州织里展厅。',
      "Huzhou Zhili Children's Clothing Exhibition": '湖州织里童装展', "Zhili Children's Garments Global Selection Center · Huzhou, Zhejiang": '织里童装全球选品中心 · 浙江湖州',
      'Yubei Showroom': '语贝展厅', 'International Welcome': '欢迎国际买家', 'You Are Always Welcome to Visit Us!': '随时欢迎您来访！',
      'Come see our showroom, browse the full collection, and meet our team in person. We are located in the heart of Zhili Town — the world\'s largest children\'s clothing hub.': '欢迎参观我们的展厅、浏览完整产品系列并与团队见面。我们位于全球最大的童装产业基地——织里镇。',
      '💬 Contact to Arrange Visit': '💬 联系预约参观', 'View Contact Details': '查看联系方式',
      'Get In Touch': '联系我们', "We'd Love to Hear From You": '期待您的联系',
      "Whether you're exploring a bulk order, custom design, or a new partnership, our team in Huzhou is ready to help. Reach out and we'll respond within 24 hours.": '无论您需要批量订单、定制设计还是新的合作机会，我们的湖州团队都将竭诚协助，并在24小时内回复。',
      'Address': '地址', 'Contact Person': '联系人', 'Business Hours': '营业时间', 'Email': '邮箱', 'Email Us Now': '立即发送邮件',
      "Let's Build a Successful Partnership": '携手建立成功合作', 'Contact Us': '联系我们', 'Address:': '地址：', 'Contact:': '联系人：', 'Phone:': '电话：', 'Email:': '邮箱：',
      'Your Product Inquiry': '您的产品询价', 'Add up to 30 styles, quantities, and notes.': '最多可添加30个款式、数量和备注。',
      'Your name': '您的姓名', 'Country': '国家', 'Required delivery date': '要求交货日期', 'Destination port': '目的港', 'Target price': '目标价格', 'Customization requirements': '定制要求', 'Preferred contact method': '首选联系方式',
      'Apply one quantity to all selected styles': '将同一数量应用到所有已选款式', 'Apply to All': '全部应用', 'Quantity': '数量', 'Notes': '备注',
      'Copy Summary': '复制询价内容', 'Send on WhatsApp': '通过 WhatsApp 发送', 'Send by Email': '通过邮件发送', 'Clear List': '清空列表', 'Inquiry List': '询价清单',
      'WhatsApp': 'WhatsApp', 'WeChat': '微信', 'Ready to Order?': '准备下单？', 'Interested in our products?': '对我们的产品感兴趣？', 'Get a quote in 24 hours': '24小时内获取报价',
      'Your inquiry list is empty. Add styles from the Products page.': '询价清单为空。请从产品页面添加款式。',
      'Example: YB-WI-001': '例如：YB-WI-001', 'Name': '姓名', 'Company name': '公司名称', 'Country': '国家',
      'Example: Port Klang': '例如：巴生港', 'Example: 6.50 per piece': '例如：每件 6.50', 'Logo, label, colors, packaging': '标志、标签、颜色、包装',
      'Example: 300 pieces each': '例如：每款300件', 'Pieces': '件数', 'Color, label, or other request': '颜色、标签或其他要求',
      'Add at least one style first.': '请先添加至少一个款式。', 'Enter a valid quantity first.': '请先输入有效数量。',
      'Inquiry summary copied.': '询价内容已复制。', 'Inquiry list cleared.': '询价清单已清空。', 'Choose language': '选择语言',
      'Middle East': '中东', 'Southeast Asia': '东南亚', 'Central Asia': '中亚', 'Africa': '非洲', 'Europe & America': '欧洲与美洲', 'Why Choose Us': '为什么选择我们',
      'Superior Quality': '卓越品质', 'We use premium fabrics and maintain strict quality control throughout the production process.': '我们采用优质面料，并在整个生产过程中实施严格的质量控制。',
      'Rich Experience': '经验丰富', 'Years of experience exporting to diverse markets ensures we understand international standards and customer needs.': '多年多市场出口经验，使我们深入了解国际标准和客户需求。',
      'Fashionable Design': '时尚设计', 'Our design team keeps up with global trends to create appealing and marketable products.': '我们的设计团队紧跟全球趋势，打造美观且具有市场竞争力的产品。',
      'Reliable Supply Chain': '可靠供应链', 'A mature and stable supply chain ensures on-time delivery and consistent quality.': '成熟稳定的供应链确保按时交付和品质一致。',
      'One-Stop Service': '一站式服务', 'We handle everything from design concept to finished product delivery, ensuring a seamless experience.': '从设计构思到成品交付，我们全程负责，确保合作顺畅。',
      'Full-Season Collection': '全季产品系列', "We offer a comprehensive range of children's clothing designed to suit diverse seasonal needs.": '我们提供丰富的童装系列，满足不同季节的市场需求。',
      'Specialization in Sets': '专注童装套装', "Our expertise lies in high-quality children's clothing sets, a top-selling category in global markets.": '我们专注高品质童装套装，这是全球市场的热销品类。',
      'Ready Stock & Delivery': '现货与快速交付', 'We maintain substantial ready stock to enable quick response to urgent orders and fast delivery.': '我们备有充足现货，可快速响应紧急订单并及时交付。',
      'Yes! We encourage buyers to request a sample before committing to a bulk order. This allows you to check the fabric quality, sizing, stitching, and design before production begins. Contact us via WhatsApp or email to arrange your sample.': '可以！我们建议买家在批量下单前申请样品，以确认面料品质、尺码、车工和设计。请通过 WhatsApp 或邮件联系我们安排样品。',
      'We accept the following payment methods:': '我们接受以下付款方式：', 'Bank Transfer (T/T)': '银行电汇（T/T）', 'international wire transfer': '国际电汇', 'WeChat Pay': '微信支付', 'for buyers with WeChat': '适用于使用微信的买家', 'Alipay': '支付宝', 'fast and secure online payment': '快捷安全的在线支付',
      'Please contact us to confirm payment details before transferring.': '转账前请联系我们确认付款信息。', 'Contact us for a shipping quote to your country.': '请联系我们获取发往您所在国家的运费报价。',
      'Original Equipment Manufacturer': '原始设备制造（OEM）', 'We can produce your designs and brand them with your label.': '我们可按您的设计生产并使用您的品牌标签。',
      'Original Design Manufacturer': '原始设计制造（ODM）', 'Our design team creates unique products based on your specifications and market needs.': '我们的设计团队根据您的规格和市场需求开发独特产品。',
      'Customization': '定制服务', 'We offer customization in fabric, color, size, and printing/logo.': '我们提供面料、颜色、尺码以及印花或标志定制。',
      'Wholesale': '批量批发', 'We welcome bulk wholesale orders with competitive pricing to suit your business.': '我们承接批量批发订单，并提供适合您业务的有竞争力价格。',
      'Business License': '营业执照', 'Trademark Registration': '商标注册证', 'Chamber of Commerce Member': '商会会员证书', 'Quality Supplier Award': '优质供应商奖',
      'Certifications': '资质认证', 'Our Strengths': '我们的实力', 'Strict Quality Control': '严格质量控制', 'Fast Turnaround': '快速交付', 'Flexible Pricing': '灵活定价', 'Countries Export Compliant': '符合多国出口要求',
      'Request a Quote': '获取报价', 'Chat with us 👋': '联系我们 👋', 'Usually replies within minutes': '通常几分钟内回复', 'buyers viewing today': '位买家今日正在浏览', 'Open inquiry list': '打开询价清单', 'Back to top': '返回顶部'
    },
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
      'Address': 'العنوان', 'Contact Person': 'جهة الاتصال', 'Business Hours': 'ساعات العمل', 'Email': 'البريد الإلكتروني', 'Email Us Now': 'راسلنا الآن',
      "Let's Build a Successful Partnership": 'لنبنِ شراكة ناجحة', 'Contact Us': 'اتصل بنا', 'Address:': 'العنوان:', 'Contact:': 'جهة الاتصال:', 'Phone:': 'الهاتف:', 'Email:': 'البريد الإلكتروني:',
      'Your Product Inquiry': 'استفسار المنتجات', 'Add up to 30 styles, quantities, and notes.': 'أضف حتى 30 موديلًا مع الكميات والملاحظات.',
      'Your name': 'اسمك', 'Country': 'الدولة', 'Required delivery date': 'تاريخ التسليم المطلوب', 'Destination port': 'ميناء الوصول', 'Target price': 'السعر المستهدف', 'Customization requirements': 'متطلبات التخصيص', 'Preferred contact method': 'طريقة التواصل المفضلة',
      'Apply one quantity to all selected styles': 'تطبيق كمية واحدة على جميع الموديلات', 'Apply to All': 'تطبيق على الكل', 'Quantity': 'الكمية', 'Notes': 'ملاحظات',
      'Copy Summary': 'نسخ الملخص', 'Send on WhatsApp': 'إرسال عبر واتساب', 'Send by Email': 'إرسال بالبريد', 'Clear List': 'مسح القائمة', 'Inquiry List': 'قائمة الاستفسار',
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
      'Request a Quote': 'اطلب عرض سعر', 'Chat with us 👋': 'تواصل معنا 👋', 'Usually replies within minutes': 'نرد عادة خلال دقائق', 'buyers viewing today': 'مشترون يتصفحون اليوم', 'Open inquiry list': 'فتح قائمة الاستفسار', 'Back to top': 'العودة إلى الأعلى'
    }
  };

  var metadata = {
    en: {
      title: "China Kidswear Manufacturer | Yubei Children's Clothing",
      description: "Yubei Apparel is a children's clothing manufacturer and exporter in Zhili, Huzhou, China, offering wholesale kidswear, OEM, ODM and private-label production."
    },
    zh: {
      title: '中国童装制造商 | 语贝童装',
      description: '语贝服饰位于中国湖州织里，提供童装批发、OEM、ODM、定制设计和自有品牌生产服务。'
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
    if (match) return (language === 'zh' ? '款号：' : 'رقم الموديل: ') + match[1];
    match = value.match(/^(\d+) selected styles? · ([\d,]+) total pieces(?: · ([\d,]+) average per style)?$/);
    if (match) {
      if (language === 'zh') return match[1] + ' 个已选款式 · 共 ' + match[2] + ' 件' + (match[3] ? ' · 平均每款 ' + match[3] + ' 件' : '');
      if (match[1] === '1') return 'موديل واحد مختار · ' + match[2] + ' قطعة إجمالاً' + (match[3] ? ' · متوسط ' + match[3] + ' لكل موديل' : '');
      return match[1] + ' موديلات مختارة · ' + match[2] + ' قطعة إجمالاً' + (match[3] ? ' · متوسط ' + match[3] + ' لكل موديل' : '');
    }
    match = value.match(/^(\d+) matching styles?$/);
    if (match) return language === 'zh' ? match[1] + ' 个匹配款式' : match[1] + ' موديلات مطابقة';
    return value;
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

  function setLanguage(language) {
    if (!['en', 'zh', 'ar'].includes(language)) language = 'en';
    currentLanguage = language;
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    try { localStorage.setItem(STORAGE_KEY, language); } catch (e) {}
    var selector = document.getElementById('languageSwitcher');
    if (selector && selector.value !== language) selector.value = language;
    updateMetadata();
    translateTree(document.body);
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
            if (selector) selector.value = currentLanguage;
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
