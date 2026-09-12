-- 1. PUJAS
ALTER TABLE pujas 
  ADD COLUMN title_te TEXT,
  ADD COLUMN title_hi TEXT,
  ADD COLUMN description_te TEXT,
  ADD COLUMN description_hi TEXT,
  ADD COLUMN about_en TEXT,
  ADD COLUMN about_te TEXT,
  ADD COLUMN about_hi TEXT,
  ADD COLUMN benefits_te TEXT[],
  ADD COLUMN benefits_hi TEXT[],
  ADD COLUMN procedure_te TEXT[],
  ADD COLUMN procedure_hi TEXT[],
  ADD COLUMN highlights_en TEXT[],
  ADD COLUMN highlights_te TEXT[],
  ADD COLUMN highlights_hi TEXT[],
  ADD COLUMN available_languages TEXT[] DEFAULT '{"en"}';

-- 2. PUJA PACKAGES
ALTER TABLE puja_packages 
  RENAME COLUMN name TO name_en;
ALTER TABLE puja_packages
  ADD COLUMN name_te TEXT,
  ADD COLUMN name_hi TEXT,
  ADD COLUMN description_en TEXT,
  ADD COLUMN description_te TEXT,
  ADD COLUMN description_hi TEXT,
  ADD COLUMN benefits_en TEXT[],
  ADD COLUMN benefits_te TEXT[],
  ADD COLUMN benefits_hi TEXT[],
  ADD COLUMN image_url TEXT;

-- 3. TEMPLES
ALTER TABLE temples 
  RENAME COLUMN name TO name_en;
ALTER TABLE temples
  RENAME COLUMN location TO location_en;
ALTER TABLE temples
  RENAME COLUMN description TO description_en;
ALTER TABLE temples
  ADD COLUMN name_te TEXT,
  ADD COLUMN name_hi TEXT,
  ADD COLUMN location_te TEXT,
  ADD COLUMN location_hi TEXT,
  ADD COLUMN description_te TEXT,
  ADD COLUMN description_hi TEXT;

-- 4. FAQS
ALTER TABLE faqs 
  ADD COLUMN question_te TEXT,
  ADD COLUMN question_hi TEXT,
  ADD COLUMN answer_te TEXT,
  ADD COLUMN answer_hi TEXT;

-- 5. TESTIMONIALS
ALTER TABLE testimonials 
  ADD COLUMN city_en TEXT,
  ADD COLUMN city_te TEXT,
  ADD COLUMN city_hi TEXT,
  ADD COLUMN content_en TEXT,
  ADD COLUMN content_te TEXT,
  ADD COLUMN content_hi TEXT,
  ADD COLUMN image_url TEXT;

-- 6. HOMEPAGE HERO SLIDES
ALTER TABLE homepage_hero_slides 
  ADD COLUMN headline_te TEXT,
  ADD COLUMN headline_hi TEXT,
  ADD COLUMN subtext_te TEXT,
  ADD COLUMN subtext_hi TEXT,
  ADD COLUMN cta_label_te TEXT,
  ADD COLUMN cta_label_hi TEXT;

-- 7. GLOBAL SITE SETTINGS / STRINGS (Expand from key/value)
ALTER TABLE site_settings 
  RENAME COLUMN value TO value_en;
ALTER TABLE site_settings
  ADD COLUMN value_te TEXT,
  ADD COLUMN value_hi TEXT;

-- 8. PAGE SECTIONS (For generic text blocks on home page etc.)
CREATE TABLE IF NOT EXISTS page_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_name TEXT NOT NULL,
    section_key TEXT UNIQUE NOT NULL,
    title_en TEXT,
    title_te TEXT,
    title_hi TEXT,
    description_en TEXT,
    description_te TEXT,
    description_hi TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0
);
