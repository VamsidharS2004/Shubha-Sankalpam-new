const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\Admin\\.gemini\\antigravity\\brain\\e1e07575-267c-473d-beea-1b0f16521cd0\\.system_generated\\logs\\transcript_full.jsonl', 'utf8').split('\n');

for (const line of lines) {
  if (line.includes('// IMAGE UPLOADER (Phase 2') && line.includes('function showPreviewIfImage')) {
    const data = JSON.parse(line);
    let found = false;
    if (data.tool_calls) {
      for (const tc of data.tool_calls) {
        if (tc.args && tc.args.CodeContent && tc.args.CodeContent.includes('// IMAGE UPLOADER (Phase 2')) {
          fs.writeFileSync('phase2_code.txt', tc.args.CodeContent);
          found = true;
        } else if (tc.args && tc.args.ReplacementContent && tc.args.ReplacementContent.includes('// IMAGE UPLOADER (Phase 2')) {
          fs.writeFileSync('phase2_code.txt', tc.args.ReplacementContent);
          found = true;
        } else if (tc.args && tc.args.CommandLine && tc.args.CommandLine.includes('// IMAGE UPLOADER (Phase 2')) {
          fs.writeFileSync('phase2_code.txt', tc.args.CommandLine);
          found = true;
        }
      }
    }
    if (found) {
      console.log("Saved phase2_code.txt");
      break;
    }
  }
}
