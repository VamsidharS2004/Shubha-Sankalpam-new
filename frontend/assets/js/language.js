/* ============================================================
   ⚠️ SITE CODE — not content. To edit puja/package text, prices,
   images, or site info, go to the /content folder instead.

   LANGUAGE.JS — Telugu/Hindi translations for the puja-details page
   Unlike the top navbar/footer (which always stay English, like
   the reference site), the PUJA DETAILS PAGE fully translates —
   tabs, section headers, sidebar labels, buttons — matching
   vedamandir.com's behavior exactly.
   Add a language by copying the "te" block and translating it.
   ============================================================ */
const DETAIL_UI = {
  en: {
    language_label: "Language", sanskrit: "Sanskrit", inclusive: "Inclusive of all puja samagri & seva", per_puja: "/- per puja", highlights: "Puja Highlights", bc_home: "Home", bc_puja: "Puja", bc_maha: "Maha Pujas",
    tab_about: "About Pooja", tab_benefits: "Pooja Benefits", tab_procedure: "Pooja Procedure",
    tab_temple: "Temple Details", tab_receive: "What You Will Receive",
    tab_faqs: "Frequently Asked Questions (FAQs)", tab_gallery: "Gallery", tab_reviews: "Reviews",
    h_about: "About pooja", h_benefits: "Pooja Benefits", h_procedure: "Pooja Procedure",
    h_temple: "Temple Details", h_receive: "What You Will Receive",
    h_faqs: "Frequently Asked Questions (FAQs)", h_gallery: "Puja Gallery", h_reviews: "Reviews",
    lbl_ratings: "ratings", lbl_conducted: "pujas conducted", lbl_avg: "Average ratings",
    wishlist: "Wishlist", share: "Share", copied: "Copied",
    muhurat_ends: "MUHURAT ENDS IN", reserve_sankalp: "Reserve your sankalp",
    u_days: "DAYS", u_hours: "HOURS", u_min: "MIN", u_sec: "SEC",
    book_now: "Book Now", book_wa: "Book via WhatsApp", book_call: "Book via Call",
    included_title: "Included with this Puja", no_hidden: "NO HIDDEN CHARGES",
    advisor_title: "Unsure which ritual to book?",
    advisor_body: "Need help choosing the right puja? Talk with our spiritual advisors — no obligation.",
    advisor_btn: "WhatsApp Expert",
    read_more: "Read More", show_less: "Show Less", swipe: "Swipe ≫",
    col_tradition: "Tradition", col_duration: "Duration", col_forwhom: "Meant For",
    core_ritual: "THE CORE RITUAL",
    trust1: "Puja Video Delivered Within 48 Hours", trust2: "Verified & Experienced Purohits",
    trust3: "Pujas Performed in Sacred Temples", trust4: "100% Authentic Vedic Rituals",
    bk_heading: "Enter your details for the Puja",
    bk_step1: "Devotee Details",
    bk_step2: "Review",
    bk_step3: "Payment",
    bk_wa_label: "Your WhatsApp Number ✏️",
    bk_wa_hint: "Puja video and blessing details will be sent to this number.",
    bk_names_label: "Names of members participating in the puja",
    bk_name_placeholder: "Devotee Name",
    bk_names_req: "Please enter at least one devotee name",
    bk_names_hint: "This name will be included during the Puja sankalpam.",
    bk_gotram_label: "Fill in participants Gotram",
    bk_gotram_unknown: "I don't know my gotra",
    bk_optional: "(optional)",
    bk_sankalpam_label: "Add your sankalpam",
    bk_sankalpam_hint: "Example: For health, wealth, and family well-being",
    bk_family_puja: "Family Puja",
    bk_convenience_fee: "Convenience Fee",
    bk_pandit_fee: "Pandit Fee",
    bk_media_fee: "Photo and video recording Fee",
    bk_free: "Free",
    bk_summary_total: "Total",
    bk_continue: "Continue",
    bk_secure: "100% Secure"
  },
  te: {
    language_label: "భాష", sanskrit: "సంస్కృతం", inclusive: "పూజా సామాగ్రి మరియు సేవలు అన్నీ కలిపి", per_puja: "/- పూజకు", highlights: "పూజ యొక్క ముఖ్యాంశాలు", bc_home: "హోమ్", bc_puja: "పూజ", bc_maha: "మహా పూజలు",
    tab_about: "పూజ గురించి", tab_benefits: "పూజ ప్రయోజనాలు", tab_procedure: "పూజ ప్రక్రియ",
    tab_temple: "ఆలయ వివరాలు", tab_receive: "మీకు లభించేవి",
    tab_faqs: "తరచుగా అడిగే ప్రశ్నలు", tab_gallery: "గ్యాలరీ", tab_reviews: "రివ్యూలు",
    h_about: "పూజ గురించి", h_benefits: "పూజ ప్రయోజనాలు", h_procedure: "పూజ ప్రక్రియ",
    h_temple: "ఆలయ వివరాలు", h_receive: "మీకు లభించేవి",
    h_faqs: "తరచుగా అడిగే ప్రశ్నలు", h_gallery: "పూజ గ్యాలరీ", h_reviews: "రివ్యూలు",
    lbl_ratings: "రేటింగ్‌లు", lbl_conducted: "పూజలు నిర్వహించబడ్డాయి", lbl_avg: "సగటు రేటింగ్",
    wishlist: "విష్‌లిస్ట్", share: "షేర్", copied: "కాపీ చేయబడింది",
    muhurat_ends: "ముహూర్తం ముగియడానికి", reserve_sankalp: "సంకల్పాన్ని బుక్ చేయండి",
    u_days: "రోజులు", u_hours: "గంటలు", u_min: "నిమిషాలు", u_sec: "సెకన్లు",
    book_now: "బుక్ చేయండి", book_wa: "WhatsApp లో బుక్ చేయండి", book_call: "కాల్ ద్వారా బుక్ చేయండి",
    included_title: "ఈ పూజలో చేర్చబడినవి", no_hidden: "దాచిన ఛార్జీలు లేవు",
    advisor_title: "ఏ పూజ బుక్ చేయాలో తెలియదా?",
    advisor_body: "సరైన పూజ ఎంచుకోవడంలో సహాయం కావాలా? మా ఆధ్యాత్మిక సలహాదారులతో మాట్లాడండి — ఎలాంటి నిర్బంధం లేదు.",
    advisor_btn: "వాట్సాప్ నిపుణుడు",
    read_more: "మరింత చదవండి", show_less: "తక్కువగా చూపించు", swipe: "స్వైప్ చేయండి ≫",
    col_tradition: "సంప్రదాయం", col_duration: "విధి వ్యవధి", col_forwhom: "ఎవరి కోసం",
    core_ritual: "ప్రధాన కర్మ",
    trust1: "48 గంటల్లో పూజ వీడియో డెలివరీ", trust2: "ధృవీకరించబడిన అనుభవజ్ఞ పురోహితులు",
    trust3: "పవిత్ర దేవాలయాల్లో పూజలు", trust4: "100% ప్రామాణిక వైదిక పూజలు",
    bk_heading: "పూజ కోసం మీ వివరాలు నమోదు చేయండి",
    bk_step1: "భక్తుల వివరాలు",
    bk_step2: "సమీక్ష",
    bk_step3: "చెల్లింపు",
    bk_wa_label: "మీ వాట్సాప్ నంబర్ ✏️",
    bk_wa_hint: "పూజ వీడియో మరియు ఆశీర్వాద వివరాలు ఈ నంబర్‌కు పంపబడతాయి.",
    bk_names_label: "పూజలో పాల్గొనబోయే సభ్యుల పేర్లు",
    bk_name_placeholder: "భక్తుని పేరు",
    bk_names_req: "దయచేసి కనీసం ఒక భక్తుని పేరు నమోదు చేయండి",
    bk_names_hint: "పూజ సంకల్పం సమయంలో ఈ పేరు చేర్చబడుతుంది.",
    bk_gotram_label: "పాల్గొనేవారి గోత్రాన్ని భర్తీ చేయండి",
    bk_gotram_unknown: "నా గోత్రం నాకు తెలియదు",
    bk_optional: "(ఐచ్ఛికం)",
    bk_sankalpam_label: "మీ ఆకాంక్ష జోడించండి",
    bk_sankalpam_hint: "ఉదాహరణ: ఆరోగ్యం, ఐశ్వర్యం, కుటుంబ శ్రేయస్సు కోసం",
    bk_family_puja: "కుటుంబ పూజ",
    bk_convenience_fee: "సౌకర్య రుసుము",
    bk_pandit_fee: "పురోహిత రుసుము",
    bk_media_fee: "ఫోటో మరియు వీడియో రికార్డింగ్ రుసుము",
    bk_free: "ఉచితం",
    bk_summary_total: "మొత్తం",
    bk_continue: "కొనసాగించండి",
    bk_secure: "100% సురక్షితం"
  },
  hi: {
    language_label: "भाषा", sanskrit: "संस्कृत", inclusive: "सभी पूजा सामग्री और सेवा सहित", per_puja: "/- प्रति पूजा", highlights: "पूजा की मुख्य विशेषताएं", bc_home: "होम", bc_puja: "पूजा", bc_maha: "महा पूजा",
    tab_about: "पूजा के बारे में", tab_benefits: "पूजा के लाभ", tab_procedure: "पूजा विधि",
    tab_temple: "मंदिर विवरण", tab_receive: "आपको क्या मिलेगा",
    tab_faqs: "अक्सर पूछे जाने वाले प्रश्न (FAQs)", tab_gallery: "गैलरी", tab_reviews: "समीक्षाएँ",
    h_about: "पूजा के बारे में", h_benefits: "पूजा के लाभ", h_procedure: "पूजा विधि",
    h_temple: "मंदिर विवरण", h_receive: "आपको क्या मिलेगा",
    h_faqs: "अक्सर पूछे जाने वाले प्रश्न (FAQs)", h_gallery: "पूजा गैलरी", h_reviews: "समीक्षाएँ",
    lbl_ratings: "रेटिंग", lbl_conducted: "पूजाएँ संपन्न", lbl_avg: "औसत रेटिंग",
    wishlist: "इच्छा-सूची", share: "शेयर", copied: "कॉपी हो गया",
    muhurat_ends: "मुहूर्त समाप्ति में", reserve_sankalp: "अपना संकल्प सुरक्षित करें",
    u_days: "दिन", u_hours: "घंटे", u_min: "मिनट", u_sec: "सेकंड",
    book_now: "अभी बुक करें", book_wa: "WhatsApp से बुक करें", book_call: "कॉल से बुक करें",
    included_title: "इस पूजा में शामिल", no_hidden: "कोई छिपा शुल्क नहीं",
    advisor_title: "कौन सी पूजा बुक करें, तय नहीं कर पा रहे?",
    advisor_body: "सही पूजा चुनने में मदद चाहिए? हमारे आध्यात्मिक सलाहकारों से बात करें — कोई बाध्यता नहीं।",
    advisor_btn: "WhatsApp विशेषज्ञ",
    read_more: "और पढ़ें", show_less: "कम दिखाएँ", swipe: "स्वाइप करें ≫",
    col_tradition: "परंपरा", col_duration: "अवधि", col_forwhom: "किसके लिए",
    core_ritual: "मुख्य अनुष्ठान",
    trust1: "48 घंटे में पूजा वीडियो डिलीवरी", trust2: "सत्यापित व अनुभवी पुरोहित",
    trust3: "पवित्र मंदिरों में पूजाएँ", trust4: "100% प्रामाणिक वैदिक अनुष्ठान",
    bk_heading: "पूजा के लिए अपना विवरण दर्ज करें",
    bk_step1: "भक्त का विवरण",
    bk_step2: "समीक्षा",
    bk_step3: "भुगतान",
    bk_wa_label: "आपका व्हाट्सएप नंबर ✏️",
    bk_wa_hint: "पूजा वीडियो और आशीर्वाद विवरण इस नंबर पर भेजे जाएंगे।",
    bk_names_label: "पूजा में भाग लेने वाले सदस्यों के नाम",
    bk_name_placeholder: "भक्त का नाम",
    bk_names_req: "कृपया कम से कम एक भक्त का नाम दर्ज करें",
    bk_names_hint: "यह नाम पूजा संकल्प के दौरान शामिल किया जाएगा।",
    bk_gotram_label: "प्रतिभागियों का गोत्र दर्ज करें",
    bk_gotram_unknown: "मुझे अपना गोत्र नहीं पता",
    bk_optional: "(वैकल्पिक)",
    bk_sankalpam_label: "अपना संकल्प जोड़ें",
    bk_sankalpam_hint: "उदाहरण: स्वास्थ्य, धन और पारिवारिक भलाई के लिए",
    bk_family_puja: "पारिवारिक पूजा",
    bk_convenience_fee: "सुविधा शुल्क",
    bk_pandit_fee: "पुरोहित शुल्क",
    bk_media_fee: "फोटो और वीडियो रिकॉर्डिंग शुल्क",
    bk_free: "मुफ़्त",
    bk_summary_total: "कुल",
    bk_continue: "जारी रखें",
    bk_secure: "100% सुरक्षित"
  }
};

