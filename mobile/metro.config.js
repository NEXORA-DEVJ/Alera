// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname);

// Sanitize OneDrive ReparsePoint attributes on native packages if needed (Windows)
if (process.platform === 'win32') {
  const base = path.join(projectRoot, 'node_modules');
  const criticalPkgs = ['expo-background-fetch', 'expo-task-manager', 'react-native-webview', 'unimodules-app-loader'];
  for (const pkg of criticalPkgs) {
    const dir = path.join(base, pkg);
    if (!fs.existsSync(dir)) continue;
    function sanitize(d) {
      try {
        for (const item of fs.readdirSync(d, { withFileTypes: true })) {
          const full = path.join(d, item.name);
          if (item.isDirectory()) {
            sanitize(full);
          } else if (item.isSymbolicLink()) {
            const buf = fs.readFileSync(full);
            fs.writeFileSync(full, buf);
          }
        }
      } catch {}
    }
    sanitize(dir);
  }
}

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

config.projectRoot = projectRoot;
config.watchFolders = [projectRoot];

module.exports = config;
