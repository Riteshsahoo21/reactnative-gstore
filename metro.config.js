const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {execSync} = require('child_process');

// Automatically reverse port 5000 (backend API) and 8081 (Metro) whenever Metro bundler starts
try {
  execSync('adb reverse tcp:5000 tcp:5000', {stdio: 'ignore'});
  execSync('adb reverse tcp:8081 tcp:8081', {stdio: 'ignore'});
} catch (e) {
  // Silent ignore if adb is not present or device is not connected
}

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

