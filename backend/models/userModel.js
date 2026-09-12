/* ================================================================
   USER MODEL — Supabase relational schema implementation, with an
   automatic local-JSON-file fallback when Supabase isn't configured
   (SUPABASE_URL / SUPABASE_SERVICE_KEY left blank in config.js).
   This is the fallback config.js's own comment promises but that
   was never actually implemented — profile edits now genuinely
   persist to backend/users.json instead of silently no-op'ing.
   ================================================================ */
const fs = require("fs");
const path = require("path");
const { supabase } = require("../utils/supabase");
const { clean } = require("../utils/http");

/* ----------------------------------------------------------------
   LOCAL JSON FILE STORE — only used when supabase is not configured.
   Lives at backend/users.json (same folder config.js's DATA_DIR
   points at). Safe to delete any time; it's recreated automatically.
   ---------------------------------------------------------------- */
const DATA_FILE = path.join(__dirname, "..", "users.json");

function readLocalUsers() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return []; // file doesn't exist yet, or is empty/corrupt — start fresh
  }
}

function writeLocalUsers(users) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), "utf8");
}

async function all() {
    if (!supabase) {
        return readLocalUsers().map(u => ({ ...u, booking_count: 0 }));
    }

    // Select devotees and count their bookings
    const { data, error } = await supabase
        .from('devotees')
        .select(`
            *,
            bookings ( id )
        `)
        .order('created_at', { ascending: false });
        
    if (error) {
        console.error("Error fetching devotees:", error);
        return [];
    }
    
    return data.map(d => ({
        ...d,
        booking_count: d.bookings ? d.bookings.length : 0
    }));
}

async function createManualDevotee(raw) {
    const phone = clean(raw.phone, 20);
    const name = clean(raw.name, 100);
    if (!phone || !name) return null;

    if (!supabase) {
        const users = readLocalUsers();
        const record = {
            phone,
            name,
            email: clean(raw.email, 150) || null,
            city: clean(raw.city, 100) || null,
            date_of_birth: raw.dob || null,
            whatsapp_number: clean(raw.whatsapp, 20) || null,
            gotra: clean(raw.gotra, 100) || null,
            created_by: 'admin',
            created_at: new Date().toISOString()
        };
        const idx = users.findIndex(u => u.phone === phone);
        if (idx > -1) users[idx] = { ...users[idx], ...record };
        else users.push(record);
        writeLocalUsers(users);
        return record;
    }
    
    const { data, error } = await supabase.from('devotees').upsert([{
        phone: phone,
        name: name,
        email: clean(raw.email, 150) || null,
        city: clean(raw.city, 100) || null,
        date_of_birth: raw.dob || null,
        whatsapp_number: clean(raw.whatsapp, 20) || null,
        gotra: clean(raw.gotra, 100) || null
    }], { onConflict: 'phone' }).select().single();
    
    if (error) {
        console.error("Error creating devotee:", error);
        return null;
    }
    
    return data;
}

async function findOrCreate(phone, defaults = {}) {
    const p = clean(phone, 20);
    if (!p) return null;

    if (!supabase) {
        const users = readLocalUsers();
        const existing = users.find(u => u.phone === p);
        if (existing) return existing;

        const record = {
            phone: p,
            name: clean(defaults.name, 100) || "Devotee",
            email: null,
            city: null,
            date_of_birth: null,
            whatsapp_number: null,
            gotra: null,
            created_by: 'system',
            created_at: new Date().toISOString()
        };
        users.push(record);
        writeLocalUsers(users);
        return record;
    }

    // First try to find existing so we don't overwrite their profile with nulls
    const { data: existing } = await supabase.from('devotees').select('*').eq('phone', p).single();
    if (existing) return existing;

    // If not found, create new
    const { data, error } = await supabase.from('devotees').upsert([{
        phone: p,
        name: clean(defaults.name, 100) || "Devotee"
    }], { onConflict: 'phone' }).select().single();
    
    if (error) {
        console.error("Error finding/creating user:", error);
        return { phone: p };
    }
    
    return data;
}

async function updateDevotee(phone, raw) {
    const p = clean(phone, 20);

    if (!supabase) {
        const users = readLocalUsers();
        let idx = users.findIndex(u => u.phone === p);
        if (idx === -1) {
            // shouldn't normally happen (findOrCreate runs first via getMe),
            // but create the record defensively rather than fail the update
            users.push({ phone: p, created_by: 'system', created_at: new Date().toISOString() });
            idx = users.length - 1;
        }

        const updates = {};
        if (raw.name  !== undefined) updates.name             = clean(raw.name, 100)  || null;
        if (raw.email !== undefined) updates.email            = clean(raw.email, 150) || null;
        if (raw.gotra !== undefined) updates.gotra            = clean(raw.gotra, 100) || null;
        if (raw.city  !== undefined) updates.city             = clean(raw.city, 100)  || null;
        if (raw.whatsapp !== undefined) updates.whatsapp_number = clean(raw.whatsapp, 20) || null;
        if (raw.dob   !== undefined) updates.date_of_birth   = raw.dob || null;
        if (raw.phone !== undefined && clean(raw.phone, 20) !== p) {
            updates.phone = clean(raw.phone, 20);
        }

        users[idx] = { ...users[idx], ...updates };
        writeLocalUsers(users);
        return users[idx];
    }

    const updates = {};
    if (raw.name  !== undefined) updates.name             = clean(raw.name, 100)  || null;
    if (raw.email !== undefined) updates.email            = clean(raw.email, 150) || null;
    if (raw.gotra !== undefined) updates.gotra            = clean(raw.gotra, 100) || null;
    if (raw.city  !== undefined) updates.city             = clean(raw.city, 100)  || null;
    if (raw.whatsapp !== undefined) updates.whatsapp_number = clean(raw.whatsapp, 20) || null;
    if (raw.dob   !== undefined) updates.date_of_birth   = raw.dob || null;
    // Allow phone number change (rename the record)
    if (raw.phone !== undefined && clean(raw.phone, 20) !== p) {
        updates.phone = clean(raw.phone, 20);
    }

    // If nothing to update, just return the existing record
    if (Object.keys(updates).length === 0) {
        const { data: existing } = await supabase.from('devotees').select('*').eq('phone', p).single();
        return existing || { phone: p };
    }
    
    const { data, error } = await supabase.from('devotees').update(updates).eq('phone', p).select().single();
    if (error) {
        console.error("Error updating user:", error);
        return { phone: p };
    }
    return data;
}

async function deleteDevotee(phone) {
    const p = clean(phone, 20);

    if (!supabase) {
        const users = readLocalUsers();
        const filtered = users.filter(u => u.phone !== p);
        writeLocalUsers(filtered);
        return true;
    }

    const { error } = await supabase.from('devotees').delete().eq('phone', p);
    if (error) {
        console.error("Error deleting devotee:", error);
        return false;
    }
    return true;
}

module.exports = {
  all, createManualDevotee, findOrCreate, updateDevotee, deleteDevotee
};