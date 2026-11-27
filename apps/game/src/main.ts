import './ui/kit.css';
import './style.css';
import { createFightScreen } from './dovus/screen';
import { createMenuScreen } from './menu/start';
import { createApp } from './screens/manager';

const canvas = document.querySelector<HTMLCanvasElement>('#oyun');
const ui = document.querySelector<HTMLElement>('#arayuz');
if (!canvas || !ui) throw new Error('Sayfa iskeleti eksik: #oyun veya #arayuz bulunamadı');

// /hiz-testi: Aşama 1a teknik kanıt sayfası (ayrı yüklenir); diğer her adres başlık ekranı ve ana menü.
if (location.pathname.replace(/\/+$/, '') === '/hiz-testi') {
  void import('./hiz-testi/index').then((m) => m.startSpeedTest(canvas, ui));
} else {
  const app = createApp(canvas, ui, (route, ctx) =>
    route.name === 'menu' ? createMenuScreen(ctx, route.at) : createFightScreen(ctx, route.name),
  );
  app.go({ name: 'menu' });
}
