import pluginGlobCopy from '@graysonlang/esp/esbuild-plugin-glob-copy';
import pluginImp from '@graysonlang/esp/esbuild-plugin-imp';
import { runBuild } from '@graysonlang/esp/esbuild-runner';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('package.json', ROOT), 'utf8'));

function readCommitSha() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (err) {
    const sha = (process.env.GITHUB_SHA ?? 'unknown').slice(0, 12);
    const reason = err.stderr?.trim() || err.message;
    console.warn(`Could not read commit SHA, using "${sha}" (${reason}).`);
    return sha;
  }
}

function getOptions(args, verbose, logger) {
  return {
    assetNames: '[name]',
    bundle: true,
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __COMMIT_SHA__: JSON.stringify(readCommitSha()),
    },
    entryPoints: {
      index: 'src/index.js',
      main: 'app/main.js',
    },
    format: 'esm',
    loader: {
      '.html': 'file',
    },
    outdir: 'www',
    plugins: [pluginGlobCopy({ logger }), pluginImp({ logger, verbose })],
    target: ['esnext'],
    ...args,
  };
}

runBuild(getOptions);
