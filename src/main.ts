import { isSupported, probeBrowser } from './core/support';
import { renderUnsupported } from './ui/Unsupported';

if (isSupported(probeBrowser())) {
  void import('./app').then(({ bootstrap }) => bootstrap());
} else {
  renderUnsupported(document.body, import.meta.env.BASE_URL);
}
