import { onPageReady } from '../animations';
import { DEFAULT_PHASE, type MoodPhase } from '../config/mood';

const FACES: Record<MoodPhase, string[]> = {
  late: ['(－_－) zzZ', '(´ω｀).｡oO', '( ﾉД`)ﾉ', '(ᴗ_ᴗ｡)'],
  dawn: ['( ˘ω˘ )', '(´｡• ω •｡`)', '( -_-)旦~'],
  morning: ['(*^▽^*)', '٩(ˊᗜˋ*)و', '( ﾟヮﾟ)'],
  afternoon: ['(｡･∀･)ﾉﾞ', '( ﾟヮﾟ)', '(≧◡≦)'],
  evening: ['ヽ(´▽`)ノ', '(≧◡≦)', '(*^▽^*)'],
  night: ['(´ω｀).｡oO', '( -_-)旦~', '(｡･ω･｡)'],
};

function currentPhase(): MoodPhase {
  const phase = document.documentElement.dataset.moodPhase;
  return phase && phase in FACES ? (phase as MoodPhase) : DEFAULT_PHASE;
}

function pick(): string {
  const pool = FACES[currentPhase()];
  return pool[Math.floor(Math.random() * pool.length)];
}

function initKaomoji(): void {
  const el = document.getElementById('footer-kaomoji');
  if (el) el.textContent = pick();
}

onPageReady(initKaomoji);
