const { chromium } = require('playwright');
const D='C:/Users/91807/AppData/Local/Temp/claude/c--Users-91807-OneDrive-Desktop-Kaivannam-HackForge/0df450ca-c23b-4bc3-9317-78ba7a2150d3/scratchpad';
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1200,height:1000},deviceScaleFactor:2});
  await ctx.addInitScript(()=>{try{sessionStorage.setItem('ks_splash_seen','1')}catch(e){}});
  const p=await ctx.newPage();
  await p.goto('http://localhost:3000/collection',{waitUntil:'networkidle'});
  await p.waitForTimeout(2000);
  // scroll to a shelf row with cards + add-to-cart
  await p.evaluate(()=>window.scrollTo(0,2400)); await p.waitForTimeout(1500);
  await p.screenshot({path:D+'/coll-cards.png'});
  // inspect a stand card shadow
  const info=await p.evaluate(()=>{
    const st=document.querySelector('.stand > div.row-shear');
    if(!st) return null; const c=getComputedStyle(st);
    return {clip:c.clipPath.slice(0,30), shadow:c.boxShadow.slice(0,40)};
  });
  console.log(JSON.stringify(info));
  await b.close();
})();
