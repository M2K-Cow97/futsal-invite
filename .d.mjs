import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--ignore-certificate-errors'] });
const ctx = await b.newContext({ viewport:{width:390,height:844}, hasTouch:true, isMobile:true, ignoreHTTPSErrors:true });
const p = await ctx.newPage();
p.on('pageerror', e=>console.log('  ⚠ JS:', e.message));
const d = new Date(); d.setDate(d.getDate()+20);
const res = await p.request.post('https://192.168.45.187:3000/api/invites', {
  data:{hostName:'경덕',matchDate:d.toISOString().slice(0,10),matchTime:'19:00',venue:'OO풋살파크'}, ignoreHTTPSErrors:true });
const {inviteUrl} = await res.json();

async function tryReason(label, value){
  await p.goto(inviteUrl); await p.waitForLoadState('networkidle');
  const no = p.locator('.invite-no');
  for (let i=0;i<3;i++){ await no.tap(); await p.waitForTimeout(400); }
  await no.tap(); await p.waitForTimeout(500);
  await p.locator('.reason-item').filter({hasText:label}).click();
  await p.waitForTimeout(300);
  console.log(`  입력 라벨: "${(await p.locator('.label').textContent()).trim()}"`);
  await p.fill('#reasonText', value);
  await p.getByRole('button',{name:'제출'}).click();
  await p.waitForSelector('.injury-stamp', {timeout:9000});
  return {
    verdict: (await p.locator('.injury-verdict-head').textContent()).trim(),
    body: (await p.locator('.injury-verdict-body').textContent()).trim(),
    stamp: (await p.locator('.injury-stamp').textContent()).trim(),
  };
}

console.log('=== 🥶 실력이 안 돼 ===');
for (const v of ['1','5','10']){
  const r = await tryReason('실력이 안 돼', v);
  console.log(`  [${v}점] ${r.verdict}`);
  console.log(`         ${r.body}`);
  console.log(`         🔖 ${r.stamp}\n`);
}

console.log('=== 😴 너무 피곤해 ===');
for (const v of ['3','7','11']){
  const r = await tryReason('너무 피곤해', v);
  console.log(`  [${v}시간] ${r.verdict}`);
  console.log(`          ${r.body}`);
  console.log(`          🔖 ${r.stamp}\n`);
}

console.log('=== 숫자 아닌 값 (폴백) ===');
const r = await tryReason('실력이 안 돼', 'ㅋㅋ');
console.log(`  ["ㅋㅋ"] ${r.verdict} / ${r.stamp}`);
await p.screenshot({path:'/tmp/shots/d1-skill.png'});
await b.close();
