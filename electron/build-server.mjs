import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconvLitePath = path.join(__dirname, '..', 'node_modules', 'iconv-lite');

const commonOptions = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  logLevel: 'info',
  alias: {
    // 将所有嵌套的 iconv-lite 都指向顶层版本，确保只有一个实例
    'iconv-lite': iconvLitePath,
  },
};

// Build 1: server.cjs
esbuild.build({
  ...commonOptions,
  entryPoints: [path.join(__dirname, '..', 'api', 'server.ts')],
  outfile: path.join(__dirname, 'server.cjs'),
}).then(() => {
  console.log('Server bundled to electron/server.cjs');
}).catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});

// Build 2: sea-bundle.cjs
esbuild.build({
  ...commonOptions,
  entryPoints: [path.join(__dirname, 'sea-entry.cjs')],
  outfile: path.join(__dirname, 'sea-bundle.cjs'),
}).then(() => {
  console.log('SEA bundle created at electron/sea-bundle.cjs');
}).catch((err) => {
  console.error('SEA build failed:', err);
  process.exit(1);
});
