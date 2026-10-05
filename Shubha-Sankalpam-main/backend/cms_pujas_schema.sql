
-- Supabase Schema for Pujas, Packages, and Temples

CREATE TABLE IF NOT EXISTS cms_pujas (
    id TEXT PRIMARY KEY,
    base_id TEXT NOT NULL,
    language TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    temple TEXT,
    date TEXT,
    muhurat TEXT,
    price INTEGER NOT NULL,
    base_price INTEGER,
    cat TEXT,
    image TEXT,
    detail JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_te TEXT,
    name_hi TEXT,
    description TEXT,
    description_te TEXT,
    description_hi TEXT,
    temple TEXT,
    date TEXT,
    muhurat TEXT,
    price INTEGER NOT NULL,
    media JSONB,
    badge TEXT,
    detail JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_temples (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_te TEXT,
    name_hi TEXT,
    blurb_en TEXT,
    blurb_te TEXT,
    blurb_hi TEXT,
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
