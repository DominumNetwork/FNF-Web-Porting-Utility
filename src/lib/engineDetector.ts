export type EngineType = 'Psych Engine' | 'Codename Engine' | 'Leather Engine' | 'JS Engine' | 'Unknown';

export interface DetectionResult {
  engine: EngineType;
  confidence: number;
  filesToFix: string[];
  hasVideos: boolean;
  totalFiles: number;
}

export function detectEngine(fileNames: string[]): DetectionResult {
  let codenameScore = 0;
  let psychScore = 0;
  let leatherScore = 0;
  let jsEngineScore = 0;

  let hasVideos = false;
  const filesToFix: string[] = [];

  fileNames.forEach(file => {
    const lower = file.toLowerCase();

    // Video check
    if (lower.endsWith('.mp4')) {
      hasVideos = true;
    }

    // JS Engine case sensitivity check (strict formatting required from prompt)
    if (lower.includes('songs/') && (lower.endsWith('voices.ogg') || lower.endsWith('inst.ogg'))) {
      const parts = file.split('/');
      const filename = parts[parts.length - 1];
      
      // We want to force it exactly to Voices.ogg or Inst.ogg 
      // if it's already exact, no change needed. But any lowercase variation needs fixing.
      if (lower.endsWith('voices.ogg') && filename !== 'Voices.ogg') {
        filesToFix.push(file);
      }
      if (lower.endsWith('inst.ogg') && filename !== 'Inst.ogg') {
        filesToFix.push(file);
      }
    }

    // Heuristics
    if (lower.includes('js_engine') || lower.includes('jsengine-master') || lower.includes('js engine') || lower.includes('friday-night-funkin-js-engine')) {
      jsEngineScore += 10;
    }
    if (lower.includes('leather_') || lower.includes('leather engine') || lower.includes('leatherengine')) {
      leatherScore += 10;
    }
    if (lower.includes('codename_') || lower.includes('codename engine') || lower.includes('codenameengine')) {
      codenameScore += 10;
    }

    if (lower.includes('mods/') || lower.includes('custom_events/')) {
      psychScore += 1;
    }
    if (lower.includes('source/') && lower.includes('assets/')) {
      codenameScore += 1;
    }
  });

  const scores: Record<EngineType, number> = {
    'Codename Engine': codenameScore,
    'Leather Engine': leatherScore,
    'JS Engine': jsEngineScore,
    'Psych Engine': psychScore,
    'Unknown': 0
  };

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topScore = sorted[0][1];
  const topEngine = topScore > 0 ? (sorted[0][0] as EngineType) : 'Psych Engine'; // Default to Psych generally

  return {
    engine: topEngine,
    confidence: topScore,
    filesToFix,
    hasVideos,
    totalFiles: fileNames.length
  };
}
