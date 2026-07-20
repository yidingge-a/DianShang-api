import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { tmpdir } from 'os';
import { devLogger } from '@meituan-nocode/vite-plugin-dev-logger';
import {
  devHtmlTransformer,
  prodHtmlTransformer,
} from '@meituan-nocode/vite-plugin-nocode-html-transformer';
import react from '@vitejs/plugin-react';

const CHAT_VARIABLE = process.env.CHAT_VARIABLE || '';
const PUBLIC_PATH = process.env.PUBLIC_PATH || '';
const DISABLE_NOCODE = process.env.VITE_DISABLE_NOCODE === '1';

const isProdEnv = process.env.NODE_ENV === 'production';
const publicPath = (isProdEnv && CHAT_VARIABLE)
  ? PUBLIC_PATH + '/' + CHAT_VARIABLE
  : PUBLIC_PATH + '/';
const outDir = (isProdEnv && CHAT_VARIABLE) ? 'build/' + CHAT_VARIABLE : 'build';

async function loadPlugins() {
  const plugins = [react()];

  if (!DISABLE_NOCODE) {
    if (isProdEnv) {
      if (CHAT_VARIABLE) {
        plugins.push(prodHtmlTransformer(CHAT_VARIABLE));
      }
    } else {
      plugins.unshift(
        devLogger({
          dirname: resolve(tmpdir(), '.nocode-dev-logs'),
          maxFiles: '3d',
        }),
      );
      plugins.push(devHtmlTransformer(CHAT_VARIABLE));
    }
  }

  if (process.env.NOCODE_COMPILER_PATH) {
    const { componentCompiler } = await import(process.env.NOCODE_COMPILER_PATH);
    plugins.push(componentCompiler());
  }
  return plugins;
}

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const plugins = await loadPlugins();
  
  return {
    server: {
      // Windows 下用 0.0.0.0，确保 127.0.0.1 与 localhost 均可访问
      host: '0.0.0.0',
      port: 8080,
      strictPort: true,
      hmr: {
        overlay: true,
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
    plugins,
    base: publicPath,
    build: {
      outDir,
    },
    resolve: {
      alias: [
        {
          find: '@',
          replacement: fileURLToPath(new URL('./src', import.meta.url)),
        },
        {
          find: 'lib',
          replacement: resolve(__dirname, 'lib'),
        },
      ],
    },
  };
});
