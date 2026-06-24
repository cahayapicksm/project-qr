import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const imagesDir = path.join(rootDir, "images");
const outputDir = path.join(rootDir, "assets", "data");
const outputFile = path.join(outputDir, "motor-images.json");

const allowedExtensions = [".png", ".jpg", ".jpeg", ".webp"];

const manifest = {};

if (!fs.existsSync(imagesDir)) {
  console.log("Folder images tidak ditemukan.");
  process.exit(0);
}

const motorFolders = fs
  .readdirSync(imagesDir, { withFileTypes: true })
  .filter((item) => item.isDirectory())
  .map((item) => item.name);

motorFolders.forEach((folderName) => {
  const folderPath = path.join(imagesDir, folderName);

  const imageFiles = fs
    .readdirSync(folderPath)
    .filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return allowedExtensions.includes(ext);
    })
    .sort((a, b) => {
      return a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base"
      });
    });

  manifest[folderName] = imageFiles;
});

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputFile, JSON.stringify(manifest, null, 2));

console.log("Motor image manifest berhasil dibuat:");
console.log(outputFile);