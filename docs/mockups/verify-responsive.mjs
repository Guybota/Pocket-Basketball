import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const out=new URL('./capturas-v3/',import.meta.url);mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const url='http://127.0.0.1:5175/docs/mockups/galeria-ipad/dist/';
const errors=[];
const assert=(condition,message)=>{if(!condition)throw Error(message)};
try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}});p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>window.__prototypeReady);await p.evaluate(()=>document.fonts.ready);
 const go=async route=>{await p.evaluate(r=>window.__prototype.go(r),route);await p.waitForFunction(r=>window.__prototype.state.route===r,route)};
 const click=async action=>p.locator(`[data-action="${action}"]`).last().click();
 const shot=async name=>p.screenshot({path:fileURLToPath(new URL(name+'.png',out)),fullPage:true});
 for(const [name,width,height] of [['pc',1440,1000],['ipad',1024,1366],['tablet-horizontal',1180,820],['mobile',390,844],['mobile-small',360,640]]){
  await p.setViewportSize({width,height});
  for(const route of ['club','training','roster','offers','prematch','halftime','kits','tactics','federation','office','stats','match','result']){
   await go(route);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Transbordo horizontal em ${route} / ${name}`);
   if(['prematch','office'].includes(route))assert(await p.locator('canvas').first().evaluate(c=>c.getBoundingClientRect().width<=c.parentElement.clientWidth),'Cenário inteiro: '+name+' '+route);
   if(['training','prematch','federation','office'].includes(route)&&!['tablet-horizontal','mobile-small'].includes(name))await shot(name+'-'+route);
  }
 }
 await p.setViewportSize({width:1024,height:1366});await go('training');
 await click('card:readDefense');await click('card:shooting');await click('card:sprints');await click('card:nap');
 assert(await p.locator('.training-card.chosen').count()===3,'Limite de cartas');
 await click('remove:1');assert(await p.locator('.training-card.chosen').count()===2,'Retirar carta');
 await click('category:support');await click('card:dance');await click('train');await p.locator('#modal-confirm').click();
 assert((await p.evaluate(()=>window.__prototype.state.plans[1])).length===0,'Concluir treino');
 await go('offers');await click('opponent:2');await click('invite');await p.locator('#modal-confirm').click();await p.waitForFunction(()=>window.__prototype.state.route==='prematch');
 assert((await p.locator('.fixture-card').textContent()).includes('União da Serra'),'Adversário persistente');
 await click('scene:tunnel');await shot('ipad-tunel');await click('scene:locker');
 await click('open-roster:prematch');await p.waitForFunction(()=>window.__prototype.state.route==='roster');
 const before=await p.evaluate(()=>window.__prototype.players.map(p=>({id:p.id,name:p.name,grades:p.grades,number:p.number})));
 await click('player:1');await click('swap');await click('player:5');
 const after=await p.evaluate(()=>window.__prototype.players.map(p=>({id:p.id,name:p.name,grades:p.grades,number:p.number})));
 assert(after[1].id===before[5].id&&after[5].id===before[1].id,'Troca de titulares');
 assert(JSON.stringify(after[1])===JSON.stringify(before[5]),'Preservar identidade na troca');
 await click('go:prematch');await p.waitForFunction(()=>window.__prototype.state.route==='prematch');
 await click('open-kits:prematch');await p.waitForFunction(()=>window.__prototype.state.route==='kits');await click('kit:cream');await click('go:prematch');await p.waitForFunction(()=>window.__prototype.state.route==='prematch');
 assert((await p.locator('.fixture-card').textContent()).includes('Creme e vermelho'),'Equipamento atualizado');
 await click('open-tactics:prematch');await p.waitForFunction(()=>window.__prototype.state.route==='tactics');await p.selectOption('#pace','Rápido');await click('go:prematch');await p.waitForFunction(()=>window.__prototype.state.route==='prematch');
 assert((await p.locator('.setting-button').nth(1).textContent()).includes('Rápido'),'Tática guardada');
 await click('start');await p.waitForFunction(()=>window.__prototype.state.route==='match');await click('go:halftime');await p.waitForFunction(()=>window.__prototype.state.route==='halftime');await click('go:stats');await p.waitForFunction(()=>window.__prototype.state.route==='stats');await click('go:halftime');await p.waitForFunction(()=>window.__prototype.state.route==='halftime');await click('resume');await p.waitForFunction(()=>window.__prototype.state.route==='match');await click('go:result');await p.waitForFunction(()=>window.__prototype.state.route==='result');
 await go('federation');await click('fed-tab:Calendário');await click('fed-tab:Clubes');await click('club-info:1');await p.locator('#modal-cancel').click();
 await go('office');await click('office-tab:Contratos');await click('renew:0');await p.locator('#modal-confirm').click();assert((await p.locator('.office-content').textContent()).includes('Renovação assinalada'),'Renovação de exemplo');
 await click('office-tab:Correio');await click('mail:0');await p.locator('#modal-confirm').click();await p.waitForFunction(()=>window.__prototype.state.route==='offers');assert(await p.evaluate(()=>window.__prototype.state.opponent===0),'Convite da Ribeirinha');
 await go('office');await click('office-tab:Identidade');await p.fill('#club-name','Vilar Basket');await p.fill('#club-short','VBA');await click('save-identity');assert((await p.locator('.club-badge').textContent()).includes('Vilar Basket'),'Identidade atualizada');
 assert((await p.locator('.club-badge>.crest').textContent())==='VBA','Nome curto atualizado');await go('federation');await click('fed-tab:Calendário');assert((await p.locator('.fixture-list').textContent()).includes('Vilar Basket'),'Nome no calendário');await go('office');assert(await p.locator('.desk-view').evaluate(c=>c.getBoundingClientRect().width<=c.parentElement.clientWidth),'Secretária inteira');assert(!errors.length,errors.join('\n'));
 console.log('OK: 5 dimensões, 13 ecrãs, sem transbordo, treino, trocas, equipamento, tática, intervalo, federação, correio e identidade.');
}finally{await browser.close()}
