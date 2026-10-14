import type { Preview } from "@storybook/react-vite";
import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "@omniviewdev/base-ui/styles.css";
import "@omniviewdev/editors/styles.css";

import { ThemeProvider } from "@omniviewdev/base-ui";
import { RightDrawerContext, SnackbarProvider } from "@omniviewdev/runtime";
// The published runtime's SnackbarProvider still needs the legacy notification
// stack; the plugin itself does not import @omniviewdev/ui.
import { NotificationStackProvider } from "@omniviewdev/ui/feedback";

const noopDrawerContext = {
  openDrawer: () => {},
  closeDrawer: () => {},
  showResourceSidebar: (...args: unknown[]) => {
    console.log("[Storybook] showResourceSidebar called with:", args);
  },
  isOpen: false,
};

const withProviders = (Story: React.FC) => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  }));

  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider initialTheme="dark" persist={false}>
      <NotificationStackProvider>
        <SnackbarProvider>
          <RightDrawerContext.Provider value={noopDrawerContext}>
            <Story />
          </RightDrawerContext.Provider>
        </SnackbarProvider>
      </NotificationStackProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },

  decorators: [withProviders],
};

export default preview;
