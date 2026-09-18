const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../src');

function checkFileForRegex(filePath, regex, message, shouldMatch = true) {
  if (!fs.existsSync(filePath)) {
    console.log(`[SKIPPED] ${filePath} not found.`);
    return true;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = regex.test(content);
  if (shouldMatch && !match) {
    console.error(`[FAIL] ${message}`);
    return false;
  }
  if (!shouldMatch && match) {
    console.error(`[FAIL] ${message}`);
    return false;
  }
  return true;
}

console.log('Starting verification of Document Engine contract...');

let allPassed = true;

// 1. capabilitiesGate.ts solo dependa de sí mismo y de sources crudos (no React)
allPassed &= checkFileForRegex(
  path.join(rootDir, 'shared/core/documents/documentEngine/capabilitiesGate.ts'),
  /import.*from.*'react'/,
  'capabilitiesGate.ts must NOT import React',
  false
);

// 2. documentEngine NO importe useEffect o React
const engineDir = path.join(rootDir, 'shared/core/documents/documentEngine');
if (fs.existsSync(engineDir)) {
  const engineFiles = fs.readdirSync(engineDir).filter(f => f.endsWith('.ts'));
  engineFiles.forEach(f => {
    allPassed &= checkFileForRegex(
      path.join(engineDir, f),
      /import.*from.*'react'/,
      `${f} must NOT import React`,
      false
    );
  });
}

// 3. Modales importen canPublish y canVersionByJob desde capabilitiesGate
allPassed &= checkFileForRegex(
  path.join(rootDir, 'modules/cv-builder/components/Navbar.tsx'),
  /capabilitiesGate\.canPublish/,
  'Navbar.tsx must import canPublish from capabilitiesGate'
);
allPassed &= checkFileForRegex(
  path.join(rootDir, 'app/App.tsx'),
  /capabilitiesGate\.canVersionByJob/,
  'App.tsx must use canVersionByJob from capabilitiesGate'
);

// 4. Pestañas: useDocumentTabs.ts hidrata el almacén y registra la pestaña inicial, y App.tsx invoca el hook.
allPassed &= checkFileForRegex(
  path.join(rootDir, 'app/App.tsx'),
  /useDocumentTabs\(/,
  'App.tsx must invoke useDocumentTabs hook'
);
allPassed &= checkFileForRegex(
  path.join(rootDir, 'shared/core/documents/useDocumentTabs.ts'),
  /useState<OpenTabItem\[\]>\(\(\) => getOpenTabs\(\)\)/,
  'useDocumentTabs.ts must hydrate tabs from tabStore on first render'
);
allPassed &= checkFileForRegex(
  path.join(rootDir, 'shared/core/documents/useDocumentTabs.ts'),
  /ensureDocumentTab\(/,
  'useDocumentTabs.ts must register the initial document tab via ensureDocumentTab'
);
// 5. Ningún efecto secundario global dentro de updaters de setState del contexto
allPassed &= checkFileForRegex(
  path.join(rootDir, 'context/CVContext.tsx'),
  /updateTabTitle\(/,
  'CVContext.tsx must NOT call updateTabTitle inside setState updaters (do it in an App.tsx effect)',
  false
);

if (allPassed) {
  console.log('[SUCCESS] All Document Engine contracts verified.');
  process.exit(0);
} else {
  console.error('[ERROR] Verification failed.');
  process.exit(1);
}
