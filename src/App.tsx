import { useState, useRef } from 'react';
import JSZip from 'jszip';
import { CloudUpload as UploadCloud, Archive as FolderArchived, Loader2, Settings, Terminal, PackageCheck, Download, CodeXml } from 'lucide-react';
import { detectEngine, DetectionResult } from './lib/engineDetector';
import { generateGithubAction } from './lib/builderTemplates';
import { generateVpsWorker } from './lib/vpsWorkerTemplate';

export default function App() {
  const [isHovering, setIsHovering] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'github' | 'vps' | 'cdn' | 'terminal'>('upload');
  const [simulatedLogs, setSimulatedLogs] = useState<string[]>([]);
  
  const [cdnUsername, setCdnUsername] = useState('username');
  const [cdnRepo, setCdnRepo] = useState('repo');
  const [cdnFolder, setCdnFolder] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processZip = async (file: File) => {
    setIsProcessing(true);
    setDetection(null);
    setSimulatedLogs([]);
    try {
      const zip = new JSZip();
      const loaded = await zip.loadAsync(file);
      const files = Object.keys(loaded.files);
      
      // Artificial delay for better UX feeling
      await new Promise(r => setTimeout(r, 600)); 
      
      const result = detectEngine(files);
      setDetection(result);
      setActiveTab('github');
    } catch (err) {
      console.error(err);
      alert('Failed to parse ZIP. Please ensure it is a valid zip file.');
    } finally {
      setIsProcessing(false);
      setIsHovering(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.zip')) {
        processZip(file);
      } else {
        alert('Please drop a .zip file containing your mods folder.');
        setIsHovering(false);
      }
    }
  };

  const simulateBuild = async () => {
    setActiveTab('terminal');
    setSimulatedLogs(["Connecting to Build Worker...", "Initializing Haxe...", "Checking out repository..."]);
    
    const logs = [
      "Downloading Mod Payload...",
      "Extracting to /mods_upload",
      "Injecting mods into engine...",
      "Running 'haxelib install hmm'...",
      "Installing lime, flixel, openfl...",
      "Compiling C++ to JS (HTML5 Release mode)...",
      "Notice: Applied -D DISCORD_DISABLE and -D NO_PRELOAD_ALL optimizations.",
      "Zipping Flat Web Package (export/release/html5/bin)...",
      "Packaging index.html and assets...",
      "Done! 'web_export.zip' generated successfully."
    ];
    
    if (detection?.engine === 'JS Engine' && detection.filesToFix.length > 0) {
       logs.splice(3, 0, `Fixed ${detection.filesToFix.length} lowercase voice/inst file names for JS Engine.`);
    }

    let currentLogs = [...simulatedLogs];
    for (const log of logs) {
      await new Promise(r => setTimeout(r, 800 + Math.random() * 800));
      currentLogs = [...currentLogs, log];
      setSimulatedLogs(currentLogs);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-purple-900">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur top-0 sticky z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="text-purple-500 w-7 h-7" />
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">FNF Web Porting Utility</h1>
          </div>
          <div className="text-sm font-medium text-gray-400">DevOps Toolchain Orchestrator</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Sidebar Controls */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-gray-400" />
              Upload Mod Zip
            </h2>
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsHovering(true); }}
              onDragLeave={() => setIsHovering(false)}
              onDrop={handleDrop}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200
                ${isHovering ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700 hover:border-gray-500 bg-gray-800/50'}
                ${isProcessing && 'opacity-50 pointer-events-none'}`}
            >
              <input type="file" ref={fileInputRef} className="hidden" accept=".zip" onChange={(e) => e.target.files && processZip(e.target.files[0])} />
              
              {isProcessing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
                  <p className="text-sm text-gray-300 font-medium">Scanning Folder Structure...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <FolderArchived className="w-10 h-10 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-200">Drag & Drop mod .zip</p>
                    <p className="text-xs text-gray-500 mt-1">Or click to browse</p>
                  </div>
                </div>
              )}
            </div>
            
            {detection && (
              <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700 animate-in fade-in slide-in-from-bottom-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Detected Configuration
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Target Engine:</span>
                    <span className="font-semibold text-purple-400">{detection.engine}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Files:</span>
                    <span>{detection.totalFiles}</span>
                  </div>
                  {detection.hasVideos && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Videos (.mp4):</span>
                      <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded border border-yellow-500/30">Requires Conversion</span>
                    </div>
                  )}
                  {detection.filesToFix.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Filename Fixes:</span>
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">{detection.filesToFix.length} files</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={simulateBuild}
                  className="mt-6 w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Terminal className="w-4 h-4" /> Run Simulated Build
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="md:col-span-8 flex flex-col min-h-[600px]">
          {detection ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col flex-1 shadow-xl">
              <div className="flex bg-gray-950 border-b border-gray-800">
                <button 
                  onClick={() => setActiveTab('github')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'github' ? 'bg-gray-900 text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'}`}
                >
                  GitHub Action (.yml)
                </button>
                <button 
                  onClick={() => setActiveTab('vps')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'vps' ? 'bg-gray-900 text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'}`}
                >
                  VPS Worker (Node.js)
                </button>
                <button 
                  onClick={() => setActiveTab('cdn')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'cdn' ? 'bg-gray-900 text-green-400 border-b-2 border-green-500' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'}`}
                >
                  <div className="flex items-center gap-2">
                    <CodeXml className="w-4 h-4" /> jsDelivr Snippet
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('terminal')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ml-auto ${activeTab === 'terminal' ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'}`}
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4" /> Live Terminal
                  </div>
                </button>
              </div>

              <div className="p-1 flex-1 bg-gray-950 flex flex-col relative">
                {activeTab === 'github' && (
                  <div className="h-full flex flex-col">
                    <div className="p-4 flex justify-between items-center bg-gray-900 border-b border-gray-800">
                      <p className="text-sm text-gray-400">Save this to <span className="font-mono text-gray-300">.github/workflows/build-port.yml</span> in your repository.</p>
                      <button onClick={() => {
                        const blob = new Blob([generateGithubAction(detection.engine, detection.hasVideos, detection.filesToFix)], { type: 'text/yaml' });
                        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'build-port.yml'; a.click();
                      }} className="text-sm flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded transition">
                        <Download className="w-4 h-4" /> Download .yml
                      </button>
                    </div>
                    <pre className="p-4 flex-1 overflow-auto text-xs font-mono text-green-400 custom-scrollbar">
                      {generateGithubAction(detection.engine, detection.hasVideos, detection.filesToFix)}
                    </pre>
                  </div>
                )}
                
                {activeTab === 'vps' && (
                  <div className="h-full flex flex-col">
                    <div className="p-4 flex justify-between items-center bg-gray-900 border-b border-gray-800">
                      <p className="text-sm text-gray-400">Run this Node.js script on your Linux VPS API server.</p>
                      <button onClick={() => {
                        const blob = new Blob([generateVpsWorker('ShadowMario/FNF-PsychEngine')], { type: 'text/javascript' });
                        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'worker.js'; a.click();
                      }} className="text-sm flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded transition">
                        <Download className="w-4 h-4" /> Download worker.js
                      </button>
                    </div>
                    <pre className="p-4 flex-1 overflow-auto text-xs font-mono text-blue-300 custom-scrollbar">
                      {generateVpsWorker('ShadowMario/FNF-PsychEngine')}
                    </pre>
                  </div>
                )}

                {activeTab === 'cdn' && (
                  <div className="h-full flex flex-col">
                    <div className="p-4 bg-gray-900 border-b border-gray-800 flex flex-col gap-4">
                      <div>
                        <p className="text-sm text-gray-300 font-medium">Single-File HTML Embed</p>
                        <p className="text-xs text-gray-500 mt-1">Host your exported zip on GitHub and copy this code to any HTML file to auto-fetch the game using jsDelivr. (The build script automagically renames your engine's JS to 'funkin.js').</p>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <input type="text" placeholder="GitHub User" value={cdnUsername} onChange={e => setCdnUsername(e.target.value)} className="bg-gray-800 border border-gray-700 px-3 py-1.5 rounded text-sm text-gray-200 focus:outline-none focus:border-green-500" />
                        <input type="text" placeholder="Repository" value={cdnRepo} onChange={e => setCdnRepo(e.target.value)} className="bg-gray-800 border border-gray-700 px-3 py-1.5 rounded text-sm text-gray-200 focus:outline-none focus:border-green-500" />
                        <input type="text" placeholder="Sub-folder (optional)" value={cdnFolder} onChange={e => setCdnFolder(e.target.value)} className="bg-gray-800 border border-gray-700 px-3 py-1.5 rounded text-sm text-gray-200 focus:outline-none focus:border-green-500" />
                      </div>
                    </div>
                    <pre className="p-4 flex-1 overflow-auto text-xs font-mono text-green-300 custom-scrollbar">
{`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>FNF Web Port</title>
    <!-- Magic jsDelivr Base Tag to route all asset requests through GitHub CDN -->
    <base href="https://cdn.jsdelivr.net/gh/${cdnUsername}/${cdnRepo}@main/${cdnFolder ? cdnFolder.split('/').filter(Boolean).join('/') + '/' : ''}">
    
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
        #openfl-content { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
    </style>
</head>
<body>
    <div id="openfl-content"></div>

    <!-- The build worker standardized the file to funkin.js -->
    <script src="funkin.js"></script>
    
    <script>
        // Note: You must replace '${detection.engine === 'Unknown' ? 'PsychEngine' : detection.engine.replace('Engine', ' Engine').replace(' ', '')}' below 
        // with the exact internal Project name if the auto-detection failed.
        lime.embed ("${detection.engine === 'Unknown' ? 'PsychEngine' : detection.engine.replace(' ', '')}", "openfl-content", 1280, 720, { parameters: {} });
    </script>
</body>
</html>`}
                    </pre>
                  </div>
                )}

                {activeTab === 'terminal' && (
                  <div className="h-full p-4 overflow-auto custom-scrollbar font-mono text-xs flex flex-col gap-1 bg-black text-gray-300">
                    {simulatedLogs.length === 0 && <p className="text-gray-600">Waiting for build to start...</p>}
                    {simulatedLogs.map((log, i) => (
                      <div key={i} className={`${log.includes('ERROR') ? 'text-red-400' : log.includes('Done') ? 'text-green-400 font-bold' : log.includes('Notice:') ? 'text-yellow-400' : 'text-gray-300'}`}>
                        <span className="text-gray-600 mr-2">{'>'}</span> {log}
                      </div>
                    ))}
                    {simulatedLogs.length > 0 && simulatedLogs.length < 13 && (
                      <div className="flex gap-2 items-center text-gray-500 mt-2">
                        <Loader2 className="w-3 h-3 animate-spin inline" /> processing...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-xl bg-gray-900/20 text-center p-12">
              <PackageCheck className="w-16 h-16 text-gray-700 mb-4" />
              <h3 className="text-xl font-medium text-gray-300">Awaiting Mod Payload</h3>
              <p className="text-gray-500 max-w-md mt-2">Upload your mod `.zip` to automatically generate the Vercel-compatible GitHub target or Node.js Build Worker API tailored for your FNF engine.</p>
            </div>
          )}
        </div>
      </main>
      
      {/* Scrollbar styling injected inline for simplicity */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}

