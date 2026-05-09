import { EngineType } from './engineDetector';

export const engineRepoMapping: Record<EngineType, string> = {
  'Psych Engine': 'ShadowMario/FNF-PsychEngine',
  'Codename Engine': 'CodenameCrew/CodenameEngine',
  'Leather Engine': 'Leather128/LeatherEngine',
  'JS Engine': 'JordanSantiagoYT/FNF-JS-Engine-Rewrite',
  'Unknown': 'ShadowMario/FNF-PsychEngine'
};

export function generateGithubAction(engineRepo: string, hasVideos: boolean, filesToFix: string[], engineType: string): string {
  let videoScript = hasVideos ? `
      - name: Disable/Convert Videos (Web compatibility)
        run: |
          echo "Processing MP4 files to prevent web build crashes..."
          find . -name "*.mp4" -type f -exec mv {} {}.disabled \\;
` : "";

  let jsEngineScript = (engineType === 'JS Engine' && filesToFix.length > 0) ? `
      - name: Fix JS Engine Song Audio File Capitalization
        run: |
          echo "Enforcing case sensitivity for Voices.ogg and Inst.ogg in songs folders..."
          find . -type f -iname "voices.ogg" -print0 | xargs -0 -I {} mv {} $(dirname {})/Voices.ogg
          find . -type f -iname "inst.ogg" -print0 | xargs -0 -I {} mv {} $(dirname {})/Inst.ogg
` : "";

  return `name: Build FNF Web Port

on:
  workflow_dispatch:
    inputs:
      mod_url:
        description: 'Direct URL to your mod .zip file (Google Drive, Dropbox, MediaFire, Discord, etc.)'
        required: true
        type: string

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout Base Engine
        uses: actions/checkout@v4
        with:
          repository: '${engineRepo}'
          path: 'engine-source'

      - name: Download Mod Payload
        run: |
          echo "Downloading mod from URL provided..."
          pip install gdown --quiet
          
          URL="\${{ github.event.inputs.mod_url }}"
          
          if [[ "$URL" == *"drive.google.com"* ]]; then
            gdown "$URL" -O mod-payload.zip
          else
            wget -q -O mod-payload.zip "$URL"
          fi
          
          echo "Extracting Mod Payload..."
          mkdir -p mods_upload
          unzip -q mod-payload.zip -d mods_upload/
          rm mod-payload.zip

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

      - name: Patch HTML5 incompatible code (Mock Sys)
        run: |
          cd engine-source
          mkdir -p source/mock
          echo 'package mock; class FileSystem { public static function absolutePath(path:String) return path; public static function exists(path:String) return false; public static function readDirectory(path:String):Array<String> return []; public static function isDirectory(path:String) return false; public static function stat(path:String) return null; public static function fullPath(path:String) return path; public static function createDirectory(path:String) {} public static function deleteFile(path:String) {} public static function deleteDirectory(path:String) {} }' > source/mock/FileSystem.hx
          echo 'package mock; class File { public static function getContent(path:String) return ""; public static function getBytes(path:String) return null; public static function saveContent(path:String, c:String) return; public static function saveBytes(path:String, b:Dynamic) return; public static function copy(s:String, d:String) {} }' > source/mock/File.hx
          echo 'package mock; class Sys { public static function exit(code:Int) {} public static function sleep(t:Float) {} public static function command(c:String, ?a:Array<String>) return 0; public static function args():Array<String> return []; public static function getCwd() return ""; public static function setCwd(s:String) {} public static function print(v:Dynamic) {} public static function println(v:Dynamic) {} public static function environment() return new haxe.ds.StringMap<String>(); }' > source/mock/Sys.hx
          echo 'package mock; class Process { public function new(c:String, ?a:Dynamic) {} public function exitCode(b:Bool=true) return 0; public function close() {} }' > source/mock/Process.hx
          echo 'package mock; class Thread { public static function create(f:Void->Void) { f(); } public static function readMessage(b:Bool) return null; public static function sendMessage(m:Dynamic) {} }' > source/mock/Thread.hx
          echo 'package mock; class Mutex { public function new() {} public function acquire() {} public function release() {} }' > source/mock/Mutex.hx
          
          find source -name "*.hx" -type f -exec sed -i -e 's/sys\\.FileSystem/mock.FileSystem/g' \\
                                                          -e 's/sys\\.io\\.File/mock.File/g' \\
                                                          -e 's/sys\\.io\\.Process/mock.Process/g' \\
                                                          -e 's/sys\\.thread\\.Thread/mock.Thread/g' \\
                                                          -e 's/sys\\.thread\\.Mutex/mock.Mutex/g' \\
                                                          -e 's/\\bSys\\./mock.Sys./g' \\
                                                          -e 's/import Sys;/import mock.Sys;/g' {} +

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
        uses: actions/upload-artifact@v4
        with:
          name: web-export
          path: web_export.zip

      - name: Auto-Publish to GitHub Branch
        run: |
          cd engine-source/export/release/html5/bin
          git init
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add .
          git commit -m "Automated Web Port Build"
          git push --force "https://x-access-token:\${{ secrets.GITHUB_TOKEN }}@github.com/\${{ github.repository }}.git" HEAD:web-build
`;
}