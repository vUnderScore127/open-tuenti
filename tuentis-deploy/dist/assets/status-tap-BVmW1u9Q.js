import{r as i,f as a,b as c,w as d,s as l}from"./index-fk9AsaJ0.js";import"./vendor-_3huW1V5.js";import"./supabase-CZRcWlBH.js";/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */const f=()=>{const e=window;e.addEventListener("statusTap",()=>{i(()=>{const n=e.innerWidth,s=e.innerHeight,o=document.elementFromPoint(n/2,s/2);if(!o)return;const t=a(o);t&&new Promise(r=>c(t,r)).then(()=>{d(async()=>{t.style.setProperty("--overflow","hidden"),await l(t,300),t.style.removeProperty("--overflow")})})})})};export{f as startStatusTap};
