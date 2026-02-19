// scripts/set-storage-cors.js
// Run with: node scripts/set-storage-cors.js
// Requires: @google-cloud/storage (npm install --save-dev @google-cloud/storage)
// And Firebase login: firebase login

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const BUCKET = "snowd-6ca54.firebasestorage.app";
const corsFile = path.join(__dirname, "..", "cors.json");

console.log("Setting CORS config for Firebase Storage bucket:", BUCKET);
console.log("CORS config:", fs.readFileSync(corsFile, "utf-8"));

try {
  // Use gcloud/gsutil if available
  execSync(`gsutil cors set ${corsFile} gs://${BUCKET}`, { stdio: "inherit" });
  console.log("✅ CORS config applied successfully!");
} catch {
  console.log("\n⚠️  gsutil not found. Please apply CORS manually:");
  console.log("\n1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install");
  console.log("2. Run: gcloud auth login");
  console.log(`3. Run: gsutil cors set cors.json gs://${BUCKET}`);
  console.log("\nOR go to Google Cloud Console → Storage → snowd-6ca54.firebasestorage.app → Edit CORS");
  process.exit(1);
}
