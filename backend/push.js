const { execSync } = require('child_process');
try {
  console.log('Running prisma db push...');
  const output = execSync('npx prisma db push', { cwd: __dirname, encoding: 'utf-8' });
  console.log(output);
} catch (error) {
  console.error('Error:', error.message);
  if (error.stdout) console.log('Stdout:', error.stdout);
  if (error.stderr) console.error('Stderr:', error.stderr);
}
