import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:5175/docs/mockups/menus-v2.html?screen=offers');
 await page.waitForFunction(()=>window.__mockReady);
 const data=await page.evaluate(async()=>{
  const [{generateTeam},{portraitImage},{lookOf,drawSprite},{CARDS},{cardImage,CATEGORY_INFO},{gradeOf,ATTRIBUTE_KEYS}]=await Promise.all([import('/src/sim/teamgen.ts'),import('/src/ui/art/portrait.ts'),import('/src/ui/art/sprites.ts'),import('/src/sim/training.ts'),import('/src/ui/art/cards.ts'),import('/src/sim/types.ts')]);
  const team=generateTeam(42,'Vilar BC',48),names=['Tavares','Alves','Okafor','Rocha','Mendes','Neves','Duarte','Faria','Brito','Lopes'];
  const players=team.roster.map((p,i)=>{p.name=names[i]||p.name;const portraits={},bodies={};for(const kit of ['blue','cream']){const look=lookOf(p,kit);portraits[kit]=portraitImage(look);const c=document.createElement('canvas');c.width=34;c.height=46;drawSprite(c.getContext('2d'),'idle',look,17,43,false,false,false);bodies[kit]=c.toDataURL()}return{id:i,name:p.name,number:i+4,position:p.position,height:p.heightCm,weight:p.weightKg,energy:Math.max(62,98-i*3),grades:ATTRIBUTE_KEYS.map(k=>gradeOf(p.attributes[k])),portraits,bodies}});
  return{players,cards:Object.entries(CARDS).map(([id,c])=>({id,name:c.name,category:c.category,gains:c.gains,image:cardImage(id,c.category)})),categories:CATEGORY_INFO,gym:document.querySelector('[data-room="gym"]').toDataURL()};
 });
 writeFileSync(new URL('./galeria-ipad/dist/art.js',import.meta.url),'export default '+JSON.stringify(data)+';\n');
 console.log('Arte exportada: retratos, sprites, 20 cartas e pavilhão. Sem motor ou gravação do jogo.');
}finally{await browser.close()}
