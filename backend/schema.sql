-- SQL Schema for Shubha Sankalpam (Supabase/PostgreSQL)

-- 1. Devotees (User Profiles)
CREATE TABLE IF NOT EXISTS devotees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    city TEXT,
    date_of_birth DATE,
    preferred_language TEXT DEFAULT 'en',
    whatsapp_number TEXT,
    gotra TEXT,
    notes TEXT,
    created_by TEXT DEFAULT 'self',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Temples
CREATE TABLE IF NOT EXISTS temples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    description TEXT,
    image_url TEXT
);

-- 3. Pujas
CREATE TABLE IF NOT EXISTS pujas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title_en TEXT NOT NULL,
    description_en TEXT,
    occasion_tag TEXT,
    temple_id UUID REFERENCES temples(id) ON DELETE SET NULL,
    muhurat TIMESTAMPTZ,
    benefits_en TEXT[],
    procedure_en TEXT[],
    image_url TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    meta_title TEXT,
    meta_description TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Puja Packages
CREATE TABLE IF NOT EXISTS puja_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    puja_id UUID REFERENCES pujas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    max_names INT,
    sort_order INT DEFAULT 0
);

-- 5. Puja Addons
CREATE TABLE IF NOT EXISTS puja_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    puja_id UUID REFERENCES pujas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL
);

-- 6. Testimonials
CREATE TABLE IF NOT EXISTS testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devotee_name TEXT NOT NULL,
    city TEXT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    content TEXT NOT NULL,
    date DATE,
    is_published BOOLEAN DEFAULT FALSE,
    source TEXT DEFAULT 'submitted'
);

-- 7. FAQs
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    puja_id UUID REFERENCES pujas(id) ON DELETE CASCADE, -- Nullable for site-level FAQs
    question_en TEXT NOT NULL,
    answer_en TEXT NOT NULL,
    sort_order INT DEFAULT 0
);

-- 8. Site Settings
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- 9. Homepage Hero Slides
CREATE TABLE IF NOT EXISTS homepage_hero_slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    headline_en TEXT NOT NULL,
    subtext_en TEXT,
    cta_label TEXT,
    cta_link TEXT,
    image_url TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);
