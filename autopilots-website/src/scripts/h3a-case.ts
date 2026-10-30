export {};
const root=document.querySelector<HTMLElement>('#h3a-case');
if(root){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(!entry.isIntersecting)return;
  const el=entry.target as HTMLElement;observer.unobserve(el);
  if(el.hasAttribute('data-ha-count')&&!reduced){const target=Number(el.dataset.haCount);const start=performance.now();const frame=(now:number)=>{const p=Math.min((now-start)/2600,1);el.textContent=Math.round(target*(1-Math.pow(1-p,3))).toLocaleString('nl-NL');if(p<1)requestAnimationFrame(frame);};requestAnimationFrame(frame);}
  else el.classList.add('ha-revealed');
 }),{threshold:.2});
 root.querySelectorAll('[data-ha-count],[data-ha-reveal]').forEach(el=>observer.observe(el));
 root.querySelector<HTMLFormElement>('.ha-demo-form')?.addEventListener('submit',event=>{
  event.preventDefault();const form=event.currentTarget as HTMLFormElement;const data=new FormData(form);
  for(const [name,selector] of [['project','[data-ha-title]'],['category','[data-ha-category]'],['description','[data-ha-description]']]){const target=root.querySelector(selector);if(target)target.textContent=String(data.get(name)||'');}
  const status=root.querySelector('.ha-save-status');if(status)status.textContent='Voorbeeld bijgewerkt. Alleen zichtbaar op deze pagina.';
 });
 root.querySelectorAll<HTMLButtonElement>('[data-ha-plan]').forEach(button=>button.addEventListener('click',()=>{
  root.querySelectorAll('[data-ha-plan]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
  const target=root.querySelector('[data-ha-request]');if(target)target.textContent=button.dataset.haPlan||'';
  const descriptions:Record<string,string>={'Nieuw huis bouwen':'Een eerste gesprek over de wensen voor een nieuwe woning.','Woning verbouwen':'Een eerste gesprek over de bestaande woning en de gewenste veranderingen.','Woning uitbreiden':'Een eerste gesprek over extra ruimte en de mogelijkheden voor een aanbouw.'};
  const context=root.querySelector('[data-ha-context]');if(context)context.textContent=descriptions[button.dataset.haPlan||'']||'';
  if(!reduced){const card=root.querySelector('.ha-request-content');card?.getAnimations().forEach(animation=>animation.cancel());card?.animate([{opacity:.3,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'ease-out'});const pulse=root.querySelector('.ha-contact-connector span');pulse?.getAnimations().forEach(animation=>animation.cancel());pulse?.animate([{offsetDistance:'0%',opacity:0},{offsetDistance:'15%',opacity:1},{offsetDistance:'100%',opacity:0}],{duration:650,easing:'ease-in-out'});}
 }));
}
