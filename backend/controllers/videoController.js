const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { send } = require('../utils/http');

function getTempDir() {
  const dir = path.join(__dirname, '..', 'uploads', 'temp');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/* Big videos go from the admin's browser STRAIGHT to Supabase Storage (resumable upload, 6 MB pieces), so they
   never pass through this server (a serverless host cannot hold a multi-GB file). This endpoint only checks the
   admin password and hands the browser what it needs; /finish confirms the file arrived and returns its public URL. */
const BUCKET = 'media';
const ALLOWED_EXT = ['mp4', 'mov', 'webm', 'm4v', 'mkv'];

async function startVideoUpload(req, res, url) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = require('../config');
  const { supabase: activeSupabase } = require('../utils/supabase');
  if (!activeSupabase || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) return send(res, 503, { error: 'Storage configuration missing' });

  let ext = String((url && url.searchParams.get('ext')) || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!ALLOWED_EXT.includes(ext)) ext = 'mp4';
  const uploadId = crypto.randomUUID();
  send(res, 200, {
    success: true,
    uploadId,
    bucket: BUCKET,
    objectName: `videos/${uploadId}.${ext}`,
    endpoint: `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/upload/resumable`,
    token: SUPABASE_SERVICE_KEY /* admin-only endpoint: the key goes only to a logged-in admin's browser */
  });
}

async function uploadVideoChunk(req, res, url) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  
  const q = url.searchParams;
  const uploadId = q.get('id');
  const chunkIndex = parseInt(q.get('index'), 10);
  const chunkSize = parseInt(q.get('size'), 10);
  
  if (!uploadId || isNaN(chunkIndex) || isNaN(chunkSize)) {
    return send(res, 400, { error: 'Missing chunk metadata' });
  }

  if (!/^[0-9a-f-]{36}$/i.test(uploadId)) return send(res, 400, { error: 'Bad upload ID' });
  const tempPath = path.join(getTempDir(), uploadId);
  if (!fs.existsSync(tempPath)) {
    return send(res, 404, { error: 'Upload session not found' });
  }

  // 1.5 GB limit check
  const MAX_BYTES = 1.5 * 1024 * 1024 * 1024;

  const buffers = [];
  let bytesReceived = 0;

  req.on('data', chunk => {
    buffers.push(chunk);
    bytesReceived += chunk.length;
  });

  req.on('end', () => {
    const chunkBuffer = Buffer.concat(buffers);
    const offset = chunkIndex * chunkSize;
    
    if (offset + chunkBuffer.length > MAX_BYTES) {
      return send(res, 413, { error: 'File size exceeds 1.5 GB limit' });
    }

    try {
      const fd = fs.openSync(tempPath, 'r+');
      fs.writeSync(fd, chunkBuffer, 0, chunkBuffer.length, offset);
      fs.closeSync(fd);
      send(res, 200, { success: true });
    } catch (err) {
      console.error("Chunk write error", err);
      send(res, 500, { error: 'Failed to write chunk' });
    }
  });
  
  req.on('error', (err) => {
    console.error("Chunk stream error", err);
    send(res, 500, { error: 'Stream error' });
  });
}

async function finishVideoUpload(req, res, url) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  const { supabase: activeSupabase } = require('../utils/supabase');
  const uploadId = url.searchParams.get('id');
  const ext = String(url.searchParams.get('ext') || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!uploadId || !/^[0-9a-f-]{36}$/i.test(uploadId) || !ALLOWED_EXT.includes(ext)) return send(res, 400, { error: 'Bad upload ID' });
  try {
    const name = `${uploadId}.${ext}`;
    const { data: found, error } = await activeSupabase.storage.from(BUCKET).list('videos', { search: name, limit: 5 });
    if (error) return send(res, 502, { error: 'Storage check failed: ' + (error.message || JSON.stringify(error)) });
    if (!found || !found.some(f => f.name === name)) return send(res, 404, { error: 'Video not found in storage. The upload may not have finished.' });
    const { data } = activeSupabase.storage.from(BUCKET).getPublicUrl(`videos/${name}`);
    send(res, 200, { success: true, url: data.publicUrl });
  } catch (err) {
    console.error('Finish upload error', err);
    send(res, 500, { error: 'Failed to finish upload: ' + (err.message || '') });
  }
}

module.exports = { startVideoUpload, uploadVideoChunk, finishVideoUpload };
