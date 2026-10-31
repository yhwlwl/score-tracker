#!/bin/sh
# Only this image host's isolated ACME home and certificate are selected.
set -eu
exec /usr/bin/flock -n /www/server/score-tracker-assets-acme/renew.lock \
  /root/.acme.sh/acme.sh \
  --home /www/server/score-tracker-assets-acme \
  --config-home /www/server/score-tracker-assets-acme \
  --cert-home /www/server/score-tracker-assets-acme \
  --renew --domain assets.tantantan.tech --ecc --server letsencrypt \
  >> /www/server/score-tracker-assets-acme/renew.log 2>&1
