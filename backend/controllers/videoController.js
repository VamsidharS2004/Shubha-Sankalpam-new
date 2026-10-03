const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { send } = require('../utils/http');

function getTempDir() {
  const dir = path.join(__dirname, '..', 'uploads', 'temp');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function startVideoUpload(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  const { supabase: activeSupabase } = require('../utils/supabase');
  if (!activeSupabase) return send(res, 503, { error: 'Storage configuration missing' });

  const uploadId = crypto.randomUUID();
  const tempPath = path.join(getTempDir(), uploadId);
  fs.writeFileSync(tempPath, Buffer.alloc(0)); // create empty file
  
  send(res, 200, { success: true, uploadId });
}

async function uploadVideoChunk(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  
  const uploadId = req.query.id;
  const chunkIndex = parseInt(req.query.index, 10);
  const chunkSize = parseInt(req.query.size, 10);
  
  if (!uploadId || isNaN(chunkIndex) || isNaN(chunkSize)) {
    return send(res, 400, { error: 'Missing chunk metadata' });
  }

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

async function finishVideoUpload(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  const { supabase: activeSupabase } = require('../utils/supabase');
  
  const uploadId = req.query.id;
  if (!uploadId) return send(res, 400, { error: 'Missing upload ID' });

  const tempPath = path.join(getTempDir(), uploadId);
  if (!fs.existsSync(tempPath)) {
    return send(res, 404, { error: 'Upload session not found' });
  }

  try {
    const stat = fs.statSync(tempPath);
    if (stat.size === 0) {
      return send(res, 400, { error: 'Empty file' });
    }

    const ext = '.mp4';
    const filename = `${uploadId}${ext}`;
    const storagePath = `videos/${filename}`;

    const fileStream = fs.createReadStream(tempPath);
    
    // Upload to Supabase using duplex: half for streams
    const { data, error } = await activeSupabase.storage.from('media').upload(storagePath, fileStream, {
      contentType: 'video/mp4',
      duplex: 'half',
      upsert: false
    });

    if (error) {
      console.error('Supabase upload error:', error);
      return send(res, 502, { error: 'Storage upload failed' });
    }

    const { data: publicUrlData } = activeSupabase.storage.from('media').getPublicUrl(storagePath);
    
    // Cleanup local file
    try { fs.unlinkSync(tempPath); } catch (e) {}

    send(res, 200, { success: true, url: publicUrlData.publicUrl });
  } catch (err) {
    console.error("Finish upload error", err);
    send(res, 500, { error: 'Failed to finish upload' });
  }
}

module.exports = { startVideoUpload, uploadVideoChunk, finishVideoUpload };
