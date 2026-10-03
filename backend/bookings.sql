-- SQL Schema for Bookings (Supabase/PostgreSQL)

DROP TABLE IF EXISTS booking_names CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devotee_phone TEXT REFERENCES devotees(phone) ON UPDATE CASCADE ON DELETE SET NULL,
    puja_id UUID REFERENCES pujas(id) ON DELETE SET NULL,
    package_id UUID REFERENCES puja_packages(id) ON DELETE SET NULL,
    price NUMERIC NOT NULL,
    status TEXT DEFAULT 'Confirmed',
    payment_status TEXT DEFAULT 'Pending',
    source TEXT DEFAULT 'Manual',
    notes TEXT,
    video_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Note: If updating an existing database, run:
-- ALTER TABLE bookings ADD COLUMN video_url TEXT;

CREATE TABLE IF NOT EXISTS booking_names (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    gotra TEXT,
    rashi TEXT,
    nakshatra TEXT
);

-- Grant privileges so the API can insert/read
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
