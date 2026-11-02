import fs from 'node:fs';
// Capacitor regenerates this file. Select only Google, excluding the optional
// Facebook integration from the Firebase authentication plugin on every sync.
const manifest = 'ios/App/CapApp-SPM/Package.swift';
let source = fs.readFileSync(manifest, 'utf8');
source = source.replace('// swift-tools-version: 5.9', '// swift-tools-version: 6.1');
source = source.replace('.package(name: "CapacitorFirebaseAuthentication", path: "../../../node_modules/@capacitor-firebase/authentication")', '.package(name: "CapacitorFirebaseAuthentication", path: "../../../node_modules/@capacitor-firebase/authentication", traits: ["Google"])');
fs.writeFileSync(manifest, source);
