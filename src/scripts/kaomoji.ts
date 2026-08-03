import { onPageReady } from '../animations';

const FACES = ['(｡･∀･)ﾉﾞ', '(*^▽^*)', 'ヽ(´▽`)ノ', '(≧◡≦)', '٩(ˊᗜˋ*)و', '( ﾟヮﾟ)'];

function pick(): string {
  return FACES[Math.floor(Math.random() * FACES.length)];
}

function initKaomoji(): void {
  const el = document.getElementById('footer-kaomoji');
  if (el) el.textContent = pick();
}

onPageReady(initKaomoji);
