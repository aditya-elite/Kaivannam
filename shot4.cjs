const { chromium } = require('playwright');
const D='C:/Users/91807/AppData/Local/Temp/claude/c--Users-91807-OneDrive-Desktop-Kaivannam-HackForge/0df450ca-c23b-4bc3-9317-78ba7a2150d3/scratchpad';
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1200,height:1000},deviceScaleFactor:2});
  await ctx.addInitScript(()=>{try{sessionStorage.setItem('ks_splash_seen','1')}catch(e){}});
  const p=await ctx.newPage();
  await p.goto('http://localhost:3000/collection',{waitUntil:'networkidle'});
  await p.waitForTimeout(2000);
  await p.evaluate(()=>window.scrollTo(0,2600)); await p.waitForTimeout(1400);
  const card=await p.$('.stand');
  if(card) await card.hover();
  await p.waitForTimeout(600);
  await p.screenshot({path:D+'/coll-cards2.png'});
  await b.close();
})();
