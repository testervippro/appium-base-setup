const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Setup paths
const userHome = os.homedir();
const sdkPath = path.join(userHome, '.android_sdk');
const avdDir = path.join(userHome, '.android', 'avd');
const avdName = 'device';
const avdFolderPath = path.join(avdDir, `${avdName}.avd`);
const quickbootChoiceFile = path.join(avdFolderPath, 'quickbootChoice.ini');

// Step 1: Remove the SDK directory
if (fs.existsSync(sdkPath)) {
    fs.rmdirSync(sdkPath, { recursive: true });
    console.log(`Removed SDK directory: ${sdkPath}`);
} else {
    console.log(`No SDK directory found at ${sdkPath}`);
}

// Step 2: Remove the AVD folder
if (fs.existsSync(avdFolderPath)) {
    fs.rmdirSync(avdFolderPath, { recursive: true });
    console.log(`Removed AVD folder: ${avdFolderPath}`);
} else {
    console.log(`No AVD folder found at ${avdFolderPath}`);
}

// Step 3: Remove the quickbootChoice.ini file if it exists
if (fs.existsSync(quickbootChoiceFile)) {
    fs.unlinkSync(quickbootChoiceFile);
    console.log(`Removed quickbootChoice.ini file: ${quickbootChoiceFile}`);
} else {
    console.log(`No quickbootChoice.ini found at ${quickbootChoiceFile}`);
}

// Step 4: Remove the environment variables from the system
console.log("Removing environment variables...");

try {
    execSync('setx ANDROID_HOME ""');  // Remove ANDROID_HOME
    execSync('setx ANDROID_SDK_ROOT ""');  // Remove ANDROID_SDK_ROOT
    console.log("Environment variables removed.");
} catch (err) {
    console.error("Failed to remove environment variables:", err.message);
}

// Step 5: Remove added paths from system PATH
const emulatorPath = path.join(sdkPath, 'emulator', 'emulator.exe');
const platformToolsPath = path.join(sdkPath, 'platform-tools');

// We need to undo the previous `setx` changes to PATH
try {
    // Revert changes made to PATH by setx
    const command = `setx PATH "%PATH%;"`; // This resets the PATH
    execSync(command, { stdio: 'inherit' });
    console.log("Successfully reverted PATH modification.");
} catch (err) {
    console.error("Failed to revert PATH:", err.message);
}

console.log('Cleanup complete.');
