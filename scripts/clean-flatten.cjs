const fs = require('fs');

function cleanFlattenedFile(inputPath, outputPath) {
  let content = fs.readFileSync(inputPath, 'utf8');
  
  // Remove empty lines at the beginning
  content = content.replace(/^\s*\n+/, '');
  
  // Remove duplicate SPDX lines (keep only the first)
  const lines = content.split('\n');
  let foundSPDX = false;
  let foundPragma = false;
  const cleanedLines = [];
  
  for (const line of lines) {
    // Skip duplicate SPDX
    if (line.includes('SPDX-License-Identifier')) {
      if (!foundSPDX) {
        cleanedLines.push('// SPDX-License-Identifier: MIT');
        foundSPDX = true;
      }
      continue;
    }
    
    // Skip "Original license" comments
    if (line.includes('Original license:')) {
      continue;
    }
    
    // Skip duplicate pragma
    if (line.includes('pragma solidity')) {
      if (!foundPragma) {
        cleanedLines.push('pragma solidity ^0.8.27;');
        foundPragma = true;
      }
      continue;
    }
    
    cleanedLines.push(line);
  }
  
  fs.writeFileSync(outputPath, cleanedLines.join('\n'));
  console.log(`Cleaned: ${outputPath}`);
}

cleanFlattenedFile('flattened/Time26.flat.sol', 'flattened/Time26.clean.sol');
cleanFlattenedFile('flattened/ProofRecorder.flat.sol', 'flattened/ProofRecorder.clean.sol');
