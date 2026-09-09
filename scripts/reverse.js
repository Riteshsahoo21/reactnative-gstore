const { execSync } = require('child_process');

function reversePorts() {
  try {
    console.log('[ADB] Reversing ports 5000 and 8081 for connected Android devices...');
    execSync('adb reverse tcp:5000 tcp:5000', { stdio: 'inherit', timeout: 2000 });
    execSync('adb reverse tcp:8081 tcp:8081', { stdio: 'inherit', timeout: 2000 });
    console.log('[ADB] Successfully reversed tcp:5000 and tcp:8081.');
  } catch (err) {
    console.log('[ADB] Note: No Android device connected or adb not available. Skipping adb reverse.');
  }
}

reversePorts();
