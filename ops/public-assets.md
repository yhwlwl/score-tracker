# Public image host

`https://assets.tantantan.tech` serves only the explicitly listed public images in
`assets/public-assets.json`. The image URL includes the SHA-256 prefix, so each
version can be cached for a year. Preserve the original repository image paths as
the fallback and as compatibility for older clients.

The public directory is `/www/wwwroot/score-tracker-assets`, owned by root and
read-only to the Nginx worker. Only `/v1/<16 hex>/<image filename>` is served;
other paths and write methods are rejected. Scripts, uploads, directory indexes,
symlink targets, application proxies and databases are not exposed. Existing
application virtual hosts are unchanged. Connection/request limits are scoped to
this image host; it still shares the machine's bandwidth and Nginx process.

Private user photos, papers and answer sheets are never added to this manifest.
The four screenshot SVG files are reviewed wrappers containing only an embedded
WebP; arbitrary SVG uploads are not supported. Public images send no credentials
or referrer to the asset host. QR downloads use a CORS fetch and a local blob URL,
with fallback to the original site if the asset server is unavailable.

Publish image bytes from a pinned repository commit into their exact manifest
paths, verify SHA-256 and size, and use new paths for new content. No public upload
endpoint or GitHub credential is installed on the server. New admin uploads keep
the existing base64 workflow until their image has been separately published and
added to the manifest.

The dedicated ACME home is `/www/server/score-tracker-assets-acme` (root, 0700).
Nginx reads only the installed certificate in its `live/` subdirectory. An exact
domain renewal runs daily from `/etc/cron.d/score-tracker-assets-acme`, protected
by flock. The renewal hook validates Nginx configuration before a graceful reload.
Private keys and ACME account configuration must never be checked into Git.

To roll back image routing, remove the manifest entries (or the helper from the
bundle) and rebuild. To remove the image host, remove only its virtual-host file,
run `nginx -t`, then gracefully reload; preserve existing application configs.
QR configuration values remain valid same-origin image paths throughout.
