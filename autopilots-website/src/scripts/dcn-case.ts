export {};
const root=document.querySelector<HTMLElement>('#dcn-case');
if(root){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const integration=root.querySelector<HTMLElement>('.dc-integrations');
 if(integration){
  const buttons=[...integration.querySelectorAll<HTMLButtonElement>('[data-channel]')];
  const svg=integration.querySelector<SVGSVGElement>('svg')!;
  const tracks=svg.querySelector('[data-channel-tracks]')!;
  const active=svg.querySelector('path[data-channel-active]')!;
  const pulse=svg.querySelector('path[data-channel-pulse]')!;
  const card=integration.querySelector<HTMLElement>('.dc-incoming')!;
  let selected=1;
  const paths=buttons.map(()=>{const path=document.createElementNS('http://www.w3.org/2000/svg','path');tracks.append(path);return path;});
  const layout=()=>{const box=integration.getBoundingClientRect();const target=card.getBoundingClientRect();const endX=target.left+target.width/2-box.left,endY=target.top-box.top;svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);buttons.forEach((button,i)=>{const r=button.getBoundingClientRect();const x=r.left+r.width/2-box.left,y=r.bottom-box.top;const bend=endY-25;const d=`M${x} ${y} C${x} ${bend},${endX} ${bend},${endX} ${endY}`;paths[i].setAttribute('d',d);if(i===selected){active.setAttribute('d',d);pulse.setAttribute('d',d);}});};
  buttons.forEach((button,i)=>button.addEventListener('click',()=>{selected=i;buttons.forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));integration.querySelector('[data-channel-label]')!.textContent=button.dataset.channel!;layout();if(!reduced.matches){pulse.animate([{strokeDashoffset:100},{strokeDashoffset:-100}],{duration:1100,easing:'ease-in-out'});card.animate([{opacity:.65,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:450});}}));
  new ResizeObserver(layout).observe(integration);layout();
 }
 const counters=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;const el=entry.target as HTMLElement;counters.unobserve(el);const target=Number(el.dataset.dcCount);if(reduced.matches)return;const start=performance.now();const tick=(now:number)=>{const p=Math.min(1,(now-start)/2600);el.textContent=Math.round(target*(1-(1-p)**3)).toLocaleString('nl-NL');if(p<1&&!reduced.matches)requestAnimationFrame(tick);else el.textContent=target.toLocaleString('nl-NL');};requestAnimationFrame(tick);}),{threshold:.7});
 root.querySelectorAll<HTMLElement>('[data-dc-count]').forEach(el=>counters.observe(el));
 const tabs=[...root.querySelectorAll<HTMLButtonElement>('[data-dc-tab]')];
 const panels=[...root.querySelectorAll<HTMLElement>('.dc-stage')];
 let manualY:number|null=null;
 const select=(index:number)=>{tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;tab.classList.toggle('dc-completed',i<index);});panels.forEach((panel,i)=>panel.hidden=i!==index);root.querySelector<HTMLElement>('.dc-timeline')?.style.setProperty('--step-progress',String(index/3));};
 tabs.forEach(tab=>tab.addEventListener('click',()=>{manualY=scrollY;}));
 const routes=[...root.querySelectorAll<HTMLButtonElement>('[data-route]')];
 const routeCards=[...root.querySelectorAll<HTMLElement>('.dc-routes article')];
 const chooseRoute=(index:number)=>{routes.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));routeCards.forEach((card,i)=>card.classList.toggle('dc-route-active',i===index));root.querySelector('.dc-route-lines')?.setAttribute('data-active',String(index));const result=root.querySelector('[data-route-result]');if(result)result.textContent=index===0?'Via de AI-funnel. Zichtbaar voor de inspecteur.':'Door de medewerker gepland. Zichtbaar voor de inspecteur.';};
 routes.forEach((button,i)=>button.addEventListener('click',()=>chooseRoute(i)));chooseRoute(0);
 tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>select(i));tab.addEventListener('keydown',event=>{let next=i;if(event.key==='ArrowRight')next=(i+1)%tabs.length;else if(event.key==='ArrowLeft')next=(i-1+tabs.length)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();select(next);tabs[next].focus();});});
 const steps=[...root.querySelectorAll<HTMLElement>('[data-dc-scroll]')];let frame=0;
 const draw=()=>{frame=0;if(innerWidth<=700||reduced.matches)return;let best=-1,distance=Infinity;steps.forEach((step,i)=>{const r=step.getBoundingClientRect();if(r.top>innerHeight||r.bottom<0)return;const d=Math.abs(r.top+r.height/2-innerHeight*.75);if(d<distance){best=i;distance=d;}});if(best>=0)select(best);};
 addEventListener('scroll',()=>{if(manualY!==null){if(Math.abs(scrollY-manualY)<120)return;manualY=null;}if(!frame)frame=requestAnimationFrame(draw);},{passive:true});
 const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('dc-in-view');reveal.unobserve(entry.target);}}),{threshold:.2});root.querySelectorAll('[data-dc-reveal]').forEach(el=>reveal.observe(el));
}
