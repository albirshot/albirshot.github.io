const dialog = document.querySelector('.film-dialog');
const filmLinks = document.querySelectorAll('[data-film]');
let activeFilmLink;
const mount = document.querySelector('#player-mount');
const loading = document.querySelector('.player-loading');
let loadingTimer;
const playerChoices = document.querySelector('.player-choices');
const primaryChoice = document.querySelector('[data-player="primary"]');
const backupChoice = document.querySelector('[data-player="rutube"]');
let activePlayer;

function selectPlayer(choice) {
  if (!activeFilmLink || choice === activePlayer) return;
  const { film, provider, title, year, duration, rutube } = activeFilmLink.dataset;
  if (choice === 'rutube' && !rutube) return;
  activePlayer = choice;
  clearTimeout(loadingTimer);
  const providerName = choice === 'rutube' ? 'RUTUBE' : provider === 'youtube' ? 'YouTube' : 'Vimeo';
  primaryChoice.setAttribute('aria-pressed', String(choice === 'primary'));
  backupChoice.setAttribute('aria-pressed', String(choice === 'rutube'));
  document.querySelector('.dialog-footer > span').textContent = [year, duration].filter(Boolean).join(' · ') || providerName;
  const directLink = document.querySelector('.dialog-footer a');
  directLink.href = choice === 'rutube' ? rutube : activeFilmLink.href;
  directLink.textContent = `Watch on ${providerName}`;
  loading.hidden = false;
  const player = document.createElement('iframe');
  player.title = `${title} — ${providerName}`;
  if (choice === 'rutube') {
    // Keep the access key: unlisted RUTUBE embeds require the p parameter.
    const source = new URL(rutube);
    const id = source.pathname.split('/').filter(Boolean).pop();
    const embed = new URL(`https://rutube.ru/play/embed/${id}/`);
    embed.searchParams.set('p', source.searchParams.get('p'));
    embed.searchParams.set('autoplay', 'true');
    player.src = embed.href;
  } else {
    player.src = provider === 'youtube'
      ? `https://www.youtube.com/embed/${film}?autoplay=1&playsinline=1`
      : `https://player.vimeo.com/video/${film}?autoplay=1&title=0&byline=0&portrait=0&dnt=1`;
  }
  player.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; clipboard-write; web-share';
  player.allowFullscreen = true;
  player.referrerPolicy = 'strict-origin-when-cross-origin';
  player.addEventListener('load', () => {
    if (mount.firstElementChild === player) {
      clearTimeout(loadingTimer);
      loading.hidden = true;
    }
  });
  mount.replaceChildren(player); // Switching providers also stops the previous player.
  loadingTimer = setTimeout(() => { loading.hidden = true; }, 12000);
}

primaryChoice?.addEventListener('click', () => selectPlayer('primary'));
backupChoice?.addEventListener('click', () => selectPlayer('rutube'));

filmLinks.forEach((filmLink) => filmLink.addEventListener('click', (event) => {
  // Preserve open-in-new-tab gestures and the direct link as a no-JS fallback.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !dialog?.showModal) return;
  event.preventDefault();
  activeFilmLink = filmLink;
  const { provider, title, rutube } = filmLink.dataset;
  document.querySelector('#film-title').textContent = title;
  primaryChoice.textContent = provider === 'youtube' ? 'YouTube' : 'Vimeo';
  playerChoices.hidden = !rutube;
  activePlayer = null;
  selectPlayer('primary');
  dialog.showModal();
  document.body.classList.add('player-open');
}));

document.querySelector('.close-film')?.addEventListener('click', () => dialog.close());
dialog?.addEventListener('click', (event) => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
});
dialog?.addEventListener('close', () => {
  clearTimeout(loadingTimer);
  mount.replaceChildren(); // Removing the player stops audio and playback.
  activePlayer = null;
  document.body.classList.remove('player-open');
  activeFilmLink?.focus({ preventScroll: true });
});

document.querySelector('#year').textContent = new Date().getFullYear();

// A single saved preference is shared by Work, About and legacy Contact URLs.
const themeButton = document.querySelector('.theme-toggle');
function updateThemeButton() {
  const light = document.documentElement.dataset.theme === 'light';
  themeButton?.setAttribute('aria-pressed', String(light));
  themeButton?.setAttribute('aria-label', light ? 'Включить тёмную тему' : 'Включить светлую тему');
  if (themeButton) themeButton.querySelector('.theme-label').textContent = light ? 'F/1.4' : 'F/24';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#faf9f6' : '#101213');
}
updateThemeButton();
themeButton?.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('albirshot-theme', theme); } catch (_) { /* Works without storage too. */ }
  updateThemeButton();
});

