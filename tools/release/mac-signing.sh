# Sourced by mac.yml: leaves ID and KC for codesign. Never enable shell tracing here.
ID=- KC=()
if [ -n "${MAC_SIGN_P12:-}" ]; then
  K="$RUNNER_TEMP/sign.keychain-db" P="$(uuidgen)"
  ORIGINAL_KEYCHAINS=()
  while IFS= read -r chain; do
    ORIGINAL_KEYCHAINS+=("$chain")
  done < <(security list-keychains -d user | sed 's/^[[:space:]]*"//; s/"[[:space:]]*$//')
  cleanup_signing() {
    rm -f "$RUNNER_TEMP/sign.p12"
    security list-keychains -d user -s "${ORIGINAL_KEYCHAINS[@]}" || true
    security delete-keychain "$K" || true
  }
  trap cleanup_signing EXIT
  echo 'Signing: create disposable keychain'
  security create-keychain -p "$P" "$K"
  security set-keychain-settings -lut 3600 "$K"
  security unlock-keychain -p "$P" "$K"
  echo 'Signing: add disposable keychain to search list'
  security list-keychains -d user -s "$K" "${ORIGINAL_KEYCHAINS[@]}"
  printf '%s' "$MAC_SIGN_P12" | base64 --decode > "$RUNNER_TEMP/sign.p12"
  echo 'Signing: import PKCS#12 certificate and private key'
  security import "$RUNNER_TEMP/sign.p12" -k "$K" -P "$MAC_SIGN_PASSWORD" -T /usr/bin/codesign >/dev/null
  rm -f "$RUNNER_TEMP/sign.p12"
  echo 'Signing: find certificate/private-key identity'
  ID=$(security find-identity -p codesigning "$K" | awk '/"Toaster Self-Signed"/ { print $2; exit }')
  [ -n "$ID" ] || { echo "Signing: no Toaster Self-Signed private-key identity; check the PKCS#12 export"; exit 1; }
  echo 'Signing: allow codesign private-key access'
  security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$P" "$K" >/dev/null
  KC=(--keychain "$K")
fi
