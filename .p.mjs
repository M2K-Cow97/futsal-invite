import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:900}, hasTouch:true, isMobile:true });
const p = await ctx.newPage();
await p.goto('https://futsal-invite.vercel.app/i/b3-lO0NHhF'); await p.waitForLoadState('networkidle');
const no = p.locator('.invite-no');
for (let i=0;i<3;i++){ await no.tap(); await p.waitForTimeout(430); }
await no.tap(); await p.waitForTimeout(800);
console.log('관문 1단계:', (await p.locator('.reject-title').textContent().catch(()=>'-')).trim());
// 사유 1개로 통과
await p.locator('.reason-item').first().click();
await p.waitForSelector('.injury-stamp',{timeout:9000}).catch(()=>{});
await p.getByRole('button',{name:'다른 방법으로 거절'}).click().catch(()=>{});
await p.waitForTimeout(700);
// 관문 순서를 끝까지 훑는다
for (let i=0;i<8;i++){
  const t=(await p.locator('.reject-title').textContent().catch(()=>'-')).trim();
  console.log('  →', t);
  if (t.includes('FUTSAL')) break;
  const esc=p.getByRole('button',{name:'다른 방법으로 거절'});
  if (await esc.isVisible()){ await esc.click(); await p.waitForTimeout(700); continue; }
  const start=p.locator('.btn-primary.btn-block').first();
  if (await start.isVisible()){ await start.click(); await p.waitForTimeout(6500); }
  else await p.waitForTimeout(900);
}
await b.close();
