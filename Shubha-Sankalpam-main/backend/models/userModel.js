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
const { clean, normalizePhone } = require("../utils/http");

/* ----------------------------------------------------------------
   LOCAL JSON FILE STORE — only used when supabase is not configured.
   Lives at backend/users.json (same folder config.js's DATA_DIR
   points at). Safe to delete any time; it's recreated automatically.
   ---------------------------------------------------------------- */
const DATA_FILE = path.join(__dirname, "..", "users.json");

function readLocalUsers() {
  try { const data=JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));if(!Array.isArray(data))throw new Error('Invalid data store');return data; }
  catch(e){if(e.code==='ENOENT')return [];throw new Error('Cannot read local records; the existing file was preserved.');}
}

function writeLocalUsers(rows) {
  const temporary=DATA_FILE+'.tmp';
  const fd=fs.openSync(temporary,'w',0o600);
  try{fs.writeFileSync(fd,JSON.stringify(rows,null,2),'utf8');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  fs.renameSync(temporary,DATA_FILE);
}

async function all() {
    if (!supabase) {
        return readLocalUsers().map(u => ({ ...u, booking_count: 0 }));
    }

    // Select devotees and count their bookings
    const data = await require("../utils/pagedRead").pagedRead(() => supabase
        .from('devotees')
        .select(`
            *,
            bookings ( id )
        `)
        .order('created_at', { ascending: false }).order("phone", { ascending: true }));
    
    return data.map(d => ({
        ...d,
        booking_count: d.bookings ? d.bookings.length : 0
    }));
}

async function createManualDevotee(raw) {
    const phone = normalizePhone(raw.phone);
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
    const p = normalizePhone(phone);
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
        if (defaults.signup) await require("./leadModel").signup(p, defaults.signupRef);
        return record;
    }

    // First try to find existing so we don't overwrite their profile with nulls
    const { data: existing, error: lookupError } = await supabase.from('devotees').select('*').eq('phone', p).maybeSingle();
    if(lookupError){const e=new Error('Profile lookup failed; existing profile was preserved.');e.status=503;throw e;}
    if (existing) return existing;

    // If not found, create new
    const { data, error } = await supabase.from('devotees').upsert([{
        phone: p,
        name: clean(defaults.name, 100) || "Devotee"
    }], { onConflict: 'phone', ignoreDuplicates: true }).select().maybeSingle();
    
    if (error) {
        console.error("Error finding/creating user:", error);
        const e=new Error('Profile could not be saved. Please retry.');e.status=503;throw e;
    }
    
    if (defaults.signup) await require("./leadModel").signup(p, defaults.signupRef);
    if(!data){const {data:concurrent,error:readError}=await supabase.from('devotees').select('*').eq('phone',p).single();if(readError)throw new Error('Profile could not be loaded.');return concurrent;}
    return data;
}

async function updateDevotee(phone, raw) {
    const p = normalizePhone(phone);

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
        if (raw.phone !== undefined && normalizePhone(raw.phone) !== p) {
            updates.phone = normalizePhone(raw.phone);
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
    if (raw.phone !== undefined && normalizePhone(raw.phone) !== p) {
        updates.phone = normalizePhone(raw.phone);
    }

    // If nothing to update, just return the existing record
    if (Object.keys(updates).length === 0) {
        const { data: existing } = await supabase.from('devotees').select('*').eq('phone', p).single();
        return existing || { phone: p };
    }
    
    const { data, error } = await supabase.from('devotees').update(updates).eq('phone', p).select().single();
    if (error) {
        console.error("Error updating user:", error);
        const e=new Error('Profile could not be saved. Please retry.');e.status=503;throw e;
    }
    return data;
}

async function deleteDevotee(phone) {
    const p = normalizePhone(phone);

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