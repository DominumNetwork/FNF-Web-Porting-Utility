# FNF Web Porting Utility

A web-based DevOps toolchain orchestrator designed to help Friday Night Funkin' modders quickly generate build pipelines for HTML5 web ports.

## Overview

This utility takes your FNF mod `.zip` file, scans its internal structure to automatically detect the base engine (Psych Engine, Codename Engine, Leather Engine, or JS Engine), and provides ready-to-use build scripts to compile the game via Haxe/Lime.

Since web browsers cannot natively compile Haxe, this application acts as the frontend interface to generate the necessary backend deployment workers.

## Features

- **Automated Engine Detection**: Scans the uploaded `.zip` folder structure to identify the target engine with a heuristic scoring system.
- **GitHub Actions Generator**: Creates a fully configured `.yml` workflow to automatically build your web port whenever you push to a repository.
- **VPS Worker Generator**: Generates a self-contained Node.js Express server script to build the game on your own Linux VPS/Dedicated server.
- **Automated Optimization**: Applies engine-specific patches during the build process, such as disabling Discord RPC and preventing early asset pre-loading (`NO_PRELOAD_ALL`) to keep web builds lightweight.
- **CDN Integration**: Automatically standardizes engine output to `funkin.js` and provides a zero-config snippet to host your game assets seamlessly via GitHub and the jsDelivr CDN.

## Usage

1. **Upload your Mod**: Drag and drop a `.zip` file containing your engine/mod files into the upload zone.
2. **Review Detection**: The utility will inform you of the detected engine, the file count, and any necessary compatibility fixes (e.g., MP4 videos, strict character casings).
3. **Choose your Pipeline**:
   - Save the **GitHub Action** to `.github/workflows/build-port.yml` in your repository.
   - Or, run the **VPS Worker** on your own server.
4. **Deploy & Embed**: Once your worker finishes zipping the HTML5 build, extract it to a public GitHub repository. Use the generated `jsDelivr` HTML snippet to easily embed the game on any webpage.