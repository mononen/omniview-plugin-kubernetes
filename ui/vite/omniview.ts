import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const shimsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'shims');

/**
 * Shared packages that the published @omniviewdev/vite-plugin (0.3.0) does not
 * know about yet. The host app already exposes them on
 * window.__OMNIVIEW_SHARED__; this resolves them to the local shims in dev and
 * keeps them external in the SystemJS build. Drop it once the vite-plugin is
 * republished with base-ui in its shared list.
 */
const LOCAL_SHARED: Record<string, string> = {
  '@omniviewdev/base-ui': '_omniviewdev__base-ui.mjs',
  '@omniviewdev/editors': '_omniviewdev__editors.mjs',
};

export function localSharedPackages(): Plugin {
  let isBuild = false;
  return {
    name: 'omniview-local-shared',
    enforce: 'pre',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    resolveId(source) {
      const shim = LOCAL_SHARED[source];
      if (!shim) return null;
      return isBuild ? { id: source, external: true } : path.join(shimsDir, shim);
    },
  };
}

/**
 * The host app only loads `assets/entry.js`, so CSS emitted by the build (CSS
 * modules) would never reach the page. Fold it into the entry chunk as a
 * <style> tag that is added when the plugin bundle is evaluated.
 */
export function injectCssIntoEntry(pluginId: string): Plugin {
  return {
    name: 'omniview-inject-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const cssFiles = Object.values(bundle).filter(
        (file) => file.type === 'asset' && file.fileName.endsWith('.css'),
      );
      if (cssFiles.length === 0) return;

      const css = cssFiles
        .map((file) => (file.type === 'asset' ? String(file.source) : ''))
        .join('\n');
      for (const file of cssFiles) delete bundle[file.fileName];

      const entry = Object.values(bundle).find(
        (file) => file.type === 'chunk' && file.isEntry,
      );
      if (!entry || entry.type !== 'chunk') return;

      const attr = `data-omniview-plugin-css`;
      entry.code +=
        `\n;(function(){var id=${JSON.stringify(pluginId)};` +
        `var old=document.querySelector('style[${attr}="'+id+'"]');if(old)old.remove();` +
        `var s=document.createElement('style');s.setAttribute('${attr}',id);` +
        `s.textContent=${JSON.stringify(css)};document.head.appendChild(s);})();\n`;
    },
  };
}
