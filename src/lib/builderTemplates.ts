import { EngineType } from './engineDetector';

export function generateGithubAction(engine: EngineType, hasVideos: boolean, filesToFix: string[]): string {
  const engineRepoMapping: Record<EngineType, string> = {
    'Psych Engine': 'ShadowMario/FNF-PsychEngine',
    'Codename Engine': 'CodenameCrew/CodenameEngine',
    'Leather Engine': 'Leather128/LeatherEngine',
    'JS Engine': 'Sirox228/Friday-Night-Funkin-JS-Engine',
    'Unknown': 'ShadowMario/FNF-PsychEngine' // Default fallback
  };

  const engineRepo = engineRepoMapping[engine];

  let videoScript = hasVideos ? `
      - name: Disable/Convert Videos (Web compatibility)
        run: |
          echo "Processing MP4 files to prevent web build crashes..."
          find . -name "*.mp4" -type f -exec mv {} {}.disabled \\;
` : "";

  let jsEngineScript = (engine === 'JS Engine' && filesToFix.length > 0) ? `
      - name: Fix JS Engine Song Audio File Capitalization
        run: |
          echo "Enforcing case sensitivity for Voices.ogg and Inst.ogg in songs folders..."
          find . -type f -iname "voices.ogg" -print0 | xargs -0 -I {} mv {} $(dirname {})/Voices.ogg
          find . -type f -iname "inst.ogg" -print0 | xargs -0 -I {} mv {} $(dirname {})/Inst.ogg
` : "";

  return `name: Build FNF Web Port

on:
  workflow_dispatch:
  repository_dispatch:
    types: [build_web_port]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Base Engine
        uses: actions/checkout@v3
        with:
          repository: '${engineRepo}'
          path: 'engine-source'

      - name: Download Mod Payload
        uses: actions/download-artifact@v3
        with:
          name: mod-payload
          path: mods_upload

      - name: Inject Mods into Engine
        run: |
          cd engine-source
          mkdir -p mods
          # Inject the uploaded mod files into the target directories
          cp -rn ../mods_upload/* mods/ || true
          cp -rn ../mods_upload/* assets/ || true
${jsEngineScript}${videoScript}
      - name: Setup Haxe
        uses: krdlab/setup-haxe@master
        with:
          haxe-version: 4.2.5

      - name: Install Haxelibs and Dependencies
        run: |
          cd engine-source
          haxelib setup ~/haxelib
          haxelib install hmm --quiet
          haxelib run hmm install --quiet
          haxelib install lime
          haxelib install openfl
          haxelib install flixel

      - name: Optimization & Web Compile Build
        run: |
          cd engine-source
          # Adds flags to make HTML5 compile lightweight as requested
          haxelib run lime build html5 -release -D DISCORD_DISABLE -D NO_PRELOAD_ALL

      - name: Package Flat ZIP & Standardize output
        run: |
          cd engine-source/export/release/html5/bin
          
          # Rename main engine JS file to funkin.js for easier jsDelivr/CDN embedding
          MAIN_JS=$(ls *.js | grep -E -v 'howler|pako' | head -n 1)
          if [ -n "$MAIN_JS" ] && [ "$MAIN_JS" != "funkin.js" ]; then
            mv "$MAIN_JS" funkin.js
            # Update index.html to use the new JS filename
            if [ -f "index.html" ]; then
              sed -i "s/$MAIN_JS/funkin.js/g" index.html
            fi
          fi
          
          # Ensure index.html exists fallback
          if [ ! -f "index.html" ]; then
            echo "<!DOCTYPE html><html><body><h1>FNF Web Build</h1><script src='funkin.js'></script></body></html>" > index.html
          fi
          
          zip -r ../../../../../web_export.zip *

      - name: Upload Web Export
        uses: actions/upload-artifact@v3
        with:
          name: web-export
          path: web_export.zip
`;
}
