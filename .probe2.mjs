import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:920}, hasTouch:true, isMobile:true });
const p = await ctx.newPage();
const d = new Date(); d.setDate(d.getDate()+20);
const res = await p.request.post('http://localhost:3000/api/invites', {
  data:{hostName:'경덕',matchDate:d.toISOString().slice(0,10),matchTime:'19:00',venue:'OO풋살파크'}});
const {inviteUrl} = await res.json();
await p.goto(inviteUrl); await p.waitForLoadState('networkidle');

// 싫어 도망 3회 → 관문
const no = p.locator('.invite-no');
const b0 = await no.boundingBox();
for (let i=0;i<3;i++){
  const bx = await no.boundingBox();
  await p.mouse.move(bx.x+bx.width/2, bx.y+bx.height/2);
  await p.waitForTimeout(450);
}
const b1 = await no.boundingBox();
console.log('=== 싫어 버튼 ===');
console.log('  이동:', Math.abs(b1.x-b0.x)>5||Math.abs(b1.y-b0.y)>5 ? '✓':'✗');
console.log('  라벨:', (await no.textContent()).trim());
await no.click({force:true}).catch(()=>{});
await p.waitForTimeout(800);
console.log('  클릭 후 관문:', (await p.locator('.reject-title').textContent().catch(()=>'없음')).trim());
console.log('  사유 리스트:', await p.locator('.reason-list').count());

// 사유 → 다음 단계들
await p.locator('.reason-item').filter({hasText:'비 올 것 같아'}).click();
await p.waitForSelector('.injury-stamp',{timeout:9000});
console.log('\n=== 사유 판정 ===');
console.log('  판정:', (await p.locator('.injury-verdict-head').textContent()).trim());
console.log('  도장:', (await p.locator('.injury-stamp').textContent()).trim());
console.log('  버튼:', (await p.locator('.modal-actions .btn, .btn-primary.btn-block').allTextContents()).map(t=>t.trim()));

await p.getByRole('button',{name:'다른 방법으로 거절'}).click(); await p.waitForTimeout(800);
for (const _ of [1,2,3,4,5,6]){
  const t=(await p.locator('.reject-title').textContent().catch(()=>'-')).trim();
  const btns=(await p.locator('.btn-primary.btn-block, .modal-actions .btn').allTextContents()).map(x=>x.trim());
  const cls=await p.evaluate(()=>{
    const sels=['.dodge-field','.dribble-field','.siu-meter','.tug-scene','.gk-goal','.keypad-grid','.lecture-board'];
    return sels.filter(s=>document.querySelector(s));
  });
  console.log(`\n[${t}]  마커=${cls.join(',')||'-'}`);
  console.log('  버튼:', btns);
  if (t.includes('FUTSAL')) break;
  const esc=p.getByRole('button',{name:'다른 방법으로 거절'});
  if (await esc.isVisible()){ await esc.click(); await p.waitForTimeout(800); continue; }
  const st=p.locator('.btn-primary.btn-block').first();
  if (await st.isVisible()){ await st.click(); await p.waitForTimeout(7000); }
  else await p.waitForTimeout(800);
}
await b.close();
