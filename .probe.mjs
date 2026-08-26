import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:920}, hasTouch:true, isMobile:true });
const p = await ctx.newPage();
p.on('pageerror', e=>console.log('⚠ JS:', e.message));

// 1) 홈 폼
await p.goto('http://localhost:3000/'); await p.waitForLoadState('networkidle');
console.log('=== 홈 ===');
console.log('  입력 id:', await p.locator('input[id]').evaluateAll(els=>els.map(e=>e.id)));
console.log('  버튼:', (await p.locator('button').allTextContents()).map(t=>t.trim()).filter(Boolean));

const d = new Date(); d.setDate(d.getDate()+20);
const res = await p.request.post('http://localhost:3000/api/invites', {
  data:{hostName:'경덕',matchDate:d.toISOString().slice(0,10),matchTime:'19:00',venue:'OO풋살파크'}});
const {inviteUrl, manageUrl} = await res.json();

// 2) 초대 흐름 각 화면의 버튼/제목
await p.goto(inviteUrl); await p.waitForLoadState('networkidle');
console.log('\n=== ① invite ===');
console.log('  제목:', (await p.locator('.title').first().textContent()).trim().replace(/\s+/g,' '));
console.log('  버튼:', (await p.locator('button').allTextContents()).map(t=>t.trim()).filter(Boolean));

await p.getByRole('button',{name:/좋아/}).click(); await p.waitForTimeout(800);
console.log('\n=== ② siuuu ===');
console.log('  버튼:', (await p.locator('button').allTextContents()).map(t=>t.trim()).filter(Boolean));

await p.locator('.btn-accent').first().click(); await p.waitForTimeout(500);
console.log('\n=== ③ matchday ===');
console.log('  입력 id:', await p.locator('input[id]').evaluateAll(els=>els.map(e=>e.id)));
console.log('  버튼:', (await p.locator('button').allTextContents()).map(t=>t.trim()).filter(Boolean));
await p.fill('#guestName','민수'); await p.waitForTimeout(200);
console.log('  이름 입력 후 버튼:', (await p.locator('button').allTextContents()).map(t=>t.trim()).filter(Boolean));

await p.locator('.btn-primary.btn-block').first().click(); await p.waitForTimeout(500);
console.log('\n=== ④ position ===');
console.log('  제목:', (await p.locator('.title').first().textContent()).trim());
console.log('  버튼:', (await p.locator('button').allTextContents()).map(t=>t.replace(/\s+/g,' ').trim()).filter(Boolean));

await p.getByRole('button',{name:/미드필더/}).click();
await p.waitForSelector('.ticket',{timeout:15000}); await p.waitForTimeout(400);
console.log('\n=== ⑤ ticket ===');
console.log('  티켓 내용:', (await p.locator('.ticket').textContent()).replace(/\s+/g,' ').trim().slice(0,90));
console.log('  버튼:', (await p.locator('button, a.btn').allTextContents()).map(t=>t.trim()).filter(Boolean));

// 3) 명단
await p.goto(manageUrl); await p.waitForLoadState('networkidle');
console.log('\n=== 명단 ===');
console.log('  roster 존재:', await p.locator('.roster').count());
console.log('  내용:', (await p.locator('.card').textContent()).replace(/\s+/g,' ').trim().slice(0,110));
await b.close();
