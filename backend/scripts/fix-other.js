const { supabase } = require("../utils/supabase.js");

async function fixOtherPujas() {
  await supabase.from('pujas').update({
    name_en: 'Navanaga Homam',
    desc_en: 'Special Navanaga Homam to appease the nine serpent deities for removal of Sarpa Dosha, Naga Dosha, and for overall prosperity.',
    temple_en: 'Sri Naga Devata Temple',
    mantra_en: 'OM NAVANAGAYA NAMAHA',
    about_en: 'Navanaga Homam is a powerful Vedic ritual dedicated to the nine prominent serpent deities (Nagas). It is performed to neutralize the malefic effects of Sarpa Dosha, Kaal Sarp Dosha, and Rahu-Ketu afflictions in one\'s horoscope. Participating in this homam brings peace, health, fertility, and removes obstacles in marriage and career.',
    tradition_en: 'Vedic Tradition',
    duration_en: 'Approx. 2 hours',
    for_whom_en: 'Individual or Family',

    name_hi: 'नवनाग होमम',
    desc_hi: 'सर्प दोष, नाग दोष के निवारण और समग्र समृद्धि के लिए नौ सर्प देवताओं को प्रसन्न करने के लिए विशेष नवनाग होमम।',
    temple_hi: 'श्री नाग देवता मंदिर',
    mantra_hi: 'ॐ नवनागाय नमः',
    about_hi: 'नवनाग होमम नौ प्रमुख सर्प देवताओं (नागों) को समर्पित एक शक्तिशाली वैदिक अनुष्ठान है। यह किसी की कुंडली में सर्प दोष, काल सर्प दोष और राहु-केतु के अशुभ प्रभावों को बेअसर करने के लिए किया जाता है। इस होमम में भाग लेने से शांति, स्वास्थ्य, प्रजनन क्षमता आती है और विवाह और करियर में आने वाली बाधाएं दूर होती हैं।',
    tradition_hi: 'वैदिक परंपरा',
    duration_hi: 'लगभग 2 घंटे',
    for_whom_hi: 'व्यक्तिगत या परिवार'
  }).eq('id', 'నవనాగ హోమం');

  await supabase.from('pujas').update({
    name_en: 'Bhu Varaha Homam & Mahabhishekam',
    desc_en: 'Sacred Homam and Mahabhishekam to Lord Bhu Varaha Swamy for property acquisition, wealth, and removal of debts.',
    temple_en: 'Sri Bhu Varaha Swamy Temple',
    mantra_en: 'OM BHU VARAHAYA NAMAHA',
    about_en: 'Lord Varaha, the boar incarnation of Lord Vishnu, rescued Goddess Earth (Bhudevi) from the cosmic ocean. Performing Bhu Varaha Homam and Mahabhishekam is highly recommended for those seeking success in real estate, resolving property disputes, acquiring own house, and clearing stubborn debts.',
    tradition_en: 'Vaishnava Vedic Tradition',
    duration_en: 'Approx. 3 hours',
    for_whom_en: 'Individual or Family',

    name_hi: 'भू वराह होमम और महाभिषेकम',
    desc_hi: 'संपत्ति प्राप्ति, धन और ऋण मुक्ति के लिए भगवान भू वराह स्वामी को पवित्र होमम और महाभिषेकम।',
    temple_hi: 'श्री भू वराह स्वामी मंदिर',
    mantra_hi: 'ॐ भू वराहाय नमः',
    about_hi: 'भगवान वराह, भगवान विष्णु के सूअर अवतार, ने ब्रह्मांडीय महासागर से देवी पृथ्वी (भूदेवी) को बचाया था। भू वराह होमम और महाभिषेकम करना उन लोगों के लिए अत्यधिक अनुशंसित है जो अचल संपत्ति में सफलता प्राप्त करना चाहते हैं, संपत्ति विवादों को सुलझाना चाहते हैं, अपना घर प्राप्त करना चाहते हैं और जिद्दी ऋणों को चुकाना चाहते हैं।',
    tradition_hi: 'वैष्णव वैदिक परंपरा',
    duration_hi: 'लगभग 3 घंटे',
    for_whom_hi: 'व्यक्तिगत या परिवार'
  }).eq('id', 'భూ వరాహ హోమం & మహాభిషేకం');

  console.log('Fixed Navanaga and Bhu Varaha');
}
fixOtherPujas();
