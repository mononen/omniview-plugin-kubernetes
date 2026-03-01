import type { Preview } from "@storybook/react-vite";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "@fontsource/material-icons";

import { RightDrawerContext, SnackbarProvider } from "@omniviewdev/runtime";
import { NotificationStackProvider } from "@omniviewdev/ui/feedback";
import { AppTheme } from "@omniviewdev/ui/theme";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

const noopDrawerContext = {
  openDrawer: () => {},
  closeDrawer: () => {},
  showResourceSidebar: (...args: unknown[]) => {
    console.log("[Storybook] showResourceSidebar called with:", args);
  },
  isOpen: false,
};

const withProviders = (Story: React.FC) => (
  <QueryClientProvider client={queryClient}>
    <AppTheme defaultMode="dark">
      <NotificationStackProvider>
        <SnackbarProvider>
          <RightDrawerContext.Provider value={noopDrawerContext}>
            <Story />
          </RightDrawerContext.Provider>
        </SnackbarProvider>
      </NotificationStackProvider>
    </AppTheme>
  </QueryClientProvider>
);

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
