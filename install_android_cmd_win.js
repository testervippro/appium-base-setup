const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Setup paths
const userHome = os.homedir();
const sdkPath = path.join(userHome, '.android_sdk');
const avdDir = path.join(userHome, '.android', 'avd');
const avdName = 'iphone';
const avdFolderPath = path.join(avdDir, `${avdName}.avd`);
const quickbootChoiceFile = path.join(avdFolderPath, 'quickbootChoice.ini');
const zipPath = path.join(__dirname, 'commandlinetools-win-13114758_latest.zip');
const toolsPath = path.join(sdkPath, 'cmdline-tools', 'latest', 'bin');
const sdkManagerCommand = path.join(toolsPath, 'sdkmanager.bat');
const avdManagerCommand = path.join(toolsPath, 'avdmanager.bat');
const emulatorPath = path.join(sdkPath, 'emulator', 'emulator.exe');
const platformToolsPath = path.join(sdkPath, 'platform-tools');
const systemImage = "system-images;android-33;google_apis_playstore;x86_64";

// Kill adb processes
try {
    execSync('taskkill /F /IM adb.exe', { stdio: 'inherit' });
} catch (err) {
    console.warn('adb process not found or already stopped.');
}

// Remove old SDK and AVD
if (fs.existsSync(sdkPath)) {
    fs.rmSync(sdkPath, { recursive: true, force: true });
    console.log(`Removed SDK directory: ${sdkPath}`);
}
if (fs.existsSync(avdFolderPath)) {
    fs.rmSync(avdFolderPath, { recursive: true, force: true });
    console.log(`Removed AVD folder: ${avdFolderPath}`);
}
if (fs.existsSync(quickbootChoiceFile)) {
    fs.unlinkSync(quickbootChoiceFile);
    console.log(`Removed quickbootChoice.ini: ${quickbootChoiceFile}`);
}

// Clear environment variables
try {
    execSync('setx ANDROID_HOME ""');
    execSync('setx ANDROID_SDK_ROOT ""');
} catch (err) {
    console.warn("Failed to clear environment variables.");
}

// Create SDK directory
fs.mkdirSync(sdkPath, { recursive: true });

// Extract zip file using PowerShell (no external lib)
execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${sdkPath}' -Force"`);

// Fix directory structure
const cmdlineToolsPath = path.join(sdkPath, 'cmdline-tools');
const latestPath = path.join(cmdlineToolsPath, 'latest');
if (!fs.existsSync(latestPath)) {
    fs.mkdirSync(latestPath, { recursive: true });
    const files = fs.readdirSync(cmdlineToolsPath);
    files.forEach(file => {
        if (file !== 'latest') {
            fs.renameSync(
                path.join(cmdlineToolsPath, file),
                path.join(latestPath, file)
            );
        }
    });
}

// Set environment variables temporarily
process.env.PATH = `${toolsPath};${platformToolsPath};${sdkPath}\\emulator;${process.env.PATH}`;
process.env.ANDROID_HOME = sdkPath;
process.env.ANDROID_SDK_ROOT = sdkPath;

// Install packages
const installPackages = [
    "platforms;android-33",
    "build-tools;33.0.2",
    "platform-tools",
    "emulator",
    systemImage
];

installPackages.forEach(pkg => {
    try {
        execSync(`"${sdkManagerCommand}" --install "${pkg}"`, { stdio: 'inherit' });
    } catch (err) {
        console.error(`Failed to install ${pkg}:`, err.message);
    }
});

// Accept licenses
try {
    execSync(`"${sdkManagerCommand}" --licenses --sdk_root=${sdkPath}`, {
        input: 'y\n'.repeat(100),
        stdio: ['pipe', 'inherit', 'inherit']
    });
} catch (err) {
    console.error('Failed to accept licenses:', err.message);
}

// Create AVD
try {
    execSync(`"${avdManagerCommand}" create avd -n ${avdName} --device pixel -k "${systemImage}" --force`, {
        stdio: 'inherit',
        env: { ...process.env, ANDROID_SDK_ROOT: sdkPath }
    });
    console.log(`AVD '${avdName}' created.`);
} catch (err) {
    console.error(`Failed to create AVD '${avdName}':`, err.message);
    process.exit(1);
}

// Set environment variables permanently
try {
    execSync(`setx PATH "%PATH%;${platformToolsPath};${sdkPath}\\emulator"`, { stdio: 'inherit' });
    execSync(`setx ANDROID_HOME "${sdkPath}"`, { stdio: 'inherit' });
    execSync(`setx ANDROID_SDK_ROOT "${sdkPath}"`, { stdio: 'inherit' });
} catch (err) {
    console.error('Failed to set environment variables:', err.message);
}

// Launch AVD
if (fs.existsSync(emulatorPath)) {
    try {
        execSync(`"${emulatorPath}" -avd ${avdName}`, { stdio: 'inherit' });
    } catch (err) {
        console.error(`Failed to launch emulator:`, err.message);
    }
} else {
    console.error("Emulator not found. Make sure 'emulator' package is installed.");
}
