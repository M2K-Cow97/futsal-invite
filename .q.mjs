import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:900}, hasTouch:true, isMobile:true });
const p = await ctx.newPage();
// 배포된 JS 청크에 새 문자열이 있는지 직접 확인
const found = { siu:false, tilt:false, dribble:false };
p.on('response', async r=>{
  if (!/\.js$/.test(r.url())) return;
  try {
    const t = await r.text();
    if (t.includes('SIUUU 심사')) found.siu = true;
    if (t.includes('거절 각 재기')) found.tilt = true;
    if (t.includes('호날두를 뚫어라')) found.dribble = true;
  } catch {}
});
await p.goto('https://futsal-invite.vercel.app/i/b3-lO0NHhF');
await p.waitForLoadState('networkidle');
const no = p.locator('.invite-no');
for (let i=0;i<3;i++){ await no.tap(); await p.waitForTimeout(430); }
await no.tap(); await p.waitForTimeout(1500);
console.log('배포된 JS 에 포함된 문자열:');
console.log('  "SIUUU 심사"     :', found.siu ? '✓ 있음' : '✗ 없음');
console.log('  "거절 각 재기"    :', found.tilt ? '✗ 아직 있음(구버전)' : '✓ 없음');
console.log('  "호날두를 뚫어라" :', found.dribble ? '✓ 있음' : '✗ 없음');
// 사유 심사에서 탈출 버튼이 보이는지
await p.locator('.reason-item').first().click();
await p.waitForTimeout(4000);
const btns = (await p.locator('.modal-actions .btn, .btn-primary.btn-block').allTextContents()).map(t=>t.trim());
console.log('\n사유 1개 기각 후 버튼:', btns);
await p.screenshot({path:'/tmp/shots/deployed.png'});
await b.close();
