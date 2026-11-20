#!/usr/bin/env bash
# Converts the original watch PNGs (assets-source/watches) into the WebP files the app bundles:
#   full/  - 1019 px wide, for the reveal screen
#   thumb/ - 360 px wide,  for lists and the collection grid
# Needs `cwebp` (brew install webp). Alpha is preserved at maximum quality.
set -euo pipefail

ROOT_DIRECTORY="$(cd "$(dirname "$0")/../.." && pwd)"
SOURCE_DIRECTORY="${ROOT_DIRECTORY}/assets-source/watches"
TARGET_DIRECTORY="${ROOT_DIRECTORY}/src/assets/images/watches"
mkdir -p "${TARGET_DIRECTORY}/full" "${TARGET_DIRECTORY}/thumb"

printf "%-16s %12s %12s %12s\n" "image" "png" "full webp" "thumb webp"
for SOURCE_FILE in "${SOURCE_DIRECTORY}"/*.png; do
  NAME="$(basename "${SOURCE_FILE}" .png)"
  cwebp -quiet -q 86 -alpha_q 100 -m 6 "${SOURCE_FILE}" -o "${TARGET_DIRECTORY}/full/${NAME}.webp"
  cwebp -quiet -q 80 -alpha_q 100 -m 6 -resize 360 0 "${SOURCE_FILE}" -o "${TARGET_DIRECTORY}/thumb/${NAME}.webp"
  printf "%-16s %12s %12s %12s\n" "${NAME}" \
    "$(stat -f%z "${SOURCE_FILE}")" \
    "$(stat -f%z "${TARGET_DIRECTORY}/full/${NAME}.webp")" \
    "$(stat -f%z "${TARGET_DIRECTORY}/thumb/${NAME}.webp")"
done
