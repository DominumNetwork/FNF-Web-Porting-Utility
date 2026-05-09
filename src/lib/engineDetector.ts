export type EngineType = 'Psych Engine' | 'Codename Engine' | 'Leather Engine' | 'JS Engine' | 'Unknown';

export interface DetectionResult {
  engine: EngineType;
  confidence: number;
  filesToFix: string[];
  hasVideos: boolean;
  totalFiles: number;
}

export function detectEngine(zipFilename: string, fileNames: string[]): DetectionResult {
  let isJsEngine = false;
  let isCodename = false;
  let isLeather = false;
  let isPsych = false;

  let hasVideos = false;
  const filesToFix: string[] = [];

  const allPaths = [zipFilename, ...fileNames];

  allPaths.forEach(file => {
    const lower = file.toLowerCase();

    // Video check (skip zip file name for this check)
    if (file !== zipFilename && lower.endsWith('.mp4')) {
      hasVideos = true;
    }

    // JS Engine case sensitivity check
    if (file !== zipFilename && lower.includes('songs/') && (lower.endsWith('voices.ogg') || lower.endsWith('inst.ogg'))) {
      const parts = file.split('/');
      const filename = parts[parts.length - 1];
      
      // We want to force it exactly to Voices.ogg or Inst.ogg 
      if (lower.endsWith('voices.ogg') && filename !== 'Voices.ogg') {
        filesToFix.push(file);
      }
      if (lower.endsWith('inst.ogg') && filename !== 'Inst.ogg') {
        filesToFix.push(file);
      }
    }

    // Heuristics based on name markers
    if (lower.includes('js_engine') || lower.includes('jsengine') || lower.includes('js engine') || lower.includes('friday-night-funkin-js-engine') || lower.includes('souless')) {
      isJsEngine = true;
    }
    if (lower.includes('leather_') || lower.includes('leather engine') || lower.includes('leatherengine')) {
      isLeather = true;
    }
    if (lower.includes('codename_') || lower.includes('codename engine') || lower.includes('codenameengine')) {
      isCodename = true;
    }

    if (lower.includes('mods/') || lower.includes('custom_events/')) {
      isPsych = true;
    }
    if (lower.includes('source/') && lower.includes('assets/')) {
      isCodename = true;
    }
  });

  // Priority: Specific Forks > General Base (Psych)
  let topEngine: EngineType = 'Psych Engine'; // Default fallback
  
  if (isJsEngine) {
    topEngine = 'JS Engine';
  } else if (isLeather) {
    topEngine = 'Leather Engine';
  } else if (isCodename) {
    topEngine = 'Codename Engine';
  } else if (isPsych) {
    topEngine = 'Psych Engine';
  }

  return {
    engine: topEngine,
    confidence: 100, // Determined via direct feature flags
    filesToFix,
    hasVideos,
    totalFiles: fileNames.length
  };
}