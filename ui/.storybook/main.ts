import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],

  addons: [
    "@storybook/addon-onboarding",
    "@storybook/addon-links",
    "@chromatic-com/storybook",
    "@storybook/addon-themes",
    "@storybook/addon-docs"
  ],

  framework: {
    name: "@storybook/react-vite",
    options: {},
  },

  viteFinal(config) {
    // Strip the omniviewExternals plugin so Storybook resolves real modules
    // from node_modules instead of window.__OMNIVIEW_SHARED__ shims.
    config.plugins = (config.plugins ?? []).filter((p) => {
      const name = p && typeof p === 'object' && 'name' in p
        ? (p as { name: string }).name
        : undefined;
      return !name?.startsWith('omniview-');
    });
    return config;
  },
};
export default config;
