const fs = require('fs');
const path = require('path');
const Busboy = require('busboy');
const { send } = require('../utils/http');
const crypto = require('crypto');

async function uploadLocalVideo(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return send(res, 400, { error: 'Invalid content type' });
  }

  // 3 GB max for large pujas
  const MAX_BYTES = 3 * 1024 * 1024 * 1024; 
  
  let busboy;
  try {
    busboy = Busboy({
      headers: req.headers,
      limits: {
        files: 1, 
        fileSize: MAX_BYTES
      }
    });
  } catch (err) {
    return send(res, 400, { error: 'Invalid multipart payload' });
  }

  let hasResponded = false;
  let savedFilePath = null;

  const abortRequest = (statusCode, message) => {
    if (hasResponded) return;
    hasResponded = true;
    req.unpipe(busboy);
    busboy.removeAllListeners();
    res.statusCode = statusCode;
    res.end(JSON.stringify({ error: message }));
  };

  busboy.on('error', () => abortRequest(400, 'Malformed stream'));
  busboy.on('filesLimit', () => abortRequest(400, 'Multiple files are not allowed'));

  // Ensure uploads/videos dir exists
  const uploadDir = path.join(__dirname, '..', 'uploads', 'videos');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  let fileUrl = null;

  busboy.on('file', (name, file, info) => {
    const ext = path.extname(info.filename) || '.mp4';
    const uuid = crypto.randomUUID();
    const filename = `${uuid}${ext}`;
    
    savedFilePath = path.join(uploadDir, filename);
    fileUrl = `/uploads/videos/${filename}`;

    const writeStream = fs.createWriteStream(savedFilePath);
    
    file.on('limit', () => {
      writeStream.destroy();
      fs.unlink(savedFilePath, () => {});
      abortRequest(413, 'File too large. Maximum 3GB.');
    });

    file.pipe(writeStream);
  });

  busboy.on('finish', () => {
    if (hasResponded) return;
    if (!fileUrl) return abortRequest(400, 'No video file provided.');
    
    hasResponded = true;
    send(res, 200, { success: true, url: fileUrl });
  });

  req.pipe(busboy);
}

module.exports = { uploadLocalVideo };
