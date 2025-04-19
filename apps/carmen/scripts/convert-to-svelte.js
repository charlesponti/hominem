#!/usr/bin/env node
/**
 * This script helps automate the conversion of React components to Svelte.
 * It creates a new .svelte file with basic Svelte structure based on a React component.
 * 
 * Usage: node convert-to-svelte.js path/to/component.tsx
 */

import fs from 'fs';
import path from 'path';

// Get the file path from command line arguments
const filePath = process.argv[2];

if (!filePath) {
  console.error('Please provide a path to a React component file.');
  process.exit(1);
}

// Check if the file exists
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

// Read the React component file
const reactCode = fs.readFileSync(filePath, 'utf8');

// Extract imports
const importRegex = /import\s+(.+?)\s+from\s+['"](.+?)['"];?/g;
const imports = [];
let match;
while ((match = importRegex.exec(reactCode)) !== null) {
  imports.push(match[0]);
}

// Simple detection of component props
const propsRegex = /interface\s+(\w+Props)|type\s+(\w+Props)|function\s+\w+\(\{\s*([^}]+)\}/;
const propsMatch = propsRegex.exec(reactCode);
let propsSection = '';
if (propsMatch) {
  propsSection = propsMatch[3] || '';
}

// Create the Svelte component skeleton
const svelteFilePath = filePath.replace(/\.tsx$/, '.svelte');
const svelteTemplate = `<script lang="ts">
  ${imports.join('\n  ')}
  
  // TODO: Convert React props to Svelte exports
  ${propsSection ? '// Props detected: ' + propsSection : '// Props not detected automatically, please add exports'}
  
  // TODO: Convert useState hooks to Svelte variables
  
  // TODO: Convert useEffect hooks to Svelte lifecycle methods or reactive statements
  
  // TODO: Convert event handlers
</script>

<!-- TODO: Convert JSX to Svelte template -->
<div>
  <!-- Component content goes here -->
</div>

<style>
  /* Component styles */
</style>`;

// Write the Svelte file
fs.writeFileSync(svelteFilePath, svelteTemplate);

console.log(`Created Svelte component template at: ${svelteFilePath}`);
console.log('Please manually complete the conversion.');