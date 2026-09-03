const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const inputPath  = path.join(__dirname, '..', 'src-clean', 'isOwner.js');
const outputPath = path.join(__dirname, '..', 'utils', 'isOwner.js');

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
console.log('✅ Obfuscated isOwner.js written to utils/isOwner.js');
