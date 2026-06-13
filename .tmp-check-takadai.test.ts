import { it } from 'vitest';
import { buildMap } from './src/data/maps';
import { tileSet, tileFrame } from './src/field/tileset';
import fs from 'node:fs';
it('dump takadai', () => {
 const m = buildMap('takadai');
 console.log('size',m.w,m.h,'props',m.props.length,'warps',JSON.stringify(m.warps));
 const coll=(x:number,y:number)=>m.collision[y*m.w+x];
 for (const [name,x,y] of [['entry',20,27],['stair bottom L',19,13],['stair bottom R',20,13],['stair top L cap',19,10],['stair top R cap',20,10],['upper center',20,8],['return warp',20,28]] as const) console.log(name,x,y,'solid',coll(x,y),'ground',tileSet(m.ground[y*m.w+x])?.key,tileFrame(m.ground[y*m.w+x]),'deco',tileSet(m.deco[y*m.w+x])?.key,tileFrame(m.deco[y*m.w+x]));
 const start=[20,27] as [number,number]; const q=[start]; const seen=new Set([start.join(',')]);
 while(q.length){ const [x,y]=q.shift()!; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx,ny=y+dy; if(nx<0||ny<0||nx>=m.w||ny>=m.h) continue; if(coll(nx,ny)) continue; const k=nx+','+ny; if(!seen.has(k)){seen.add(k);q.push([nx,ny]);}}}
 console.log('reachable count',seen.size,'upper reachable',seen.has('20,8'),seen.has('19,10'),seen.has('20,10'),'warp reachable',seen.has('20,28'),seen.has('19,28'),seen.has('21,28'));
 let solidCount=0; for (const c of m.collision) if(c) solidCount++; console.log('solid ratio',solidCount/m.collision.length)
 const am=JSON.parse(fs.readFileSync('src/data/assetmap.json','utf8'));
 const bad:string[]=[];
 for (const layerName of ['ground','deco','overhead'] as const) { const layer=m[layerName]; for(let i=0;i<layer.length;i++){ const ref=layer[i]; if(!ref) continue; const ts=tileSet(ref); const fr=tileFrame(ref); if(!ts) { bad.push(`${layerName} ${i%m.w},${Math.floor(i/m.w)} unknown ts`) ; continue;} const meta=am[ts.sheet]; if(!meta) bad.push(`${layerName} ${i%m.w},${Math.floor(i/m.w)} missing asset ${ts.sheet}`); else if(fr>=meta.frames) bad.push(`${layerName} ${i%m.w},${Math.floor(i/m.w)} frame ${fr}>=${meta.frames} sheet ${ts.sheet}`); }}
 for(const p of m.props){ const meta=am[p.sheet]; if(!meta) bad.push(`prop missing asset ${p.sheet}`); else if(p.frame>=meta.frames) bad.push(`prop frame ${p.frame}>=${meta.frames} ${p.sheet}`); }
 for(const d of m.decals){ const sheet=d.sheet??'tile.grass_detail'; const meta=am[sheet]; if(!meta) bad.push(`decal missing ${sheet}`); else if(d.frame>=meta.frames) bad.push(`decal frame ${d.frame}>=${meta.frames} ${sheet}`)}
 console.log('bad',bad.slice(0,20), 'count',bad.length);
 for(let y=0;y<m.h;y++){let row=''; for(let x=0;x<m.w;x++){ if(coll(x,y)) row+='#'; else if(m.warps.some(w=>w.x==x&&w.y==y)) row+='W'; else if([19,20].includes(x)&&y>=10&&y<=13) row+='S'; else if(y<=13 && x>=6 && x<=33) row+='U'; else row+='.';} console.log(String(y).padStart(2,'0'), row);} 
});
