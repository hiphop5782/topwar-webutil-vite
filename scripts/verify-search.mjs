import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
import { parse } from '@babel/parser';
import puppeteer from 'puppeteer';
import { getRoutePolicy, routePolicies } from '../src/config/routePolicy.js';
import { prerenderRoutes } from '../src/config/prerenderRoutes.js';
import { researchCollections } from '../src/config/researchCollections.js';

const dist=path.resolve('dist');
const sitemap=await fs.readFile(path.join(dist,'sitemap.xml'),'utf8');
const locations=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
const sitemapEntries=new Map([...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m=>[m[1].match(/<loc>(.*?)<\/loc>/)[1],m[1]]));
const origin=new URL(locations[0]).origin;
const attrs=(html,tag)=>[...html.matchAll(new RegExp('<'+tag+'\\b[^>]*>','gi'))].map(m=>Object.fromEntries([...m[0].matchAll(/([\w:-]+)=["']([^"']*)["']/g)].map(a=>[a[1].toLowerCase(),a[2]])));
const metadata=html=>({robots:attrs(html,'meta').filter(a=>a.name==='robots'),canonical:attrs(html,'link').filter(a=>a.rel==='canonical'),alternates:attrs(html,'link').filter(a=>a.hreflang)});
// Derive actual routes from JSX rather than maintaining a second expected list.
const tree=parse(await fs.readFile('src/components/MainContentView.jsx','utf8'),{sourceType:'module',plugins:['jsx']});
const routes=[];
function visit(node,parent='') {
 if(!node||typeof node!=='object') return;
 if(node.type==='JSXElement'&&node.openingElement.name.name==='Route') {
  const attr=node.openingElement.attributes.find(a=>a.name?.name==='path');
  const suffix=attr?.value?.value||'';
  const route=(parent+'/'+suffix).replace(/\/+/g,'/');
  if(suffix!=='*') routes.push(route);
  for(const child of node.children) visit(child,route);
  return;
 }
 for(const value of Object.values(node)) if(Array.isArray(value)) value.forEach(v=>visit(v,parent)); else if(value&&typeof value==='object') visit(value,parent);
}
visit(tree);
for(const route of routes) {
 const sample=route.replace(/:[^/]+/g,'test');
 assert.notEqual(getRoutePolicy('/ko'+sample).key,'notFound','Missing policy: '+route);
 if(!route.includes(':')) assert.ok(prerenderRoutes.includes(route.replace(/\/$/,'')||'/'),'Missing prerender: '+route);
}
for(const policy of routePolicies) assert.ok(routes.some(route=>policy.pattern.test(route.replace(/:[^/]+/g,'test').replace(/\/$/,'')||'/')),'Policy without real route: '+policy.key);
let pages=0;
for(const language of ['ko','en','ja']) for(const route of prerenderRoutes) {
 const pathname='/'+language+(route==='/'?'/':route+'/');
 const html=await fs.readFile(path.join(dist,pathname,'index.html'),'utf8');
 const meta=metadata(html), policy=getRoutePolicy(pathname);
 assert.equal(meta.robots.length,1,'Robots count: '+pathname);
 assert.equal(meta.robots[0].content.replaceAll(' ',''),policy.noindex?'noindex,follow':'index,follow',pathname);
 assert.equal(meta.canonical.length,1,'Canonical count: '+pathname);
 assert.equal(meta.canonical[0].href,origin+policy.canonicalPath,pathname);
 assert.ok(!html.includes('class="not-found"'),'Unexpected 404: '+pathname);
 assert.equal(locations.includes(origin+pathname),policy.sitemap,'Sitemap eligibility: '+pathname);
 assert.deepEqual(meta.alternates.map(a=>[a.hreflang,a.href]).sort(),policy.alternates.map(a=>[a.language,origin+a.path]).sort(),'Alternates: '+pathname);
 if(policy.sitemap) assert.deepEqual(attrs(sitemapEntries.get(origin+pathname),'xhtml:link').map(a=>[a.hreflang,a.href]).sort(),meta.alternates.map(a=>[a.hreflang,a.href]).sort(),'XML/HTML alternates disagree: '+pathname);
 if(route.startsWith('/post/')) assert.ok(html.includes('markdown-body'),'Missing article: '+pathname);
 pages++;
}
assert.equal(new Set(locations).size,locations.length);
for(const loc of locations) {
 const url=new URL(loc);
 assert.equal(url.origin,origin);
 assert.equal(url.search+url.hash,'');
 assert.ok(getRoutePolicy(url.pathname).sitemap,'Unexpected sitemap entry: '+loc);
 await fs.access(path.join(dist,url.pathname,'index.html'));
}
assert.ok(!locations.includes(origin+'/'));
assert.ok(!sitemap.includes('9999-99-99'));
for(const group of researchCollections) for(const folder of group.posts) assert.ok(prerenderRoutes.includes('/post/'+folder),'Broken curated link: '+folder);
const rootMeta=metadata(await fs.readFile(path.join(dist,'index.html'),'utf8'));
assert.equal(rootMeta.canonical[0].href,origin+'/ko/');
const robots=await fs.readFile(path.join(dist,'robots.txt'),'utf8');
assert.ok(!/^Disallow:\s*\S/m.test(robots),'noindex pages must be crawlable');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=createServer(async(req,res)=>{
 try {
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=path.resolve(dist,'.'+pathname);
  if(file!==dist&&!file.startsWith(dist+path.sep)) {res.writeHead(403).end();return;}
  try {if((await fs.stat(file)).isDirectory()) file=path.join(file,'index.html');await fs.access(file);} catch {file=path.join(dist,'404.html');res.statusCode=404;}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));
 } catch {res.writeHead(500).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const local='http://127.0.0.1:'+server.address().port;
let browser;
try {
 browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 await page.setRequestInterception(true);
 page.on('request',req=>req.url().startsWith(local)||req.url().startsWith('data:')?req.continue():req.abort());
 const cases=[['/ko/information/data/','noindex'],['/ko/information/data/servers/?q=3223','noindex'],['/ko/information/data/overall/?server=1','noindex'],['/ko/emoji/list/','noindex'],['/ko/calculator/vital/?energy=10','index'],['/en/post/2026-09-08-001-Server-Status/','index'],['/ko/post/?q=damage','noindex'],['/ko/post/','index']];
 for(const [url,robots] of cases) {
  const response=await page.goto(local+url);
  assert.equal(response.status(),200,url);
  await page.waitForFunction((robots)=>document.querySelector('meta[name="robots"]')?.content.startsWith(robots),{},robots);
  await page.waitForFunction((href)=>document.querySelector('link[rel="canonical"]')?.href===href,{},origin+getRoutePolicy(new URL(local+url).pathname).canonicalPath);
 }
 // Client navigation must restore index after a noindex result screen.
 for(const [url,expected] of [['/ko/information/data/server/?server=3223','noindex'],['/ko/calculator/skill/','index'],['/ko/post/missing-post/','noindex'],['/ko/post/','index']]) {
  await page.evaluate(url=>{history.pushState({},'',url);dispatchEvent(new PopStateEvent('popstate'));},url);
  await page.waitForFunction(expected=>document.querySelector('meta[name="robots"]')?.content.startsWith(expected),{},expected);
 }
 for(const url of ['/ko/post/missing-post/','/ko/not-real/','/en/information/kartz/user/']) {
  assert.equal((await page.goto(local+url)).status(),404);
  assert.ok((await page.$eval('meta[name="robots"]',el=>el.content)).includes('noindex'));
  assert.equal(new URL(page.url()).pathname,url,'404 redirected to home');
 }
 await page.goto(local+'/information/data/server/?server=3223#details');
 await page.waitForFunction(()=>location.pathname==='/ko/information/data/server/');
 assert.equal(new URL(page.url()).search,'?server=3223');
 assert.equal(new URL(page.url()).hash,'#details');
 for(const url of ['/en/vote/cast/test-record/','/ja/vip/3223/']) {
  await page.goto(local+url);
  await page.waitForFunction(url=>location.pathname===url&&!!document.querySelector('link[rel="canonical"]'),{},url);
  await page.waitForFunction(()=>document.querySelector('meta[name="robots"]')?.content.includes('noindex'));
 }
 await page.goto(local+'/');
 await page.waitForFunction(()=>location.pathname==='/ko');
 assert.equal(await page.$eval('link[rel="canonical"]',el=>el.href),origin+'/ko/');
 assert.ok(await page.$('.research-hub a[href^="/ko/post/"]'));
 if(process.env.SEARCH_SCREENSHOT_DIR) {
  await fs.mkdir(process.env.SEARCH_SCREENSHOT_DIR,{recursive:true});
  await page.setViewport({width:1440,height:1000});
  await page.screenshot({path:path.join(process.env.SEARCH_SCREENSHOT_DIR,'home-desktop.png')});
  await page.setViewport({width:390,height:844});
  await page.screenshot({path:path.join(process.env.SEARCH_SCREENSHOT_DIR,'home-mobile.png')});
  await page.goto(local+'/ko/post/');
  await page.waitForSelector('.research-hub');
  await page.screenshot({path:path.join(process.env.SEARCH_SCREENSHOT_DIR,'research-mobile.png')});
 }
 console.log(JSON.stringify({routes:routes.length,prerenderedPages:pages,sitemapURLs:locations.length,browser:'passed',staticHTML:'passed'},null,2));
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
