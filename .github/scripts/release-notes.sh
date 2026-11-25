#!/usr/bin/env bash
# Prints the CHANGELOG.md section for a version to stdout.
#
#   release-notes.sh 1.2.0       -> body of "## [1.2.0] ..."; fails if absent or empty
#   release-notes.sh 1.2.0-rc1   -> body of "## [1.2.0-rc1] ..." if present, else "## [Unreleased]"
set -euo pipefail

version="${1:?usage: release-notes.sh <version> [changelog]}"
changelog="${2:-CHANGELOG.md}"

section() {
    awk -v want="$1" '
        /^## \[/ {
            if (found) exit
            heading = $0
            sub(/^## \[/, "", heading)
            sub(/\].*$/, "", heading)
            if (heading == want) { found = 1; next }
        }
        found { print }
    ' "$changelog" | sed -e '/./,$!d' | sed -e ':a' -e '/^\n*$/{$d;N;ba' -e '}'
}

notes="$(section "$version")"
if [ -z "$notes" ] && [[ "$version" == *-rc* ]]; then
    notes="$(section "Unreleased")"
fi

if [ -z "$notes" ]; then
    echo "No CHANGELOG.md section found for [$version]." >&2
    echo "Rename '## [Unreleased]' to '## [$version] - $(date -u +%F)' (and add a fresh Unreleased) before tagging." >&2
    exit 1
fi

printf '%s\n' "$notes"
