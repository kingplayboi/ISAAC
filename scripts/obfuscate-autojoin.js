const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const inputPath  = path.join(__dirname, '..', 'src-clean', 'autoJoin.js');
const outputPath = path.join(__dirname, '..', 'utils', 'autoJoin.js');

const code = fs.readFileSync(inputPath, 'utf8');

const result = JavaScriptObfuscator.obfuscate(code, {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 1,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  selfDefending: false
});

fs.writeFileSync(outputPath, result.getObfuscatedCode(), 'utf8');
console.log('✅ Obfuscated autoJoin.js written to utils/autoJoin.js');
