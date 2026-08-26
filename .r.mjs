import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:900}, hasTouch:true, isMobile:true });
const p = await ctx.newPage();
await p.goto('https://futsal-invite.vercel.app/i/b3-lO0NHhF');
await p.waitForLoadState('networkidle');
const no = p.locator('.invite-no');
for (let i=0;i<3;i++){ await no.tap(); await p.waitForTimeout(430); }
await no.tap(); await p.waitForTimeout(900);

// 입력이 필요 없는 사유를 고른다
const labels = await p.locator('.reason-item').allTextContents();
console.log('사유 목록:', labels.map(t=>t.replace(/\s+/g,' ').trim()));
await p.locator('.reason-item').filter({hasText:'비 올 것 같아'}).click();
await p.waitForSelector('.injury-stamp',{timeout:10000});
console.log('판정:', (await p.locator('.injury-verdict-head').textContent()).trim());
const esc = p.getByRole('button',{name:'다른 방법으로 거절'});
console.log('탈출 버튼:', await esc.isVisible()?'✓':'✗');

// 관문 전체를 훑는다
for (let i=0;i<9;i++){
  if (await esc.isVisible()){ await esc.click(); await p.waitForTimeout(900); }
  const t=(await p.locator('.reject-title').textContent().catch(()=>'-')).trim();
  console.log(`  ${i+1}. ${t}`);
  if (t.includes('FUTSAL')) break;
  if (!(await esc.isVisible())){
    const st=p.locator('.btn-primary.btn-block').first();
    if (await st.isVisible()){ await st.click(); await p.waitForTimeout(7000); }
    else await p.waitForTimeout(1000);
  }
}
await b.close();
