// The build branch, not a browser-supplied host or header, chooses the backend.
const marker = 'const CREDITS_PREVIEW_BUILD = false; // cloudflare-preview-routing';
function configurePreviewRouting(source, branch) {
  if (source.split(marker).length !== 2) throw new Error('Cloudflare preview route marker is missing or duplicated');
  const preview = branch === 'feat/paper-entry-analysis-flow';
  return source.replace(marker, `const CREDITS_PREVIEW_BUILD = ${preview}; // cloudflare-preview-routing`);
}
// Pages compiles Functions from the project root after the build command, not
// from the static output directory. That checkout is disposable in Pages CI.
configurePreviewRouting.writeBuildProxy = function (root, out, branch, onPages) {
  const fs = require('node:fs'), path = require('node:path');
  const sourcePath = path.join(root, 'server/same-origin-api.js');
  const configured = configurePreviewRouting(fs.readFileSync(sourcePath, 'utf8'), branch);
  fs.writeFileSync(path.join(out, 'server/same-origin-api.js'), configured);
  if (onPages) fs.writeFileSync(sourcePath, configured);
};
module.exports = configurePreviewRouting;
