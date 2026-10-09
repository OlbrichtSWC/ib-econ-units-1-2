import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import './shared/design/tokens.css';
import './app/app.css';

render(<App />, document.getElementById('app')!);

// Offline support. When a new version of the site is published, the page reloads itself
// once it is ready, so students and teachers never stay stuck on an old copy.
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    // Tabs often stay open all day: check for a new version whenever the tab comes back into view.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => undefined);
    });
  },
});
