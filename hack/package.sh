#!/usr/bin/env bash
# Build the plugin and package one archive per platform for the marketplace.
#
#   hack/package.sh <version> [platform...]
#
# Writes dist/kubernetes-<os>_<arch>.tar.gz, the names the publish action
# uploads. Each archive holds plugin.yaml, bin/plugin and assets/ at its root,
# which is the layout the app installs.
set -euo pipefail

PLUGIN_ID=kubernetes
VERSION="${1:?usage: hack/package.sh <version> [platform...]}"
VERSION="${VERSION#v}"
shift
if [ "$#" -eq 0 ]; then
  set -- darwin_arm64 darwin_amd64 linux_amd64 linux_arm64 windows_amd64
fi

cd "$(dirname "$0")/.."

(cd ui && pnpm install --frozen-lockfile && pnpm run build)

rm -rf dist
for platform in "$@"; do
  os="${platform%%_*}"
  arch="${platform#*_}"
  ext=""
  if [ "$os" = "windows" ]; then ext=".exe"; fi

  stage="dist/stage/$platform"
  mkdir -p "$stage/bin" "$stage/assets"

  echo "Building $platform"
  GOOS="$os" GOARCH="$arch" CGO_ENABLED=0 \
    go build -trimpath -ldflags="-s -w" -o "$stage/bin/plugin$ext" ./pkg

  # The released version is the tag, not whatever plugin.yaml said at the time.
  sed "s/^version: .*/version: $VERSION/" plugin.yaml > "$stage/plugin.yaml"
  cp -R ui/dist/assets/. "$stage/assets/"

  COPYFILE_DISABLE=1 tar -czf "dist/$PLUGIN_ID-$platform.tar.gz" -C "$stage" plugin.yaml bin assets
done
rm -rf dist/stage

ls -lh dist
