const fs = require('fs');
const path = require('path');

const source = path.resolve(__dirname, '../apps/backend/dist');
const sourceSrc = path.join(source, 'src');
const sourceMigrations = path.join(source, 'migrations');
const packagesToCopy = [
  {
    name: '@pos-checkout/shared',
    source: path.resolve(__dirname, '../packages/shared'),
  },
  {
    name: '@pos-checkout/payment-adapters',
    source: path.resolve(__dirname, '../packages/payment-adapters'),
  },
];
const destination = path.resolve(__dirname, '../functions/backend-dist');

if (!fs.existsSync(sourceSrc)) {
  console.error(
    `Backend build output not found at ${sourceSrc}. Did you run "npm run build --workspace=@pos-checkout/backend"?`,
  );
  process.exit(1);
}

fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });

fs.cpSync(sourceSrc, destination, { recursive: true });

if (fs.existsSync(sourceMigrations)) {
  const destinationMigrations = path.join(destination, 'migrations');
  fs.mkdirSync(destinationMigrations, { recursive: true });
  fs.cpSync(sourceMigrations, destinationMigrations, { recursive: true });
}

for (const pkg of packagesToCopy) {
  const distPath = path.join(pkg.source, 'dist');
  if (!fs.existsSync(distPath)) {
    console.error(
      `Package build output not found for ${pkg.name} at ${distPath}. Did you run the corresponding workspace build?`,
    );
    process.exit(1);
  }

  const packageDestination = path.resolve(
    __dirname,
    '../functions/packages',
    pkg.name.replace('@pos-checkout/', ''),
  );

  fs.rmSync(packageDestination, { recursive: true, force: true });
  fs.mkdirSync(packageDestination, { recursive: true });

  const packageJsonPath = path.join(pkg.source, 'package.json');
  fs.copyFileSync(packageJsonPath, path.join(packageDestination, 'package.json'));
  fs.cpSync(distPath, path.join(packageDestination, 'dist'), { recursive: true });
}

console.log(`✅ Copied backend dist from ${sourceSrc} to ${destination}`);

