/* ================================================================
   DEFAULT PUJA-DETAILS CONTENT
   ================================================================
   ⭐ FALLBACK CONTENT — used automatically when a puja in
   content/pujas.js doesn't define its own "detail" section ⭐

   Most of your pujas only define a short "about" text and mantra
   for themselves — everything else on their details page (Pooja
   Benefits, Pooja Procedure, What You Will Receive, FAQs, Reviews,
   the Tradition/Duration/Meant-For box) is filled in automatically
   from this file, so you don't have to repeat the same content on
   every puja.

   To give ONE specific puja its own custom benefits/procedure/FAQs
   instead of these defaults, add that section directly inside its
   own entry in content/pujas.js (see the "Shravana Somavara Shiva
   Rituals" puja there for a full example that overrides everything).
   ================================================================ */

const DETAIL_DEFAULTS = {
  mantra: "OM SRI GURUBHYO NAMAHA",
  stats: { ratings: "2.4L+", conducted: "13L+", avg: "4.9/5" },
  tradition: "Vedic Shastric Tradition", tradition_te: "వైదిక శాస్త్ర సంప్రదాయం", tradition_hi: "वैदिक शास्त्रीय परंपरा",
  duration: "Minimum 2 hours", duration_te: "కనీసం 2 గంటలు", duration_hi: "न्यूनतम 2 घंटे",
  forWhom: "Individual or Family", forWhom_te: "వ్యక్తి లేదా కుటుంబం", forWhom_hi: "व्यक्ति या परिवार",
  benefits: [
    { t: "Divine Blessings", t_te: "దైవానుగ్రహం", t_hi: "दिव्य आशीर्वाद",
      d: "The deity's grace is invoked specifically for you through a sankalpam taken in your name and gotram.",
      d_te: "మీ పేరు, గోత్రంతో తీసుకున్న సంకల్పం ద్వారా దేవత అనుగ్రహం ప్రత్యేకంగా మీ కోసం ఆవాహన చేయబడుతుంది.",
      d_hi: "आपके नाम व गोत्र से लिए गए संकल्प के माध्यम से देवता की कृपा विशेष रूप से आपके लिए आवाहित की जाती है।" },
    { t: "Peace & Positivity", t_te: "శాంతి & సానుకూలత", t_hi: "शांति व सकारात्मकता",
      d: "Removal of negative influences and the blessing of calm, positive energy at home.",
      d_te: "ప్రతికూల ప్రభావాల తొలగింపు మరియు ఇంట్లో ప్రశాంతమైన, సానుకూల శక్తి యొక్క ఆశీర్వాదం.",
      d_hi: "नकारात्मक प्रभावों को दूर करना और घर में शांत, सकारात्मक ऊर्जा का आशीर्वाद।" },
    { t: "Health & Wellbeing", t_te: "ఆరోగ్యం & శ్రేయస్సు", t_hi: "स्वास्थ्य व कल्याण",
      d: "Prayers for good health, strength, and protection for you and your family.",
      d_te: "మీకు మరియు మీ కుటుంబానికి మంచి ఆరోగ్యం, బలం, రక్షణ కోసం ప్రార్థనలు.",
      d_hi: "आपके व आपके परिवार के लिए अच्छे स्वास्थ्य, शक्ति और सुरक्षा हेतु प्रार्थनाएँ।" },
    { t: "Prosperity", t_te: "సంపద", t_hi: "समृद्धि",
      d: "Blessings for growth, abundance, and success in your endeavours.",
      d_te: "మీ ప్రయత్నాలలో వృద్ధి, సమృద్ధి, విజయం కోసం ఆశీర్వాదాలు.",
      d_hi: "आपके प्रयासों में वृद्धि, समृद्धि और सफलता हेतु आशीर्वाद।" }
  ],
  procedure: [
    { t: "Sankalpam", t_te: "సంకల్పం", t_hi: "संकल्प",
      d: "The priest takes the sankalpam with your name, gotram, and family members, dedicating the ritual to you.",
      d_te: "పురోహితుడు మీ పేరు, గోత్రం, కుటుంబ సభ్యులతో సంకల్పం తీసుకుని పూజను మీకు అంకితం చేస్తారు.",
      d_hi: "पुरोहित आपके नाम, गोत्र व परिवार के सदस्यों के साथ संकल्प लेकर अनुष्ठान आपको समर्पित करते हैं।" },
    { t: "Ganapati Puja", t_te: "గణపతి పూజ", t_hi: "गणपति पूजा",
      d: "Lord Ganesha is worshipped first to remove obstacles and bless the ritual's completion.",
      d_te: "విఘ్నాలు తొలగించి పూజ పూర్తి కావడానికి ముందుగా గణేశుడిని పూజిస్తారు.",
      d_hi: "बाधाओं को दूर करने और अनुष्ठान की सफल समाप्ति हेतु पहले भगवान गणेश की पूजा की जाती है।" },
    { t: "Main Ritual", t_te: "ప్రధాన పూజ", t_hi: "मुख्य अनुष्ठान",
      d: "The main puja or homam is performed with Vedic mantras exactly as prescribed in the shastras.",
      d_te: "శాస్త్రాలలో నిర్దేశించిన విధంగా వైదిక మంత్రాలతో ప్రధాన పూజ లేదా హోమం నిర్వహించబడుతుంది.",
      d_hi: "शास्त्रों में निर्धारित विधि के अनुसार वैदिक मंत्रों के साथ मुख्य पूजा या होम संपन्न किया जाता है।" },
    { t: "Maha Harati & Prasadam", t_te: "మహా హారతి & ప్రసాదం", t_hi: "महा आरती व प्रसाद", core: true,
      d: "The ritual concludes with the Maha Mangala Harati and the offering of prasadam.",
      d_te: "మహా మంగళ హారతితో మరియు ప్రసాద సమర్పణతో పూజ ముగుస్తుంది.",
      d_hi: "महा मंगल आरती और प्रसाद अर्पण के साथ अनुष्ठान संपन्न होता है।" }
  ],
  receive: [
    { r: "Personalized Sankalpam with Name & Gotra", r_te: "పేరు & గోత్రంతో వ్యక్తిగత సంకల్పం", r_hi: "नाम व गोत्र सहित व्यक्तिगत संकल्प" },
    { r: "Full Puja Video on WhatsApp within 48 hrs", r_te: "48 గంటల్లో వాట్సాప్‌లో పూర్తి పూజ వీడియో", r_hi: "48 घंटे में WhatsApp पर पूरा पूजा वीडियो" }
  ],
  faqs: [
    { q: "Who should perform this puja?", q_te: "ఈ పూజ ఎవరు చేయించుకోవాలి?", q_hi: "यह पूजा किसे करानी चाहिए?",
      a: "Any devotee seeking the deity's blessings can have this puja performed — for themselves or on behalf of family members.",
      a_te: "దేవత ఆశీర్వాదం కోరుకునే ఏ భక్తుడైనా — తన కోసం లేదా కుటుంబ సభ్యుల తరపున ఈ పూజ చేయించుకోవచ్చు.",
      a_hi: "देवता का आशीर्वाद चाहने वाला कोई भी भक्त — स्वयं के लिए या परिवार के सदस्यों की ओर से यह पूजा करा सकता है।" },
    { q: "Do I need to be present?", q_te: "నేను హాజరు కావాలా?", q_hi: "क्या मुझे उपस्थित रहना होगा?",
      a: "No. The priest performs it on your behalf; your sankalpam carries your name, and the video reaches you afterwards.",
      a_te: "అవసరం లేదు. పురోహితుడు మీ తరపున పూజ చేస్తారు; మీ సంకల్పంలో మీ పేరు ఉంటుంది, తర్వాత వీడియో మీకు అందుతుంది.",
      a_hi: "नहीं। पुरोहित आपकी ओर से पूजा करते हैं; आपके संकल्प में आपका नाम रहता है, बाद में वीडियो आपको मिलता है।" },
    { q: "When will I get my video?", q_te: "నా వీడియో ఎప్పుడు వస్తుంది?", q_hi: "मुझे वीडियो कब मिलेगा?",
      a: "Within 24–48 hours of the puja being completed, on the WhatsApp number you provide.",
      a_te: "పూజ పూర్తయిన 24–48 గంటల్లో, మీరు ఇచ్చిన వాట్సాప్ నంబర్‌కు అందుతుంది.",
      a_hi: "पूजा पूर्ण होने के 24–48 घंटों में, आपके दिए गए WhatsApp नंबर पर।" }
  ],
  reviews: [
    { text: "Very well organised puja, and the video was delivered right on time. Truly grateful.",
      text_te: "చాలా చక్కగా నిర్వహించిన పూజ, వీడియో సమయానికి అందింది. చాలా కృతజ్ఞతలు.",
      text_hi: "बहुत अच्छी तरह से आयोजित पूजा, वीडियो समय पर मिला। बहुत आभारी हूँ।",
      name: "Devotee", name_te: "భక్తుడు", name_hi: "भक्त", rating: 5.0 },
    { text: "Thank you for the puja — my family felt truly blessed watching the video.",
      text_te: "పూజకు ధన్యవాదాలు — వీడియో చూస్తూ మా కుటుంబం నిజంగా ఆశీర్వదించబడినట్లు అనిపించింది.",
      text_hi: "पूजा के लिए धन्यवाद — वीडियो देखकर मेरे परिवार को सच में आशीर्वादित महसूस हुआ।",
      name: "Devotee", name_te: "భక్తుడు", name_hi: "भक्त", rating: 5.0 }
  ],
  reviewStats: [
    { n: "500+", t: "Families Blessed", t_te: "కుటుంబాలు ఆశీర్వాదాలు పొందాయి", t_hi: "परिवार आशीर्वादित" },
    { n: "1000+", t: "Pujas Completed Successfully", t_te: "పూజలు విజయవంతంగా పూర్తయ్యాయి", t_hi: "पूजाएँ सफलतापूर्वक पूर्ण" }
  ]
};

/* end of shared defaults */
