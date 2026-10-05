-- ==============================================================================
-- LANGUAGE-WISE WEBSITE CONTENT CMS
-- Safe, normalized architecture for managing global website content.
-- ==============================================================================

-- 1. cms_pages
-- Defines a logical page on the website (e.g., Home, About)
CREATE TABLE IF NOT EXISTS cms_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. cms_sections
-- Defines a specific section/block of content on a page
CREATE TABLE IF NOT EXISTS cms_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID REFERENCES cms_pages(id) ON DELETE CASCADE,
    section_key TEXT UNIQUE NOT NULL, -- e.g., 'home.hero.heading'
    name TEXT NOT NULL,               -- e.g., 'Hero Heading'
    content_type TEXT DEFAULT 'text', -- 'text', 'rich_text', 'image_url', 'link'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add an index to speed up fetching sections for a specific page
CREATE INDEX IF NOT EXISTS idx_cms_sections_page_id ON cms_sections(page_id);

-- 3. cms_translations
-- Stores the language-specific content for each section
CREATE TABLE IF NOT EXISTS cms_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID REFERENCES cms_sections(id) ON DELETE CASCADE,
    lang_code TEXT NOT NULL, -- e.g., 'en', 'te', 'hi'
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(section_id, lang_code) -- Prevents duplicate translations for the same language
);

-- 4. Safe Default Seeding
-- Pre-populate the root pages so the CMS has a structure to attach sections to.
INSERT INTO cms_pages (slug, name) VALUES 
('global', 'Global (Header/Footer)'),
('home', 'Home Page'),
('about', 'About Page'),
('privacy', 'Privacy Policy'),
('terms', 'Terms & Conditions'),
('refund', 'Refund Policy')
ON CONFLICT (slug) DO NOTHING;
