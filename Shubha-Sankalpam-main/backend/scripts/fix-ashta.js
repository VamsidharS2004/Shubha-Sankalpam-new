const { supabase } = require("../utils/supabase.js");

async function fixAshta() {
  await supabase.from('pujas').update({
    name_en: 'Ashtabhairava Apaduddharaka Raksha Homam',
    desc_en: 'Kalashtami Special - Homam to the eight Bhairavas with 8kg of black pepper amidst Bhairava moola mantras, for protection from dangers.',
    temple_en: 'Vikranta Bhairava Temple',
    mantra_en: 'OM BHAIRAVAYA NAMAHA',
    about_en: 'Kalashtami is an auspicious day dedicated to Kalabhairava, the fierce protective form of Lord Shiva. In this powerful homam, performed with your name and gotram, 8kg of black pepper is offered as havis to the eight Bhairavas while Vedic scholars chant the Bhairava moola mantra, seeking protection from accidents, obstacles, and negative energies.',
    tradition_en: 'Shaiva Tantric Tradition',
    duration_en: 'Approx. 2.5 hours',
    for_whom_en: 'Individual or Family',

    name_hi: 'अष्टभैरव आपदुद्धारक रक्षा होमम',
    desc_hi: 'कालाष्टमी विशेष - भैरव मूलमंत्र के बीच 8 किलो काली मिर्च से अष्टभैरव को आहुति, संकटों से रक्षा के लिए।',
    temple_hi: 'विक्रांत भैरव मंदिर',
    mantra_hi: 'ॐ भैरवाय नमः',
    about_hi: 'कालाष्टमी भगवान शिव के उग्र रक्षक रूप कालभैरव को समर्पित एक शुभ दिन है। इस शक्तिशाली होमम में, आपके नाम और गोत्र के साथ, वैदिक विद्वानों द्वारा भैरव मूल मंत्र का जाप करते हुए आठ भैरवों को 8 किलो काली मिर्च की आहुति दी जाती है, जो दुर्घटनाओं, बाधाओं और नकारात्मक ऊर्जाओं से सुरक्षा प्रदान करती है।',
    tradition_hi: 'शैव तांत्रिक परंपरा',
    duration_hi: 'लगभग 2.5 घंटे',
    for_whom_hi: 'व्यक्तिगत या परिवार'
  }).eq('id', 'Ashtabhaiava Homam');
  console.log('Fixed Ashtabhairava Homam');
}
fixAshta();
