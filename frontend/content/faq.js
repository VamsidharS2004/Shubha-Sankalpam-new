/* ================================================================
   HOMEPAGE FAQ — the "Doubts? We're Here." accordion at the
   bottom of the home page
   ================================================================
   ⭐ EDIT THE QUESTIONS/ANSWERS BELOW ⭐

   There are three sections: en (English), te (Telugu), hi (Hindi).
   Each is a list of { q: "question", a: "answer" } pairs shown in
   that language. Add, remove, or edit any question/answer pair —
   the accordion updates automatically. Keep the same NUMBER of
   questions across all three languages if possible, so switching
   languages doesn't change how many questions are shown.

   (Note: this is the general homepage FAQ. Each individual puja's
   OWN FAQ — the one on its details page — lives with that puja in
   content/pujas.js instead, so it can be specific to that puja.)
   ================================================================ */

const FAQS = {
  en: [
    { q: "What is an online puja and how does it work?",
      a: "You book a puja on our platform and experienced priests perform it at the temple on your behalf, with your name and gotram included in the sankalpam. You then receive a personalised video on WhatsApp." },
    { q: "Do I need to be present during the puja?",
      a: "No. The priest performs the ritual on your behalf. Your participation is through the sankalpam taken in your name, and the video you receive afterwards." },
    { q: "Can I book for family members or from abroad?",
      a: "Yes. You can add family members' names during booking, and devotees anywhere in the world can book — the video is delivered on WhatsApp regardless of location." },
    { q: "When will I receive my puja video?",
      a: "Typically within 24–48 hours after the puja is completed. Large pujas with many participants may take slightly longer." },
    { q: "What payment methods are accepted?",
      a: "Payment is made by scanning the UPI QR code shown after booking — it works with GPay, PhonePe, Paytm, and every UPI app." }
  ],
  te: [
    { q: "ఆన్‌లైన్ పూజ అంటే ఏమిటి? ఎలా జరుగుతుంది?",
      a: "మీరు మా వేదికలో పూజ బుక్ చేస్తారు; అనుభవజ్ఞులైన పురోహితులు మీ పేరు, గోత్రంతో సంకల్పం చేసి దేవాలయంలో పూజ నిర్వహిస్తారు. వ్యక్తిగత వీడియో వాట్సాప్‌లో అందుతుంది." },
    { q: "పూజ సమయంలో నేను ఉండాలా?",
      a: "అవసరం లేదు. పురోహితుడు మీ తరపున పూజ చేస్తారు. మీ పేరుతో సంకల్పం జరుగుతుంది; తర్వాత వీడియో అందుతుంది." },
    { q: "కుటుంబ సభ్యుల కోసం లేదా విదేశాల నుండి బుక్ చేయవచ్చా?",
      a: "అవును. బుకింగ్ సమయంలో కుటుంబ సభ్యుల పేర్లు జోడించవచ్చు. ప్రపంచంలో ఎక్కడి నుండైనా బుక్ చేయవచ్చు." },
    { q: "పూజ వీడియో ఎప్పుడు వస్తుంది?",
      a: "సాధారణంగా పూజ పూర్తయిన 24–48 గంటల్లో." },
    { q: "ఏ చెల్లింపు మార్గాలు అంగీకరిస్తారు?",
      a: "బుకింగ్ తర్వాత చూపించే UPI QR కోడ్ స్కాన్ చేసి చెల్లించవచ్చు — GPay, PhonePe, Paytm అన్నింటిలో పనిచేస్తుంది." }
  ],
  hi: [
    { q: "ऑनलाइन पूजा क्या है और कैसे होती है?",
      a: "आप हमारे मंच पर पूजा बुक करते हैं; अनुभवी पुरोहित आपके नाम व गोत्र से संकल्प लेकर मंदिर में पूजा करते हैं। व्यक्तिगत वीडियो WhatsApp पर मिलता है।" },
    { q: "क्या पूजा के समय मुझे उपस्थित रहना होगा?",
      a: "नहीं। पुरोहित आपकी ओर से पूजा करते हैं और बाद में वीडियो मिलता है।" },
    { q: "क्या परिवार के लिए या विदेश से बुक कर सकते हैं?",
      a: "हाँ। बुकिंग के समय परिवार के नाम जोड़ सकते हैं। दुनिया में कहीं से भी बुक करें।" },
    { q: "पूजा वीडियो कब मिलेगा?",
      a: "आमतौर पर पूजा पूरी होने के 24–48 घंटे में।" },
    { q: "कौन से भुगतान तरीके स्वीकार हैं?",
      a: "बुकिंग के बाद दिखने वाला UPI QR कोड स्कैन करके भुगतान करें — GPay, PhonePe, Paytm सभी में चलता है।" }
  ]
};

/* end of homepage FAQ */
