#!/usr/bin/env bash
# XCTest suite of the Swift scene core (pure maths + state machine). Runs on the Mac, no simulator needed.
set -euo pipefail
cd "$(dirname "$0")/../../modules/mystery-scene/ios/SceneCore"
swift test
