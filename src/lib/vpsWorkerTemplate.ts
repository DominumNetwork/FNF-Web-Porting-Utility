export function generateVpsWorker(engineUrl: string): string {
  return `/**
 * Build Server Worker (Node.js API for VPS Server)
 * Instructions:
 * 1. Run 'npm init -y' && 'npm install express multer child_process cors'
 * 2. Save this as worker.js and run 'node worker.js'
 * 3. Ensure 'haxelib', 'haxe', and 'zip' are installed on your VPS.
 */

const express = require('express');
const multer = require('multer');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

const upload = multer({ dest: 'uploads/' });

app.post('/build', upload.single('modZip'), (req, res) => {
  if (!req.file) return res.status(400).send('No mod uploaded.');
  
  const jobId = Date.now().toString();
  const workDir = path.join(__dirname, 'jobs', jobId);
  fs.mkdirSync(workDir, { recursive: true });

  // Stream logs
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const log = (msg) => {
    console.log(msg);
    res.write(\`data: \${JSON.stringify({ log: msg })}\\n\\n\`);
  };

  log('Job initialized: ' + jobId);

  // Background worker logic
  setTimeout(() => {
    try {
      log('Extracting ZIP...');
      execSync(\`unzip -q \${req.file.path} -d \${workDir}/mods\`);
      
      log('Cloning Base Engine (${engineUrl})...');
      execSync(\`git clone --depth 1 https://github.com/${engineUrl} \${workDir}/engine-source\`);
      
      log('Injecting mods...');
      execSync(\`cp -r \${workDir}/mods/* \${workDir}/engine-source/mods/ || true\`);
      
      log('Installing Haxelib dependencies...');
      execSync('haxelib install hmm --quiet', { cwd: \`\${workDir}/engine-source\` });
      execSync('haxelib run hmm install --quiet', { cwd: \`\${workDir}/engine-source\` });

      log('Starting Lime HTML5 Compiler (With Optimizations)...');
      const build = spawn('haxelib', ['run', 'lime', 'build', 'html5', '-release', '-D', 'DISCORD_DISABLE', '-D', 'NO_PRELOAD_ALL'], {
        cwd: \`\${workDir}/engine-source\`
      });

      build.stdout.on('data', data => log(data.toString()));
      build.stderr.on('data', data => log('ERROR: ' + data.toString()));

      build.on('close', code => {
        if (code === 0) {
          log('Standardizing output files for CDN / jsDelivr...');
          const binDir = \`\${workDir}/engine-source/export/release/html5/bin\`;
          
          try {
            const files = fs.readdirSync(binDir);
            const mainJs = files.find(f => f.endsWith('.js') && !f.includes('howler') && !f.includes('pako') && f !== 'funkin.js');
            if (mainJs) {
               fs.renameSync(path.join(binDir, mainJs), path.join(binDir, 'funkin.js'));
               const indexPath = path.join(binDir, 'index.html');
               if (fs.existsSync(indexPath)) {
                   let content = fs.readFileSync(indexPath, 'utf-8');
                   // Replace usage of the old js string with funkin.js
                   content = content.replace(new RegExp(mainJs, 'g'), 'funkin.js');
                   fs.writeFileSync(indexPath, content);
               }
            }
          } catch(e) { log('File standardization warning: ' + e.message); }

          log('Zipping Flat Build...');
          execSync('zip -q -r ../../../../../web_export.zip *', { cwd: binDir });
          log('DONE. Download link ready.');
          res.write(\`data: \${JSON.stringify({ status: 'success', downloadUrl: '/download/' + jobId })}\\n\\n\`);
        } else {
          log('Build failed with code ' + code);
          res.write(\`data: \${JSON.stringify({ status: 'error' })}\\n\\n\`);
        }
        res.end();
      });

    } catch(err) {
      log('FATAL ERROR: ' + err.message);
      res.write(\`data: \${JSON.stringify({ status: 'error' })}\\n\\n\`);
      res.end();
    }
  }, 100);
});

app.get('/download/:jobId', (req, res) => {
  const file = path.join(__dirname, 'jobs', req.params.jobId, 'web_export.zip');
  if (fs.existsSync(file)) {
    res.download(file);
  } else {
    res.status(404).send('Not found');
  }
});

app.listen(8080, () => {
  console.log('Build worker listening on port 8080');
});
`;
}
