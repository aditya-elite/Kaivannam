const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch(); const p=await (await b.newContext()).newPage();
  await p.addInitScript(()=>{try{sessionStorage.setItem('ks_splash_seen','1')}catch(e){}});
  let bad=0, checked=0;
  for(const w of [1920,1440,1280,1024,834,414,390,360]){
    await p.setViewportSize({width:w,height:900});
    for(const r of ['/collection','/artisans','/product/KS-4F7Q-9XB2-M3KP','/product/KS-4F7Q-9XB2-M3KP/provenance']){
      await p.goto('http://localhost:3000'+r,{waitUntil:'networkidle'}); await p.waitForTimeout(500); checked++;
      const of=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      if(of>0){bad++; console.log(`  PROBLEM w=${w} ${r} overflow=${of}`);}
    }
  }
  console.log(bad?`\n${bad} overflow cases`:`\nno horizontal overflow across ${checked} width\u00d7route combos`);
  await b.close();
})();
