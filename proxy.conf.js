
const fs = require('node:fs');
const path = require('node:path');

function readEnvFile() {
  try {
    const text = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
    const entries = [];
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (match) entries.push([match[1], match[2].replace(/^['"]|['"]$/g, '')]);
    }
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

const env = { ...readEnvFile(), ...process.env };
const key = env.CORE_API_KEY && env.CORE_API_KEY !== 'your-key-here' ? env.CORE_API_KEY : '';

if (!key) {
  console.warn(
    '\n[proxy] No CORE_API_KEY found. Copy .env.local.example to .env.local and add your key.\n',
  );
}

module.exports = {
  '/core-api': {

    target: env.CORE_API_ORIGIN || 'https://api.core.ac.uk',
    changeOrigin: true,
    secure: true,
    pathRewrite: { '^/core-api': '/v3' },
    headers: key ? { Authorization: `Bearer ${key}` } : {},
  },
};
