const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\Admin\\.gemini\\antigravity\\brain\\e1e07575-267c-473d-beea-1b0f16521cd0\\.system_generated\\logs\\transcript_full.jsonl', 'utf8').split('\n');

for (const line of lines) {
  if (line.includes('// IMAGE UPLOADER (Phase 2')) {
    console.log("FOUND!");
    fs.writeFileSync('transcript_match.json', line);
  }
}
