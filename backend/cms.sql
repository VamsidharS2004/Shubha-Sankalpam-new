-- CMS Tables for Pujas and Packages

-- 1. Pujas Table
CREATE TABLE IF NOT EXISTS pujas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_te TEXT,
    name_hi TEXT,
    "desc" TEXT NOT NULL,
    desc_te TEXT,
    desc_hi TEXT,
    temple TEXT,
    date TEXT,
    muhurat TEXT,
    price INTEGER NOT NULL,
    cat TEXT DEFAULT 'All',
    image TEXT,
    detail JSONB,
    sort_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Packages Table
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_te TEXT,
    name_hi TEXT,
    "desc" TEXT NOT NULL,
    desc_te TEXT,
    desc_hi TEXT,
    temple TEXT,
    price INTEGER NOT NULL,
    cat TEXT DEFAULT 'All',
    badge TEXT,
    image TEXT,
    detail JSONB,
    sort_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to auto-update updated_at
DROP TRIGGER IF EXISTS update_pujas_modtime ON pujas;
CREATE TRIGGER update_pujas_modtime
    BEFORE UPDATE ON pujas
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_packages_modtime ON packages;
CREATE TRIGGER update_packages_modtime
    BEFORE UPDATE ON packages
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
