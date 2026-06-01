const fs = require('fs');
const { execSync } = require('child_process');

try {
  const envFile = fs.readFileSync('.env', 'utf8');
  const lines = envFile.split('\n').filter(line => line.trim() && !line.startsWith('#'));

  console.log('Adding environment variables to Vercel...');
  for (const line of lines) {
    const [key, ...valueParts] = line.split('=');
    let value = valueParts.join('=').trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    
    if (key && value) {
      console.log(`Setting ${key}...`);
      execSync(`npx vercel env add ${key} production --value "${value}" --yes`, { stdio: 'inherit' });
      execSync(`npx vercel env add ${key} preview --value "${value}" --yes`, { stdio: 'inherit' });
      execSync(`npx vercel env add ${key} development --value "${value}" --yes`, { stdio: 'inherit' });
    }
  }

  console.log('Environment variables set. Starting deployment...');
  execSync('npx vercel --prod --yes', { stdio: 'inherit' });
  console.log('Deployment complete!');
} catch (error) {
  console.error('Deployment failed:', error);
}
