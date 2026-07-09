/* ── Scroll reveals + animated counters ───────────────────────────────
   Progressive: everything is visible without JS (the .js class gates the
   hidden initial state), and reduced-motion visitors get instant, static
   content with final counter values. */

export function initReveals(reducedMotion: boolean): void {
  const nodes = document.querySelectorAll<HTMLElement>('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    nodes.forEach((n) => n.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.18, rootMargin: '0px 0px -40px 0px' },
  );
  nodes.forEach((n) => io.observe(n));
}

export function initCounters(reducedMotion: boolean): void {
  const nodes = document.querySelectorAll<HTMLElement>('[data-to]');
  const finish = (n: HTMLElement) => {
    const to = parseFloat(n.dataset.to || '0');
    const dec = parseInt(n.dataset.decimals || '0', 10);
    n.textContent = to.toFixed(dec);
  };
  if (reducedMotion || !('IntersectionObserver' in window)) {
    nodes.forEach(finish);
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const n = e.target as HTMLElement;
        io.unobserve(n);
        const to = parseFloat(n.dataset.to || '0');
        const dec = parseInt(n.dataset.decimals || '0', 10);
        const dur = 1100;
        const start = performance.now();
        const step = (t: number) => {
          const p = Math.min(1, (t - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          n.textContent = (to * eased).toFixed(dec);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    },
    { threshold: 0.6 },
  );
  nodes.forEach((n) => io.observe(n));
}
