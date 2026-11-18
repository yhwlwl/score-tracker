// The build branch, not a browser-supplied host or header, chooses the backend.
const marker = 'const CREDITS_PREVIEW_BUILD = false; // cloudflare-preview-routing';
module.exports = function configurePreviewRouting(source, branch) {
  if (source.split(marker).length !== 2) throw new Error('Cloudflare preview route marker is missing or duplicated');
  const preview = branch === 'feat/paper-entry-analysis-flow';
  return source.replace(marker, `const CREDITS_PREVIEW_BUILD = ${preview}; // cloudflare-preview-routing`);
};
