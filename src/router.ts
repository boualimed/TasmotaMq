// router.ts (with fixes: replace 'shouldNavigate' with 'condition' to match expected plugin property name)
import { html } from 'lit';

if (!(globalThis as any).URLPattern) {
  await import("urlpattern-polyfill");
}

import { Router } from '@thepassle/app-tools/router.js';
import { lazy } from '@thepassle/app-tools/router/plugins/lazy.js';

// @ts-ignore
import { title } from '@thepassle/app-tools/router/plugins/title.js';

// Import auth service
import { authService } from './services/auth.service.js';

import './pages/app-home.js';
import './components/features/auth/auth-login.js';
import './components/app/device-config.js';
import './components/renders/dropdown.js';
import './components/features/db/firebase-config.js';
import './components/features/db/supabase-config.js';
import './components/features/ai/ai-settings.component.js';
import './components/features/auth/account-deletion.js';
import './components/features/db/sensor-history.component.js';
import  './components/renders/subscription-manager.component.js'
import './components/features/telegram/telegram-config.component.js';
import './components/features/shield/emergency-controls.component.js';
import './components/features/shield/shield-dashboard.component.js';
const baseURL: string = (import.meta as any).env.BASE_URL;

// Auth guard plugin
export const authGuard = () => ({
  condition() {
    if (!authService.isAuthenticated()) {
      router.navigate(resolveRouterPath('login'));
      return false;
    }
    return true;
  }
});

export const router = new Router({
  routes: [
    {
      path: resolveRouterPath(),
      title: 'Home',
      plugins: [
        {
          condition() {
            // Redirect authenticated users to config
            if (authService.isAuthenticated()) {
              router.navigate(resolveRouterPath('device-config'));
              return false;
            }
            // Redirect unauthenticated users to login
            router.navigate(resolveRouterPath('login'));
            return false;
          }
        }
      ],
      render: () => html`<app-home></app-home>`
    },
    {
      path: resolveRouterPath('login'),
      title: 'Login - Tasmota Controller',
      plugins: [
        {
          condition() {
            // If already authenticated, redirect to config
            if (authService.isAuthenticated()) {
              router.navigate(resolveRouterPath('device-config'));
              return false;
            }
            return true;
          }
        }as any  // Type assertion to bypass check
      ],
      render: () => html`<auth-login></auth-login>`
    },
    {
      path: resolveRouterPath('device-config'),
      title: 'Device Configuration',
      render: () => html`<device-config></device-config>`
    },
    {
      path: resolveRouterPath('about'),
      title: 'About',
      plugins: [
        lazy(() => import('./pages/app-about/app-about.js')),
      ],
      render: () => html`<app-about></app-about>`
    },

    {
      path: resolveRouterPath('firebase'),
      title: 'Firebase Configuration',
      plugins: [
        lazy(() => import('./components/features/db/firebase-config.js')),
      ],
      render: () => html`<firebase-config></firebase-config>`
    },

    {
      path: resolveRouterPath('supabase'),
      title: 'Supabase Configuration',
      plugins: [
        lazy(() => import('./components/features/db/supabase-config.js')),
      ],
      render: () => html`<supabase-config></supabase-config>`
    },

    {
      path: resolveRouterPath('sensor'),
      title: 'Supabase Configuration',
      plugins: [
        lazy(() => import('./components/features/db/sensor-history.component.js')),
      ],
      render: () => html`<sensor-history></sensor-history>`
    },


    {
      path: resolveRouterPath('deletion'),
      title: 'Supabase Configuration',
      plugins: [
        lazy(() => import('./components/features/auth/account-deletion.js')),
      ],
      render: () => html`<account-deletion></account-deletion>`
    },

    {
      path: resolveRouterPath('subscription'),
      title: 'Subscription',
      plugins: [
        lazy(() => import('./components/renders/subscription-manager.component')),
      ],
      render: () => html`<subscription-manager></subscription-manager>`
    },



    {
      path: resolveRouterPath('ollama'),
      title: 'Ollama Configuration',
      plugins: [
        lazy(() => import('./components/features/ai/ai-settings.component.js')),
      ],
      render: () => html`<ai-settings></ai-settings>`
    },

    {
      path: resolveRouterPath('telegram'),
      title: 'telegram Configuration',
      plugins: [
        lazy(() => import('./components/features/telegram/telegram-config.component.js')),
      ],
      render: () => html`<telegram-config></telegram-config>`
    },
    {
      path: resolveRouterPath('shieldsemrgency'),
      title: 'emergency Controls',
      plugins: [
        lazy(() => import('./components/features/shield/emergency-controls.component.js')),
      ],
      render: () => html`<emergency-controls></emergency-controls>`
    },

    {
      path: resolveRouterPath('dashboard'),
      title: 'dashboard',
      plugins: [
        lazy(() => import('./components/features/shield/shield-dashboard.component.js')),
      ],
      render: () => html`<shield-dashboard></shield-dashboard>`
    },
  ]
});

// This function will resolve a path with whatever Base URL was passed to the vite build process.
// Use of this function throughout the starter is not required, but highly recommended, especially if you plan to use GitHub Pages to deploy.
// If no arg is passed to this function, it will return the base URL.

export function resolveRouterPath(unresolvedPath?: string) {
  var resolvedPath = baseURL;
  if(unresolvedPath) {
    resolvedPath = resolvedPath + unresolvedPath;
  }

  return resolvedPath;
}

// Listen for auth state changes
authService.subscribe((isAuthenticated) => {
  if (!isAuthenticated) {
    // User logged out, redirect to login
    router.navigate(resolveRouterPath('login'));
  }
});