/* ================================================================
   SACRED TEMPLES — the "Temples We Serve" section on the home page
   ================================================================
   ⭐ EDIT THE TEMPLE LIST BELOW ⭐

   These are drawn from the temples already referenced in your
   pujas (see content/pujas.js) — this file just gives each one a
   short description and a spot on the home page, rather than
   inventing anything new. If you add a puja at a new temple, add
   it here too so it appears in this section.

   Each temple needs: name, name_te, name_hi, blurb (one line),
   blurb_te, blurb_hi, and an "img" key from IMAGE_THEMES
   (assets/js/cards.js) or your own photo path once you have one.
   ================================================================ */

const TEMPLES = [
  {
    name: "శ్రీ వేంకటేశ్వర స్వామి ఆలయం",
    name_te: "వేంకటేశ్వర స్వామి ఆలయం",
    name_hi: "वेंकटेश्वर स्वामी मंदिर",
    blurb: "Home to pujas performed for prosperity, protection, and divine grace.",
    blurb_te: "సంపద, రక్షణ మరియు దైవానుగ్రహం కోసం పూజలు నిర్వహించే ఆలయం.",
    blurb_hi: "समृद्धि, सुरक्षा और दिव्य कृपा के लिए पूजा की जाने वाली जगह।",
    image: "assets/images/temples/venkateswara.jpg"
  },
  {
    name: "Maha Mrityunjaya Mahadev Mandir, Kashi",
    name_te: "మహా మృత్యుంజయ మహాదేవ్ మందిర్, కాశీ",
    name_hi: "महा मृत्युंजय महादेव मंदिर, काशी",
    blurb: "One of Kashi's most revered sites for longevity and protection rituals.",
    blurb_te: "దీర్ఘాయువు మరియు రక్షణ కోసం కాశీలోని అత్యంత పవిత్రమైన ఆలయాలలో ఒకటి.",
    blurb_hi: "दीर्घायु और सुरक्षा अनुष्ठानों के लिए काशी के सबसे पूजनीय स्थलों में से एक।",
    image: "assets/images/temples/mrityunjaya.jpg"
  },
  {
    name: "Anjaneya Swamy Temple",
    name_te: "ఆంజనేయ స్వామి ఆలయం",
    name_hi: "आंजनेय स्वामी मंदिर",
    blurb: "A sacred site for pujas seeking courage, strength, and protection.",
    blurb_te: "ధైర్యం, శక్తి మరియు రక్షణ కోసం పూజలు నిర్వహించే పవిత్ర స్థలం.",
    blurb_hi: "साहस, शक्ति और सुरक्षा की कामना करने वाली पूजाओं के लिए पवित्र स्थल।",
    image: "assets/images/temples/anjaneya.jpg"
  },
  {
    name: "Basaveshwara Temple, Kukke Kshetra",
    name_te: "బసవేశ్వర ఆలయం, కుక్కె క్షేత్రం",
    name_hi: "बसवेश्वर मंदिर, कुक्के क्षेत्र",
    blurb: "A revered kshetra for homams performed for family well-being.",
    blurb_te: "కుటుంబ శ్రేయస్సు కోసం హోమాలు నిర్వహించే పూజనీయ క్షేత్రం.",
    blurb_hi: "पारिवारिक कल्याण के लिए होम किए जाने वाला पूजनीय क्षेत्र।",
    image: "assets/images/temples/kukke.jpg"
  },
  {
    name: "Bhu Varaha Swamy Temple",
    name_te: "భూ వరాహ స్వామి ఆలయం",
    name_hi: "भू वराह स्वामी मंदिर",
    blurb: "Known for homams performed for stability and life's obstacles.",
    blurb_te: "స్థిరత్వం మరియు జీవితంలో అవరోధాల నివారణ కోసం హోమాలకు ప్రసిద్ధి.",
    blurb_hi: "स्थिरता और जीवन की बाधाओं के निवारण के लिए होम हेतु प्रसिद्ध।",
    image: "assets/images/temples/varaha.jpg"
  },
  {
    name: "Sri Bhramarambika Sametha Malleshwara Swamy Temple",
    name_te: "శ్రీ భ్రమరాంబికా సమేత మల్లేశ్వర స్వామి ఆలయం",
    name_hi: "श्री भ्रमराम्बिका समेत मल्लेश्वर स्वामी मंदिर",
    blurb: "A Guntur-region temple for seva performed for spiritual merit and peace.",
    blurb_te: "ఆధ్యాత్మిక పుణ్యం మరియు శాంతి కోసం సేవలు నిర్వహించే గుంటూరు ప్రాంత ఆలయం.",
    blurb_hi: "आध्यात्मिक पुण्य और शांति के लिए सेवा करने वाला गुंटूर क्षेत्र का मंदिर।",
    image: "assets/images/temples/malleshwara.jpg"
  }
];

/* Also readable by the backend for server-side validation */
if (typeof module !== "undefined") module.exports = { TEMPLES };

/* end of temples list */
