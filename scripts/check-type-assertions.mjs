import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import ts from 'typescript';

const argumentsList = process.argv.slice(2);
const diffOnly = argumentsList.includes('--diff');
const requestedRoots = argumentsList.filter((argument) => argument !== '--diff');
const excluded =
  /(^|\/)(node_modules|build|dist|coverage|\.cache|\.turbo|\.expo|ios|android)(\/|$)/;
const sourceFiles = [
  execFileSync('git', ['ls-files', '*.ts', '*.tsx'], { encoding: 'utf8' }),
  execFileSync('git', ['ls-files', '--others', '--exclude-standard', '*.ts', '*.tsx'], {
    encoding: 'utf8',
  }),
]
  .join('\n')
  .split('\n')
  .filter(Boolean)
  .filter((file) => !excluded.test(file));
const changedFiles = diffOnly
  ? new Set(
      [
        execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR'], { encoding: 'utf8' }),
        execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' }),
      ]
        .join('\n')
        .split('\n')
        .filter(Boolean),
    )
  : undefined;
const selectedFiles = sourceFiles
  .filter((file) => !changedFiles || changedFiles.has(file))
  .filter(
    (file) => requestedRoots.length === 0 || requestedRoots.some((root) => file.startsWith(root)),
  );

const assertions = [];

for (const file of selectedFiles) {
  const source = readFileSync(file, 'utf8');
  const scriptKind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind);
  const visit = (node) => {
    if (
      node.kind === ts.SyntaxKind.AsExpression ||
      node.kind === ts.SyntaxKind.TypeAssertionExpression
    ) {
      const { line } = tree.getLineAndCharacterOfPosition(node.getStart(tree));
      assertions.push(`${file}:${line + 1}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
}

if (assertions.length > 0) {
  console.error(`Found ${assertions.length} TypeScript assertions:`);
  console.error(assertions.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`No TypeScript assertions found in ${selectedFiles.length} selected files.`);
}
