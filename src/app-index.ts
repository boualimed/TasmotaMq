import { LitElement, css } from 'lit';
import { customElement } from 'lit/decorators.js';

import './pages/app-home';
import './components/header';
import './components/device-config';
import './components/auth-login';
import './styles/global.css';
import { router, resolveRouterPath } from './router';

@customElement('app-index')
export class AppIndex extends LitElement {
  static styles = css`
    main {
      padding-left: 16px;
      padding-right: 16px;
      padding-bottom: 16px;
    }
  `;

  firstUpdated() {
    router.addEventListener('route-changed', () => {
      if ("startViewTransition" in document) {
        (document as any).startViewTransition(() => this.requestUpdate());
      }
      else {
        this.requestUpdate();
      }
    });

    // Listen for navigation events from child components
    this.addEventListener('navigate', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { page } = customEvent.detail;
      if (page === 'dashboard') {
        router.navigate(resolveRouterPath('dashboard'));
      } else if (page === 'home') {
        router.navigate(resolveRouterPath());
      } else if (page === 'about') {
        router.navigate(resolveRouterPath('about'));
      } else if (page === 'device-config') {
        router.navigate(resolveRouterPath('device-config'));
      } else if (page === 'auth-login') {
        router.navigate(resolveRouterPath('login'));
      }
    });
  }

  render() {
    // router config can be round in src/router.ts
    return router.render();
  }
}
