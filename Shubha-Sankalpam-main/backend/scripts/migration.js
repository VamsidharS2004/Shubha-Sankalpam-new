const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = require('../config.js');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase config. Check backend/.env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function loadContent(filename) {
  const filepath = path.join(__dirname, '../../frontend/content', filename);
  if (!fs.existsSync(filepath)) return null;
  const content = fs.readFileSync(filepath, 'utf8');
  let exported = {};
  const mockModule = { exports: exported };
  try {
      const wrapped = `
        const module = arguments[0];
        ${content}
        if (typeof pujas !== 'undefined') module.exports.pujas = pujas;
        if (typeof packages !== 'undefined') module.exports.packages = packages;
        if (typeof TEMPLES !== 'undefined') module.exports.TEMPLES = TEMPLES;
        if (typeof FAQS !== 'undefined') module.exports.FAQS = FAQS;
        if (typeof TESTIMONIALS !== 'undefined') module.exports.TESTIMONIALS = TESTIMONIALS;
        if (typeof SITE !== 'undefined') module.exports.SITE = SITE;
        if (typeof WHY_US !== 'undefined') module.exports.WHY_US = WHY_US;
        if (typeof TRUST_ITEMS !== 'undefined') module.exports.TRUST_ITEMS = TRUST_ITEMS;
      `;
      const fn = new Function(wrapped);
      fn(mockModule);
      return mockModule.exports;
  } catch (e) {
      console.error("Failed to load", filename, e.message);
      return {};
  }
}

async function runMigration() {
  console.log("Starting Migration...");

  const { SITE } = loadContent('site-settings.js') || {};
  if (SITE) {
    console.log("Migrating site settings...");
    for (const [key, value] of Object.entries(SITE)) {
      if (typeof value === 'string') {
        await supabase.from('site_settings').upsert({ setting_key: key, value_en: value });
      }
    }
  }

  const { TESTIMONIALS } = loadContent('testimonials.js') || {};
  if (TESTIMONIALS) {
    console.log("Migrating testimonials...");
    const len = Math.max(TESTIMONIALS.en?.length||0, TESTIMONIALS.te?.length||0, TESTIMONIALS.hi?.length||0);
    for (let i=0; i<len; i++) {
        const en = TESTIMONIALS.en?.[i] || {};
        const te = TESTIMONIALS.te?.[i] || {};
        const hi = TESTIMONIALS.hi?.[i] || {};
        await supabase.from('testimonials').insert({
            name_en: en.name, name_te: te.name, name_hi: hi.name,
            location_en: en.location, location_te: te.location, location_hi: hi.location,
            text_en: en.text, text_te: te.text, text_hi: hi.text,
            rating: en.rating || 5,
            display_order: i
        });
    }
  }

  const { FAQS } = loadContent('faq.js') || {};
  if (FAQS) {
      console.log("Migrating FAQs...");
      const len = Math.max(FAQS.en?.length||0, FAQS.te?.length||0, FAQS.hi?.length||0);
      for (let i=0; i<len; i++) {
          const en = FAQS.en?.[i] || {};
          const te = FAQS.te?.[i] || {};
          const hi = FAQS.hi?.[i] || {};
          await supabase.from('faqs').insert({
              type: 'home',
              q_en: en.q, q_te: te.q, q_hi: hi.q,
              a_en: en.a, a_te: te.a, a_hi: hi.a,
              display_order: i
          });
      }
  }

  const { TEMPLES } = loadContent('temples.js') || {};
  if (TEMPLES) {
      console.log("Migrating temples...");
      for (let i=0; i<TEMPLES.length; i++) {
          const t = TEMPLES[i];
          await supabase.from('temples').insert({
              name_en: t.name, name_te: t.name_te, name_hi: t.name_hi,
              blurb_en: t.blurb, blurb_te: t.blurb_te, blurb_hi: t.blurb_hi,
              image: t.image,
              display_order: i
          });
      }
  }

  const { pujas } = loadContent('pujas.js') || {};
  if (pujas) {
      console.log("Migrating pujas...");
      const pujaGroups = {};
      pujas.forEach(p => {
          const rawId = p.id || p.name;
          const langMatch = rawId.match(/-(en|te|hi)$/);
          let baseId = rawId;
          let lang = p.language || 'en';
          
          if (langMatch) {
              baseId = rawId.replace(/-(en|te|hi)$/, '');
              lang = langMatch[1];
          }
          
          if (!pujaGroups[baseId]) pujaGroups[baseId] = { id: baseId, langs: [] };
          pujaGroups[baseId][lang] = p;
          if(!pujaGroups[baseId].langs.includes(lang)) pujaGroups[baseId].langs.push(lang);
      });

      for (const [baseId, data] of Object.entries(pujaGroups)) {
          const en = data.en || data.te || data.hi || {};
          const te = data.te || {};
          const hi = data.hi || {};
          
          await supabase.from('pujas').upsert({
              id: baseId,
              name_en: data.en?.name || en.name,
              name_te: data.te?.name || '',
              name_hi: data.hi?.name || '',
              desc_en: data.en?.desc || en.desc,
              desc_te: data.te?.desc || '',
              desc_hi: data.hi?.desc || '',
              temple_en: data.en?.temple || en.temple,
              temple_te: data.te?.temple || '',
              temple_hi: data.hi?.temple || '',
              date: en.date,
              muhurat: en.muhurat,
              price: en.price,
              base_price: en.basePrice,
              cat: en.cat,
              image: en.image,
              mantra_en: data.en?.detail?.mantra || en.detail?.mantra,
              mantra_te: data.te?.detail?.mantra || '',
              mantra_hi: data.hi?.detail?.mantra || '',
              about_en: data.en?.detail?.about || en.detail?.about,
              about_te: data.te?.detail?.about || '',
              about_hi: data.hi?.detail?.about || '',
              tradition_en: data.en?.detail?.tradition || en.detail?.tradition,
              tradition_te: data.te?.detail?.tradition || '',
              tradition_hi: data.hi?.detail?.tradition || '',
              duration_en: data.en?.detail?.duration || en.detail?.duration,
              duration_te: data.te?.detail?.duration || '',
              duration_hi: data.hi?.detail?.duration || '',
              for_whom_en: data.en?.detail?.forWhom || en.detail?.forWhom,
              for_whom_te: data.te?.detail?.forWhom || '',
              for_whom_hi: data.hi?.detail?.forWhom || '',
              available_languages: data.langs
          });
      }
  }
  
  const { packages } = loadContent('packages.js') || {};
  if (packages) {
      console.log("Migrating packages...");
      for(let i=0; i<packages.length; i++){
          const p = packages[i];
          await supabase.from('packages').insert({
              name_en: p.name, name_te: p.name_te, name_hi: p.name_hi,
              desc_en: p.desc, desc_te: p.desc_te, desc_hi: p.desc_hi,
              temple: p.temple, date: p.date, muhurat: p.muhurat,
              price: p.price, media: p.media, badge: p.badge,
              mantra_en: p.detail?.mantra, about_en: p.detail?.about,
              display_order: i
          });
      }
  }

  console.log("Migration completed.");
}

runMigration().catch(console.error);
