import { onPageReady } from '../../animations';
import { completionFor, updateGhost } from './completion';
import {
  closeBar,
  els,
  isOpen,
  lockScroll,
  openBar,
  placeholderIsCleared,
  replayTranscript,
  updatePrompt,
} from './dom';
import { hasHistory, historyNext, historyPrev, runCommand } from './run';

let hotkeyBound = false;
let keepOpenAcrossNav = false;

function bindInput(input: HTMLInputElement): void {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runCommand(input.value);
      input.value = '';
      updateGhost();
    } else if (e.key === 'ArrowUp') {
      if (!hasHistory()) return;
      e.preventDefault();
      input.value = historyPrev(input.value);
      updateGhost();
    } else if (e.key === 'ArrowDown') {
      if (!hasHistory()) return;
      e.preventDefault();
      input.value = historyNext(input.value);
      updateGhost();
    } else if (e.key === 'ArrowRight') {
      const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
      if (!atEnd) return;
      const completion = completionFor(input.value);
      if (!completion) return;
      e.preventDefault();
      input.value = completion;
      input.setSelectionRange(completion.length, completion.length);
      updateGhost();
    }
  });

  input.addEventListener('input', updateGhost);
}

function bindGlobalKeys(): void {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      isOpen() ? closeBar() : openBar();
    } else if (e.key === 'Escape' && isOpen()) {
      closeBar();
    }
  });
}

function bindNavHandoff(): void {
  document.addEventListener('astro:before-swap', () => {
    keepOpenAcrossNav = isOpen();
  });

  document.addEventListener('astro:after-swap', () => {
    if (!keepOpenAcrossNav) return;
    keepOpenAcrossNav = false;

    const { backdrop, panel, input, log } = els();
    if (!backdrop || !panel || !input || !log) return;

    replayTranscript(log);
    if (placeholderIsCleared()) input.placeholder = '';

    backdrop.classList.add('is-open');
    backdrop.setAttribute('aria-hidden', 'false');
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    lockScroll();
    updatePrompt();
    input.focus();
  });
}

function initCommandBar(): void {
  const { toggle, backdrop, input } = els();
  if (!toggle || !backdrop || !input) return;

  updatePrompt();

  if (toggle.dataset.bound !== '1') {
    toggle.dataset.bound = '1';
    toggle.addEventListener('click', () => openBar());
  }

  if (backdrop.dataset.bound !== '1') {
    backdrop.dataset.bound = '1';
    backdrop.addEventListener('click', () => closeBar());
  }

  if (input.dataset.bound !== '1') {
    input.dataset.bound = '1';
    if (placeholderIsCleared()) input.placeholder = '';
    bindInput(input);
  }

  if (!hotkeyBound) {
    hotkeyBound = true;
    bindGlobalKeys();
    bindNavHandoff();
  }
}

onPageReady(initCommandBar);
