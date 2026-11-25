import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
const base='http://127.0.0.1:5175';
const dir=new URL('./capturas-v2/',import.meta.url);mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:720,height:1280}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(base+'/docs/mockups/menus-v2.html?photo&screen=training');
  await page.waitForFunction(()=>window.__mockReady);
  await page.evaluate(()=>document.fonts.ready);
  for(const [screen,file] of [['training','01-treino'],['roster','02-plantel'],['offers','03-jogos-treino'],['prematch','04-pre-jogo'],['halftime','05-intervalo'],['federation','06-federacao'],['office','07-escritorio']]){
    await page.evaluate(s=>window.__mock.go(s),screen);
    await page.screenshot({path:fileURLToPath(new URL(file+'.png',dir))});
  }
  await page.evaluate(()=>window.__mock.go('training'));
  for(const id of ['shooting','dribble','sprints','nap'])await page.locator(`[data-action="card:${id}"]`).click();
  if(await page.locator('.training-card.chosen').count()!==3)throw Error('Limite de três cartas');
  await page.locator('[data-action="remove:1"]').click();
  if(await page.locator('.training-card.chosen').count()!==2)throw Error('Retirar carta');
  await page.evaluate(()=>window.__mock.go('offers'));
  await page.locator('[data-action="opponent:2"]').click();
  await page.locator('.foot [data-action="go:prematch"]').click();
  if(!(await page.locator('.room-note').textContent()).includes('União da Serra'))throw Error('Adversário');
  await page.locator('[data-action="kits:prematch"]').click();
  await page.locator('[data-action="kit:cream"]').click();
  await page.locator('.foot [data-action="go:prematch"]').last().click();
  await page.locator('[data-action="tactics:prematch"]').click();
  await page.selectOption('#pace','Rápido');
  await page.locator('.foot [data-action="go:prematch"]').last().click();
  await page.locator('[data-action="squad:prematch"]').click();
  await page.locator('[data-action="player:1"]').click();
  await page.locator('[data-action="swap"]').click();
  await page.locator('[data-action="player:5"]').click();
  await page.locator('.foot [data-action="go:prematch"]').last().click();
  await page.locator('[data-action="start:prematch"]').click();
  if(!(await page.locator('#upper').textContent()).includes('Intervalo'))throw Error('Intervalo');
  if(errors.length)throw Error(errors.join('\n'));
  console.log('OK: capturas e percurso do protótipo revisto.');
}finally{await browser.close()}
