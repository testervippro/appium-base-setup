const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { execSync } = require('child_process');
const os = require('os');

// Setup paths
const userHome = os.homedir();
const sdkPath = path.join(userHome, '.android_sdk');
const zipPath = path.join(__dirname, 'commandlinetools-win-13114758_latest.zip');
const toolsPath = path.join(sdkPath, 'cmdline-tools', 'latest', 'bin');
const sdkManagerCommand = path.join(toolsPath, 'sdkmanager.bat');
const avdManagerCommand = path.join(toolsPath, 'avdmanager.bat');
const emulatorPath = path.join(sdkPath, 'emulator', 'emulator.exe');
const platformToolsPath = path.join(sdkPath, 'platform-tools');

// AVD details
const avdName = 'iphone';
const avdDir = path.join(userHome, '.android', 'avd', `${avdName}.avd`);
const systemImage = "system-images;android-33;google_apis_playstore;x86_64";

// Step 1: Create .android_sdk directory
if (!fs.existsSync(sdkPath)) {
    fs.mkdirSync(sdkPath, { recursive: true });
    console.log(`Created SDK directory: ${sdkPath}`);
}

// Step 2: Extract command-line tools zip
const zip = new AdmZip(zipPath);
zip.extractAllTo(sdkPath, true);
console.log(`Extracted ZIP to: ${sdkPath}`);

// Step 3: Fix directory structure for cmdline-tools
const cmdlineToolsPath = path.join(sdkPath, 'cmdline-tools');
if (!fs.existsSync(path.join(cmdlineToolsPath, 'latest'))) {
    fs.mkdirSync(path.join(cmdlineToolsPath, 'latest'), { recursive: true });
    const files = fs.readdirSync(cmdlineToolsPath);
    files.forEach(file => {
        if (file !== 'latest') {
            fs.renameSync(
                path.join(cmdlineToolsPath, file),
                path.join(cmdlineToolsPath, 'latest', file)
            );
        }
    });
    console.log('Fixed cmdline-tools directory structure.');
}

// Step 4: Set environment variables and add emulator/adb to PATH
process.env.PATH = `${toolsPath};${platformToolsPath};${sdkPath}\\emulator;${process.env.PATH}`;
process.env.ANDROID_HOME = sdkPath;
process.env.ANDROID_SDK_ROOT = sdkPath;



// Step 5: Check if sdkmanager exists
if (!fs.existsSync(sdkManagerCommand)) {
    console.error(' sdkmanager not found.');
    process.exit(1);
}

// Step 6: Install required SDK packages
const installPackages = [
    "platforms;android-33",
    "build-tools;33.0.2",
    "platform-tools",
    "emulator",
    systemImage
];

installPackages.forEach(pkg => {
    console.log(`Installing: ${pkg}`);
    try {
        execSync(`"${sdkManagerCommand}" --install "${pkg}"`, { stdio: 'inherit' });
    } catch (err) {
        console.error(` Failed to install ${pkg}:`, err.message);
    }
});

// Step 7: Accept licenses
console.log('\nAccepting licenses...');
try {
    execSync(`"${sdkManagerCommand}" --licenses --sdk_root=${sdkPath}`, {
        input: 'y\n'.repeat(100),
        stdio: ['pipe', 'inherit', 'inherit']
    });
} catch (err) {
    console.error(' Failed to accept licenses:', err.message);
}

console.log(' SDK setup complete.');

// Step 8: Create or recreate the AVD
console.log(`\nChecking if AVD '${avdName}' exists...`);
try {
    if (fs.existsSync(avdDir)) {
        console.log(`AVD '${avdName}' already exists. Recreating with --force...`);
    } else {
        console.log(`AVD '${avdName}' not found. Creating...`);
    }

    execSync(`"${avdManagerCommand}" create avd -n ${avdName} --device pixel -k "${systemImage}" --force`, {
        stdio: 'inherit',
        env: {
            ...process.env,
            ANDROID_SDK_ROOT: sdkPath
        }
    });

    console.log(` AVD '${avdName}' created successfully.`);
} catch (err) {
    console.error(` Failed to create AVD '${avdName}':`, err.message);
    process.exit(1);
}

// Command to permanently add paths to the system PATH using setx
const command = `setx PATH "%PATH%;${platformToolsPath};${emulatorPath}"`;

try {
    execSync(command, { stdio: 'inherit' });
    console.log('Successfully added paths to the system PATH.');
} catch (err) {
    console.error('Failed to update PATH:', err.message);
}


// Step 9: Launch the AVD
console.log(` Launching AVD '${avdName}'...`);
if (fs.existsSync(emulatorPath)) {
    try {
        execSync(`"${emulatorPath}" -avd ${avdName}`, {
            stdio: 'inherit'
        });
        console.log(` AVD '${avdName}' launched successfully.`);
    } catch (err) {
        console.error(` Failed to launch AVD '${avdName}':`, err);
    }
} else {
    console.error(' Emulator not found. Make sure the emulator package is installed correctly.');
}





