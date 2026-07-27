import fs from 'node:fs';

const [buildPath, outputPath] = process.argv.slice(2);
if (!buildPath || !outputPath) {
  throw new Error('Usage: create-release-manifest.mjs <build-json> <output-json>');
}

const builds = JSON.parse(fs.readFileSync(buildPath, 'utf8'));
const build = Array.isArray(builds) ? builds[0] : builds;
if (!build) {
  throw new Error('EAS did not return a production build.');
}

const manifest = {
  appVersion: build.appVersion,
  buildId: build.id,
  buildNumber: build.appBuildVersion,
  commit: build.gitCommitHash,
  fingerprint: build.fingerprint?.hash ?? null,
  platform: build.platform,
  runtimeVersion: build.runtimeVersion,
  status: build.status,
};

if (manifest.status !== 'FINISHED') {
  throw new Error(`Expected a finished EAS build, got ${manifest.status ?? 'unknown'}.`);
}

fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