// All moving footage streams from YouTube. The local stills remain visible if it cannot load.
const hero = document.querySelector('.hero');
if (hero) {
  const clips = [
    { id: 'wHbSiN3iFlk', start: 105, title: 'ЕТП Балерина' },
    { id: 'M7MMdFPBB64', start: 15, title: '17 мгновений весны' },
    { id: 'Ytj88xTCDbI', start: 4, title: 'Китайский Новый год' }
  ];
  const frames = [...hero.querySelectorAll('.hero-frame')];
  const dots = [...hero.querySelectorAll('[data-slide]')];
  const pauseButton = hero.querySelector('.hero-pause');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let player;
  let ready = false;
  let timer;
  let changeTimer;
  let paused = reducedMotion.matches;
  let onScreen = true;
  let failed = false;
  const running = () => !paused && onScreen && !document.hidden && !dialog?.open;
  function markPause() {
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.setAttribute('aria-label', paused ? 'Включить видеофон' : 'Приостановить видеофон');
    pauseButton.firstElementChild.textContent = paused ? '▶' : 'Ⅱ';
  }
  function loadClip() {
    if (!ready || !running()) return;
    failed = false;
    player.mute();
    player.loadVideoById({ videoId: clips[index].id, startSeconds: clips[index].start, endSeconds: clips[index].start + 13 });
  }
  function chooseClip(next) {
    index = next;
    hero.classList.remove('is-video-playing');
    clearTimeout(changeTimer);
    frames.forEach((frame, i) => frame.classList.toggle('is-active', i === index));
    dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === index)));
    hero.querySelector('#hero-film-name').textContent = clips[index].title;
    // Fade through the matching still instead of exposing a loading iframe.
    changeTimer = setTimeout(loadClip, 800);
  }
  function syncPlayback() {
    clearInterval(timer);
    if (running()) {
      timer = setInterval(() => chooseClip((index + 1) % clips.length), 13000);
      if (ready && !failed) player.playVideo();
    } else {
      clearTimeout(changeTimer);
      if (ready) player.pauseVideo();
      hero.classList.remove('is-video-playing');
    }
    markPause();
  }
  dots.forEach((dot, i) => dot.addEventListener('click', () => {
    chooseClip(i);
    clearInterval(timer);
    if (running()) timer = setInterval(() => chooseClip((index + 1) % clips.length), 13000);
  }));
  pauseButton.addEventListener('click', () => {
    paused = !paused;
    if (!paused) { initVideo(); if (ready) loadClip(); }
    syncPlayback();
  });
  document.addEventListener('visibilitychange', syncPlayback);
  new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; syncPlayback(); }, { threshold: 0.1 }).observe(hero);
  new MutationObserver(syncPlayback).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  reducedMotion.addEventListener('change', (event) => { paused = event.matches; if (!paused) initVideo(); syncPlayback(); });
  // Match the embedded 16:9 frame to the hero without stretching its image.
  function fitVideo() {
    const iframe = hero.querySelector('iframe');
    if (!iframe) return;
    const { width, height } = hero.getBoundingClientRect();
    iframe.style.width = `${Math.max(width, height * 16 / 9)}px`;
    iframe.style.height = `${Math.max(height, width * 9 / 16)}px`;
  }
  new ResizeObserver(fitVideo).observe(hero);
  let requested = false;
  function initVideo() {
    if (requested) return;
    requested = true;
    window.onYouTubeIframeAPIReady = () => {
      player = new YT.Player('hero-player', {
        videoId: clips[index].id,
        playerVars: { autoplay: 1, mute: 1, controls: 0, cc_load_policy: 0, disablekb: 1, fs: 0, playsinline: 1, rel: 0, start: clips[index].start, end: clips[index].start + 13, origin: location.origin },
        events: {
          onReady: () => {
            ready = true;
            const iframe = player.getIframe();
            iframe.tabIndex = -1;
            iframe.title = 'Беззвучные кадры из работ Алексея Бирюкова';
            iframe.setAttribute('aria-hidden', 'true');
            fitVideo();
            if (running()) loadClip(); else player.pauseVideo();
          },
          onApiChange: () => {
            if (player.getOptions?.().includes('captions')) player.unloadModule?.('captions');
          },
          onStateChange: (event) => {
            if (event.data === 1) {
              if (running()) hero.classList.add('is-video-playing'); else player.pauseVideo();
            } else if (event.data === 0 && running()) {
              chooseClip((index + 1) % clips.length);
              clearInterval(timer);
              timer = setInterval(() => chooseClip((index + 1) % clips.length), 13000);
            }
          },
          onError: () => { failed = true; hero.classList.remove('is-video-playing'); }
        }
      });
    };
    const api = document.createElement('script');
    api.src = 'https://www.youtube.com/iframe_api';
    api.async = true;
    document.head.append(api);
  }
  markPause();
  syncPlayback();
  if (!reducedMotion.matches) initVideo();
}
