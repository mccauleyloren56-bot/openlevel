#!/usr/bin/env sh
set -eu

if [ "$#" -lt 1 ] || [ "$#" -gt 3 ]; then
  echo "Usage: compact-pdf.sh input.pdf [output.pdf] [screen|ebook|printer]" >&2
  exit 2
fi

input=$1
output=${2:-}
preset=${3:-ebook}

case "$preset" in
  screen|ebook|printer) ;;
  *)
    echo "compact-pdf.sh: preset must be screen, ebook, or printer" >&2
    exit 2
    ;;
esac

if [ ! -f "$input" ]; then
  echo "compact-pdf.sh: input file not found: $input" >&2
  exit 1
fi

if [ -z "$output" ]; then
  base=${input%.*}
  output="${base}-lite.pdf"
fi

find_gs() {
  for candidate in /opt/homebrew/bin/gs /usr/local/bin/gs /usr/bin/gs gs; do
    if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -v 2>/dev/null | grep -q "Ghostscript"; then
      command -v "$candidate"
      return 0
    fi
  done
  return 1
}

gs_bin=$(find_gs) || {
  echo "compact-pdf.sh: Ghostscript not found. Install ghostscript or keep the original PDF." >&2
  exit 127
}

"$gs_bin" \
  -sDEVICE=pdfwrite \
  -dCompatibilityLevel=1.4 \
  -dPDFSETTINGS=/"$preset" \
  -dNOPAUSE \
  -dQUIET \
  -dBATCH \
  -sOutputFile="$output" \
  "$input"

if [ ! -s "$output" ]; then
  echo "compact-pdf.sh: output was not created: $output" >&2
  exit 1
fi

printf '%s\n' "$output"