// Add Telugu translations for payment
DETAIL_UI.te.pm_title = "స్కాన్ & పే";
DETAIL_UI.te.pm_upi = "UPI ID";
DETAIL_UI.te.pm_hint = "GPay / PhonePe / Paytm లేదా ఏదైనా UPI యాప్‌ను తెరిచి, ఈ క్యూఆర్ కోడ్‌ను స్కాన్ చేయండి లేదా పైనున్న UPI ID కి నేరుగా చెల్లించండి.";
DETAIL_UI.te.pm_done = "✓ నేను చెల్లింపు పూర్తి చేశాను";
DETAIL_UI.te.pm_thankyou = "ధన్యవాదాలు! బుకింగ్ స్వీకరించబడింది.";
DETAIL_UI.te.pm_success = "మేము మీ చెల్లింపును ధృవీకరించి, వాట్సాప్‌లో నిర్ధారణను పంపుతాము. మీ సంకల్పం వీడియో పూజ జరిగిన 48 గంటలలోపు పంపబడుతుంది.";
DETAIL_UI.te.pm_view = "నా బుకింగ్‌లను వీక్షించండి";

// Add Hindi translations for payment
DETAIL_UI.hi.pm_title = "स्कैन करें और भुगतान करें";
DETAIL_UI.hi.pm_upi = "यूपीआई (UPI) आईडी";
DETAIL_UI.hi.pm_hint = "GPay / PhonePe / Paytm या कोई अन्य UPI ऐप खोलें और इस कोड को स्कैन करें, या ऊपर दी गई UPI आईडी पर सीधे भुगतान करें।";
DETAIL_UI.hi.pm_done = "✓ मैंने भुगतान पूरा कर लिया है";
DETAIL_UI.hi.pm_thankyou = "धन्यवाद! बुकिंग प्राप्त हुई।";
DETAIL_UI.hi.pm_success = "हम आपके भुगतान की पुष्टि करेंगे और WhatsApp पर पुष्टि भेजेंगे। आपका संकल्प वीडियो पूजा के 48 घंटों के भीतर भेजा जाएगा।";
DETAIL_UI.hi.pm_view = "मेरी बुकिंग देखें";

