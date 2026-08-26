import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:920}, hasTouch:true, isMobile:true });
const p = await ctx.newPage();
const d = new Date(); d.setDate(d.getDate()+20);
const res = await p.request.post('https://futsal-invite.vercel.app/api/invites', {
  data:{hostName:'경덕',matchDate:d.toISOString().slice(0,10),matchTime:'19:00',venue:'OO풋살파크'}});
const {inviteUrl} = await res.json();
await p.goto(inviteUrl); await p.waitForLoadState('networkidle');
const no = p.locator('.invite-no');
for (let i=0;i<3;i++){ await no.tap(); await p.waitForTimeout(430); }
await no.tap(); await p.waitForTimeout(900);
await p.locator('.reason-item').filter({hasText:'비 올 것 같아'}).click();
await p.waitForSelector('.injury-stamp',{timeout:10000});
await p.getByRole('button',{name:'다른 방법으로 거절'}).click(); await p.waitForTimeout(900);
for (let i=0;i<6;i++){
  const t=(await p.locator('.reject-title').textContent().catch(()=>'-')).trim();
  if (t.includes('SIUUU')) {
    const btns=(await p.locator('.btn-primary.btn-block, .modal-actions .btn').allTextContents()).map(x=>x.trim());
    console.log('SIUUU 심사 버튼:', btns);
    const ok = btns.some(x=>x.includes('다른 방법으로 거절'));
    console.log('판정:', ok ? '✓ 시작 전에도 넘어갈 수 있음' : '✗ 아직 갇힘 (배포 대기중일 수 있음)');
    if (ok){
      await p.getByRole('button',{name:'다른 방법으로 거절'}).click(); await p.waitForTimeout(900);
      console.log('다음 단계:', (await p.locator('.reject-title').textContent()).trim());
    }
    break;
  }
  const esc=p.getByRole('button',{name:'다른 방법으로 거절'});
  if (await esc.isVisible()){ await esc.click(); await p.waitForTimeout(900); continue; }
  const st=p.locator('.btn-primary.btn-block').first();
  if (await st.isVisible()){ await st.click(); await p.waitForTimeout(7000); }
}
await b.close();
