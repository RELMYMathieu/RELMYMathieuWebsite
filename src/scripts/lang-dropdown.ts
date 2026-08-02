import { onPageReady } from '../animations';
import { createDropdown } from './dropdown';

function initLangDropdown(): void {
  const toggle = document.getElementById('lang-toggle');
  const menu = document.getElementById('lang-menu');
  if (!toggle || !menu) return;

  createDropdown({ toggle, menu });
}

onPageReady(initLangDropdown);
