import { chromium } from 'playwright';
const BASE='https://futsal-invite.vercel.app';
const b = await chromium.launch();
for (let t=0;t<16;t++){
  const r1 = await (await chromium.launch()).close().catch(()=>{});
  const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const p=await ctx.newPage();
  const a = await p.request.get(`${BASE}/assets/nono.mp4`);
  const s = await p.request.get(`${BASE}/assets/siu_full.mp3`);
  if (a.status()===200 && s.status()===200){
    console.log('에셋 배포됨: nono.mp4', a.status(), '· siu_full.mp3', s.status());
    // 실제 재생까지 확인
    await p.addInitScript(()=>{ window.__p=[]; const o=HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play=function(){ window.__p.push((this.src||'').split('/').pop()); return o.call(this); }; });
    const d=new Date(); d.setDate(d.getDate()+20);
    const inv=await (await p.request.post(`${BASE}/api/invites`,{data:{hostName:'경덕',
      matchDate:d.toISOString().slice(0,10),matchTime:'19:00',venue:'천마'}})).json();
    await p.goto(inv.inviteUrl); await p.waitForLoadState('networkidle');
    await p.evaluate(()=>{window.__p.length=0});
    await p.locator('.invite-no').tap(); await p.waitForTimeout(600);
    const played = await p.evaluate(()=>window.__p.slice());
    console.log('싫어 탭 →', played.join(',')||'(없음)');
    console.log('링크:', inv.inviteUrl);
    await ctx.close(); break;
  }
  await ctx.close();
  if (t===15) console.log('배포 대기 초과');
  else await new Promise(r=>setTimeout(r,12000));
}
await b.close();
