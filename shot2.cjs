const { chromium } = require('playwright');
const D='C:/Users/91807/AppData/Local/Temp/claude/c--Users-91807-OneDrive-Desktop-Kaivannam-HackForge/0df450ca-c23b-4bc3-9317-78ba7a2150d3/scratchpad';
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1100,height:1000},deviceScaleFactor:2});
  await ctx.addInitScript(()=>{try{sessionStorage.setItem('ks_splash_seen','1')}catch(e){}});
  const p=await ctx.newPage();
  // Load and grab a frame ~120ms into the reveal (mid stamp-in)
  await p.goto('http://localhost:3000/artisans',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(700);
  await p.evaluate(()=>window.scrollTo(0,120));
  await p.waitForTimeout(120);
  // clip a tight shot of the first card region
  await p.screenshot({path:D+'/art-midreveal.png', clip:{x:20,y:560,width:660,height:520}});
  // Now settled, tight shot of first card (shows shadow / corner)
  await p.waitForTimeout(1200);
  await p.screenshot({path:D+'/art-settled-card.png', clip:{x:20,y:560,width:660,height:900}});
  await b.close();
})();
