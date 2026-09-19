const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\Admin\\.gemini\\antigravity\\brain\\e1e07575-267c-473d-beea-1b0f16521cd0\\.system_generated\\logs\\transcript_full.jsonl', 'utf8').split('\n');

for (const line of lines) {
  if (line.includes('// IMAGE UPLOADER (Phase 2') && line.includes('frontend/assets/js/admin.js') && line.includes('replace_file_content')) {
    const data = JSON.parse(line);
    const tc = data.tool_calls.find(t => t.name === 'replace_file_content');
    if (tc && tc.args.ReplacementContent && tc.args.ReplacementContent.includes('// IMAGE UPLOADER (Phase 2')) {
      fs.writeFileSync('phase2_code.txt', tc.args.ReplacementContent);
      console.log('Saved phase2_code.txt');
      break;
    }
  }
}
