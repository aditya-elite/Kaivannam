const { chromium } = require('playwright');
const D='C:/Users/91807/AppData/Local/Temp/claude/c--Users-91807-OneDrive-Desktop-Kaivannam-HackForge/0df450ca-c23b-4bc3-9317-78ba7a2150d3/scratchpad';
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1100,height:1000},deviceScaleFactor:2});
  await ctx.addInitScript(()=>{try{sessionStorage.setItem('ks_splash_seen','1')}catch(e){}});
  const p=await ctx.newPage();
  await p.goto('http://localhost:3000/artisans',{waitUntil:'networkidle'});
  await p.waitForTimeout(1800);
  await p.screenshot({path:D+'/art-rest.png'});
  // hover the first card to trigger shadow-lift
  const card=await p.$('ul.grid > li a');
  if(card){ await card.hover(); await p.waitForTimeout(500); await p.screenshot({path:D+'/art-hover.png'}); }
  // measure: is box-shadow clipped by clip-path on the card?
  const info=await p.evaluate(()=>{
    const a=document.querySelector('ul.grid > li a');
    if(!a) return null;
    const c=getComputedStyle(a);
    const li=a.closest('li'); const lc=getComputedStyle(li);
    return {cardClip:c.clipPath.slice(0,40), cardShadow:c.boxShadow.slice(0,60), cardOverflow:c.overflow,
            liTransform:lc.transform, liOverflow:lc.overflow, liClass:li.className};
  });
  console.log(JSON.stringify(info,null,2));
  await b.close();
})();
