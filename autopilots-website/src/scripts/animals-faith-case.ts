// Presentation only: no CRM, analytics payloads, calls or external data requests.
const root = document.querySelector<HTMLElement>('#af-case');
if (root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = root.querySelector<HTMLButtonElement>('[data-motion]')!;
  let manualQuiet = false;
  const quiet = () => manualQuiet || reduced.matches;
  const syncMotion = () => {
    root.classList.toggle('af-quiet', quiet());
    motionButton.setAttribute('aria-pressed', String(quiet()));
    motionButton.textContent = quiet() ? 'Beweging uit' : 'Minder beweging';
  };
  motionButton.addEventListener('click', () => { manualQuiet = !manualQuiet; syncMotion(); });
  reduced.addEventListener('change', syncMotion);
  syncMotion();

  // Run the decorative handoff currents only while the illustration is visible.
  const handoff = root.querySelector<HTMLElement>('.af-handoff');
  if (handoff) {
    if ('IntersectionObserver' in window) {
      const flowObserver = new IntersectionObserver(entries => {
        handoff.classList.toggle('is-flow-visible', entries[0].isIntersecting);
      }, { threshold: .15 });
      flowObserver.observe(handoff);
    } else handoff.classList.add('is-flow-visible');
  }
  const syncVisibility = () => root.classList.toggle('af-page-hidden', document.hidden);
  document.addEventListener('visibilitychange', syncVisibility);
  syncVisibility();

  // CSS smooth scrolling from the shared layout is overridden per interaction.
  root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const target = document.getElementById(link.hash.slice(1));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: quiet() ? 'instant' : 'smooth', block: 'start' });
      history.replaceState(null, '', link.hash);
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  const collaboration = root.querySelector<HTMLElement>('[data-collaboration]')!;
  const agents = [...root.querySelectorAll<HTMLButtonElement>('[data-agent]')];
  const agentPanels = [...root.querySelectorAll<HTMLElement>('[data-agent-panel]')];
  const connections = root.querySelector<SVGSVGElement>('.af-agent-connections')!;
  const tracks = [...root.querySelectorAll<SVGPathElement>('[data-connection]')];
  const selectedTrack = root.querySelector<SVGPathElement>('[data-selected-connection]')!;
  const current = root.querySelector<SVGPathElement>('[data-connection-current]')!;
  let selectedAgent = 0;
  let routeAnimation: Animation | undefined;
  type Point = [number, number];
  const roundedRoute = (points: Point[]) => {
    let d = `M${points[0].join(' ')}`;
    for (let i = 1; i < points.length - 1; i++) {
      const [x, y] = points[i], before = points[i - 1], after = points[i + 1];
      const incoming = Math.hypot(x - before[0], y - before[1]);
      const outgoing = Math.hypot(after[0] - x, after[1] - y);
      if (!incoming || !outgoing) continue;
      const radius = Math.min(8, incoming / 2, outgoing / 2);
      d += `L${x - (x - before[0]) / incoming * radius} ${y - (y - before[1]) / incoming * radius}Q${x} ${y} ${x + (after[0] - x) / outgoing * radius} ${y + (after[1] - y) / outgoing * radius}`;
    }
    return d + `L${points[points.length - 1].join(' ')}`;
  };
  const drawConnections = () => {
    const bounds = collaboration.getBoundingClientRect();
    const origin = collaboration.querySelector('.af-agent-center .af-wave')!.getBoundingClientRect();
    const boxes = agents.map(button => button.getBoundingClientRect());
    const startX = origin.left + origin.width / 2 - bounds.left;
    const startY = origin.bottom - bounds.top;
    const firstTop = Math.min(...boxes.map(box => box.top)) - bounds.top;
    const busY = startY + (firstTop - startY) * .55;
    connections.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    boxes.forEach((box, i) => {
      const x = box.left + box.width / 2 - bounds.left;
      const y = box.top - bounds.top;
      let points: Point[];
      if (y > firstTop + 10) {
        // Multi-row layouts use the side gutters, never travel through another card.
        const railX = x < startX ? 8 : bounds.width - 8;
        points = [[startX,startY],[startX,busY],[railX,busY],[railX,y-7],[x,y-7],[x,y]];
      } else if (Math.abs(x - startX) < 1) {
        points = [[startX,startY],[x,y]];
      } else {
        points = [[startX,startY],[startX,busY],[x,busY],[x,y]];
      }
      tracks[i].setAttribute('d', roundedRoute(points));
    });
    const d = tracks[selectedAgent].getAttribute('d')!;
    selectedTrack.setAttribute('d', d);
    current.setAttribute('d', d);
  };
  const stopRoute = () => {
    routeAnimation?.cancel();
    agents.forEach(button => button.classList.remove('is-arriving'));
  };
  const selectAgent = (index: number) => {
    stopRoute();
    selectedAgent = index;
    agents.forEach((item, i) => item.setAttribute('aria-pressed', String(i === index)));
    agentPanels.forEach((panel, i) => { panel.hidden = i !== index; });
    root.querySelector('.af-flow-label')!.textContent = `Route naar ${agents[index].querySelector('strong')!.textContent}`;
    drawConnections();
    if (quiet()) return;
    routeAnimation = current.animate([
      { strokeDashoffset: '12', opacity: 0, offset: 0 },
      { strokeDashoffset: '8', opacity: 1, offset: .08 },
      { strokeDashoffset: '-88', opacity: 1, offset: .86 },
      { strokeDashoffset: '-102', opacity: 0, offset: 1 },
    ], { duration: 1100, easing: 'ease-in-out' });
    routeAnimation.onfinish = () => agents[index].classList.add('is-arriving');
  };
  agents.forEach((button, index) => button.addEventListener('click', () => selectAgent(index)));
  // Cancel JS-driven motion as well as CSS motion when the visitor requests quiet.
  motionButton.addEventListener('click', () => { if (quiet()) stopRoute(); });
  reduced.addEventListener('change', () => { if (quiet()) stopRoute(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopRoute(); });
  const connectionObserver = new ResizeObserver(drawConnections);
  connectionObserver.observe(collaboration);
  agents.forEach(button => connectionObserver.observe(button));
  document.fonts.ready.then(drawConnections);
  drawConnections();

  // Animate confirmed structural counts and explicitly attributed client-supplied results.
  const counts = root.querySelectorAll<HTMLElement>('[data-count][data-verified="true"], [data-count][data-source="client-supplied"]');
  const animate = (element: HTMLElement) => {
    const target = Number(element.dataset.count);
    if (!Number.isFinite(target) || target < 0 || element.dataset.counted) return;
    element.dataset.counted = 'true';
    const decimals = Number(element.dataset.decimals || 0);
    const numberFormat = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    const finalText = numberFormat.format(target);
    element.setAttribute('aria-label', finalText);
    if (quiet()) { element.textContent = finalText; return; }
    const start = performance.now();
    const frame = (now: number) => {
      const progress = quiet() ? 1 : Math.min(1, (now - start) / 3000);
      element.textContent = numberFormat.format(target * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { animate(entry.target as HTMLElement); observer.unobserve(entry.target); }
    }), { threshold: .4 });
    counts.forEach(element => observer.observe(element));
  }
}
