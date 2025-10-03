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
import './components/auth-login.js';
import './components/device-config.js';
import './components/dropdown.js';
import './components/firebase-config.js';

const baseURL: string = (import.meta as any).env.BASE_URL;

// Auth guard plugin
const authGuard = () => ({
  condition(context: any) {
    if (!authService.isAuthenticated()) {
      // Redirect to login if not authenticated
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
          condition(context: any) {
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
          condition(context: any) {
            // If already authenticated, redirect to config
            if (authService.isAuthenticated()) {
              router.navigate(resolveRouterPath('device-config'));
              return false;
            }
            return true;
          }
        }
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
        lazy(() => import('./components/firebase-config.js')),
      ],
      render: () => html`<firebase-config></firebase-config>`
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