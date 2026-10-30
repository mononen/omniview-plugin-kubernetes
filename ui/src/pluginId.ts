/**
 * The ID this plugin is installed under. It comes from plugin.yaml (or
 * OMNIVIEW_PLUGIN_ID) at build time, so use it instead of writing
 * 'kubernetes' for transport calls, session ownership, and UI registrations.
 * Canonical resource reference providers remain 'kubernetes'; resource type
 * identities do not depend on this installation ID.
 */
export const PLUGIN_ID: string = import.meta.env.VITE_OMNIVIEW_PLUGIN_ID;
