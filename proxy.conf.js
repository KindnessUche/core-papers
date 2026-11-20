/**
 * Dev proxy for the CORE API.
 *
 * The browser calls /core-api/*, this proxy forwards it to https://api.core.ac.uk/v3/*
 * and attaches the API key server-side. That gives us two things for free:
 *   1. the key never ships in the browser bundle, and
 *   2. no CORS surprises, because the browser only ever talks to localhost.
 *
 * The key is read from the CORE_API_KEY environment variable or from .env.local.
 */
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
    // CORE_API_ORIGIN lets tests point the proxy at a local stub
    target: env.CORE_API_ORIGIN || 'https://api.core.ac.uk',
    changeOrigin: true,
    secure: true,
    pathRewrite: { '^/core-api': '/v3' },
    headers: key ? { Authorization: `Bearer ${key}` } : {},
  },
};