// Add English translations for payment
DETAIL_UI.en.pm_title = "Scan & Pay";
DETAIL_UI.en.pm_upi = "UPI ID";
DETAIL_UI.en.pm_hint = "Open GPay / PhonePe / Paytm or any UPI app and scan this code, or pay directly to the UPI ID above.";
DETAIL_UI.en.pm_done = "✓ I have completed the payment";
DETAIL_UI.en.pm_thankyou = "Thank you! Booking received.";
DETAIL_UI.en.pm_success = "We will verify your payment and send a confirmation on WhatsApp. Your sankalpam video will follow within 48 hours of the puja.";
DETAIL_UI.en.pm_view = "View My Bookings";

function dt(key) {
  return (DETAIL_UI[currentLang] && DETAIL_UI[currentLang][key]) || DETAIL_UI.en[key] || key;
}

/* applies every [data-i18n] element on the details page */
function applyDetailI18n() {
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = dt(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => { el.placeholder = dt(el.dataset.i18nPlaceholder); });
}

// Automatically apply translations if on a page with data-i18n tags
document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector("[data-i18n]")) {
    applyDetailI18n();
  }
  if (document.querySelector("[data-i18n-list]")) {
    applyListingI18n();
  }
});

const LISTING_UI = {
  en: { 
    list_title: "Upcoming Pujas", pkg_title: "Upcoming Puja Packages", search_p: "What puja are you looking for?", search_pkg: "What package are you looking for?", filter_all: "All", filter_fin: "Finance", filter_health: "Health", hero_h1: "Discover Sacred Pujas & Divine Blessings", hero_p: "Find authentic temple rituals performed by qualified priests and receive personalized sankalpam, puja videos, and divine blessings.",
    process_title: "From <em>Booking</em> to Divine <em>Blessings</em>",
    proc_step1_title: "Choose Your Puja",
    proc_step1_desc: "Select the puja you wish to perform and provide your details.",
    proc_step2_title: "Complete Booking",
    proc_step2_desc: "Choose your preferred date and complete the payment securely.",
    proc_step3_title: "Puja is Performed",
    proc_step3_desc: "Our verified purohits perform the puja with devotion on your behalf.",
    proc_step4_title: "Receive Puja video & Blessings",
    proc_step4_desc: "Receive the divine blessings and Puja video",
    stat1_num: "1000+", stat1_lbl: "Pujas Performed",
    stat2_num: "50+", stat2_lbl: "Sacred Temples",
    stat3_num: "250K+", stat3_lbl: "Happy Devotees",
    stat4_num: "4.8/5", stat4_lbl: "Devotee Rating",
    our_pujas: "Our <em>Pujas</em>", filter_graha: "Graha Shanti", filter_wealth: "Wealth", filter_marriage: "Marriage", filter_edu: "Education", filter_protection: "Protection", filter_special: "Special", view_all_pujas: "View All Pujas <span>→</span>",
    why_us: "Why <em>Shubha Sankalpam</em>",
    sacred_temples: "Sacred <em>Temples</em>", sacred_temples_sub: "The temples where your pujas are performed, by verified purohits.",
    puja_gallery: "Puja <em>Gallery</em>",
    devotees_say: "What <em>Devotees</em> Say",
    faq_title: "Doubts? <em>We're Here.</em>", faq_sub: "Our devotee care team is available on WhatsApp, phone, and email. Meanwhile, here are answers to common questions."
  },
  te: { 
    list_title: "రాబోయే పూజలు", pkg_title: "రాబోయే పూజా ప్యాకేజీలు", search_p: "మీరు ఏ పూజ కోసం వెతుకుతున్నారు?", search_pkg: "మీరు ఏ ప్యాకేజీ కోసం వెతుకుతున్నారు?", filter_all: "అన్నీ", filter_fin: "ఆర్థికం", filter_health: "ఆరోగ్యం", hero_h1: "పవిత్ర పూజలు & దైవ ఆశీర్వాదాలను కనుగొనండి", hero_p: "అర్హులైన పురోహితులచే నిర్వహించబడే ప్రామాణిక ఆలయ ఆచారాలను కనుగొనండి మరియు వ్యక్తిగతీకరించిన సంకల్పం, పూజ వీడియోలు మరియు దైవిక ఆశీర్వాదాలను పొందండి.",
    process_title: "<em>బుకింగ్</em> నుండి దైవిక <em>ఆశీర్వాదాల</em> వరకు",
    proc_step1_title: "మీ పూజను ఎంచుకోండి",
    proc_step1_desc: "మీరు చేయదలచిన పూజను ఎంచుకుని మీ వివరాలను అందించండి.",
    proc_step2_title: "బుకింగ్ పూర్తి చేయండి",
    proc_step2_desc: "మీకు అనుకూలమైన తేదీని ఎంచుకుని చెల్లింపును సురక్షితంగా పూర్తి చేయండి.",
    proc_step3_title: "పూజ నిర్వహించబడుతుంది",
    proc_step3_desc: "మా ధృవీకరించబడిన పురోహితులు మీ తరపున భక్తితో పూజను నిర్వహిస్తారు.",
    proc_step4_title: "పూజ వీడియో & ఆశీర్వాదాలు పొందండి",
    proc_step4_desc: "దైవిక ఆశీర్వాదాలు మరియు పూజ వీడియోను పొందండి.",
    stat1_num: "1000+", stat1_lbl: "పూజలు నిర్వహించబడ్డాయి",
    stat2_num: "50+", stat2_lbl: "పవిత్ర దేవాలయాలు",
    stat3_num: "250K+", stat3_lbl: "సంతోషకరమైన భక్తులు",
    stat4_num: "4.8/5", stat4_lbl: "భక్తుల రేటింగ్",
    our_pujas: "మా <em>పూజలు</em>", filter_graha: "గ్రహ శాంతి", filter_wealth: "సంపద", filter_marriage: "వివాహం", filter_edu: "విద్య", filter_protection: "రక్షణ", filter_special: "ప్రత్యేకం", view_all_pujas: "అన్ని పూజలను చూడండి <span>→</span>",
    why_us: "<em>శుభ సంకల్పం</em> ఎందుకు",
    sacred_temples: "పవిత్ర <em>దేవాలయాలు</em>", sacred_temples_sub: "మీ పూజలు నిర్వహించబడే దేవాలయాలు, ధృవీకరించబడిన పురోహితులచే.",
    puja_gallery: "పూజా <em>గ్యాలరీ</em>",
    devotees_say: "<em>భక్తులు</em> ఏమంటున్నారు",
    faq_title: "సందేహాలా? <em>మేము ఉన్నాము.</em>", faq_sub: "మా డివోటీ కేర్ బృందం WhatsApp, ఫోన్ మరియు ఇమెయిల్‌లో అందుబాటులో ఉంటుంది. ఈలోగా, సాధారణ ప్రశ్నలకు సమాధానాలు ఇక్కడ ఉన్నాయి."
  },
  hi: { 
    list_title: "आगामी पूजाएँ", pkg_title: "आगामी पूजा पैकेज", search_p: "आप कौन सी पूजा खोज रहे हैं?", search_pkg: "आप कौन सा पैकेज खोज रहे हैं?", filter_all: "सभी", filter_fin: "वित्त", filter_health: "स्वास्थ्य", hero_h1: "पवित्र पूजाएँ और दिव्य आशीर्वाद खोजें", hero_p: "योग्य पुजारियों द्वारा किए गए प्रामाणिक मंदिर अनुष्ठान खोजें और व्यक्तिगत संकल्प, पूजा वीडियो और दिव्य आशीर्वाद प्राप्त करें।",
    process_title: "<em>बुकिंग</em> से दिव्य <em>आशीर्वाद</em> तक",
    proc_step1_title: "अपनी पूजा चुनें",
    proc_step1_desc: "वह पूजा चुनें जिसे आप करना चाहते हैं और अपना विवरण दें।",
    proc_step2_title: "बुकिंग पूरी करें",
    proc_step2_desc: "अपनी पसंदीदा तिथि चुनें और सुरक्षित रूप से भुगतान पूरा करें।",
    proc_step3_title: "पूजा संपन्न की जाती है",
    proc_step3_desc: "हमारे सत्यापित पुरोहित आपकी ओर से भक्ति के साथ पूजा करते हैं।",
    proc_step4_title: "पूजा वीडियो और आशीर्वाद प्राप्त करें",
    proc_step4_desc: "दिव्य आशीर्वाद और पूजा वीडियो प्राप्त करें।",
    stat1_num: "1000+", stat1_lbl: "पूजाएँ संपन्न",
    stat2_num: "50+", stat2_lbl: "पवित्र मंदिर",
    stat3_num: "250K+", stat3_lbl: "संतुष्ट भक्त",
    stat4_num: "4.8/5", stat4_lbl: "भक्त रेटिंग",
    our_pujas: "हमारी <em>पूजाएँ</em>", filter_graha: "ग्रह शांति", filter_wealth: "धन", filter_marriage: "विवाह", filter_edu: "शिक्षा", filter_protection: "सुरक्षा", filter_special: "विशेष", view_all_pujas: "सभी पूजाएँ देखें <span>→</span>",
    why_us: "<em>शुभ संकल्पम</em> क्यों",
    sacred_temples: "पवित्र <em>मंदिर</em>", sacred_temples_sub: "वे मंदिर जहाँ आपकी पूजाएँ प्रमाणित पुरोहितों द्वारा की जाती हैं।",
    puja_gallery: "पूजा <em>गैलरी</em>",
    devotees_say: "<em>भक्त</em> क्या कहते हैं",
    faq_title: "कोई संदेह? <em>हम यहाँ हैं।</em>", faq_sub: "हमारी भक्त सेवा टीम व्हाट्सएप, फोन और ईमेल पर उपलब्ध है। इस बीच, यहाँ सामान्य प्रश्नों के उत्तर हैं।"
  }
};

function lt(key) {
  return (LISTING_UI[currentLang] && LISTING_UI[currentLang][key]) || LISTING_UI.en[key] || key;
}

function applyListingI18n() {
  document.querySelectorAll("[data-i18n-list]").forEach(el => { el.innerHTML = lt(el.dataset.i18nList); });
  document.querySelectorAll("[data-i18n-list-placeholder]").forEach(el => { el.placeholder = lt(el.dataset.i18nListPlaceholder); });
}

window.addEventListener("languageChanged", () => {
  if (document.querySelector("[data-i18n]")) {
    applyDetailI18n();
  }
  if (document.querySelector("[data-i18n-list]")) {
    applyListingI18n();
  }
});
