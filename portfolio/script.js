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
