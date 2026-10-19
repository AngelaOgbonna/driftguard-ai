/* ---------- theme ---------- */
const root=document.documentElement;
const darkMQ=matchMedia("(prefers-color-scheme: dark)");
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
const cssVar=n=>getComputedStyle(root).getPropertyValue(n).trim();
function effectiveTheme(){const t=root.getAttribute("data-theme");return t==="dark"||t==="light"?t:(darkMQ.matches?"dark":"light")}
const SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
document.querySelectorAll(".theme-seg").forEach(g=>g.innerHTML=`<button type="button" data-t="light">${SUN}<span>Light</span></button><button type="button" data-t="dark">${MOON}<span>Dark</span></button>`);
function syncTheme(){const t=effectiveTheme();document.querySelectorAll(".theme-seg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.t===t));Scenes.forEach(s=>s.theme&&s.theme())}
function setTheme(t){root.setAttribute("data-theme",t);try{localStorage.setItem("dg-theme",t)}catch(e){}syncTheme()}
document.addEventListener("click",e=>{const b=e.target.closest(".theme-seg button");if(b)setTheme(b.dataset.t)});
darkMQ.addEventListener&&darkMQ.addEventListener("change",syncTheme);

/* ---------- 3D (three.js) ---------- */
const Scenes=[];
const has3D=(()=>{if(!window.THREE)return false;try{const c=document.createElement("canvas");return!!(c.getContext("webgl")||c.getContext("experimental-webgl"))}catch(e){return false}})();
function setC(c,name){c.set(cssVar(name)||"#888888");c.convertSRGBToLinear();return c}
let _dot=null;
function dotTex(){if(_dot)return _dot;const c=document.createElement("canvas");c.width=c.height=64;const g=c.getContext("2d"),gr=g.createRadialGradient(32,32,0,32,32,30);gr.addColorStop(0,"rgba(255,255,255,1)");gr.addColorStop(.55,"rgba(255,255,255,.95)");gr.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=gr;g.beginPath();g.arc(32,32,30,0,Math.PI*2);g.fill();_dot=new THREE.CanvasTexture(c);return _dot}
function baseScene(canvas,fov=40){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputEncoding=THREE.sRGBEncoding;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(fov,1,.1,200);
  const s={canvas,renderer,scene,camera,dirty:true,
    resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return false;const v=renderer.getSize(new THREE.Vector2());if(v.x!==w||v.y!==h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();s.dirty=true}return true}};
  Scenes.push(s);return s;
}
function loop(t){
  for(const s of Scenes){if(!s.canvas.offsetParent||!s.resize())continue;const anim=!RM&&s.tick;if(anim)s.tick(t/1000);if(anim||s.dirty){s.renderer.render(s.scene,s.camera);s.dirty=false}}
  requestAnimationFrame(loop);
}
// drag-to-rotate shared by the data cloud and the skyline
function dragRotate(s,obj,{minX=-.6,maxX=.9}={}){
  let d=null;s.lastInteract=0;
  s.canvas.addEventListener("pointerdown",e=>{d={x:e.clientX,y:e.clientY,ry:obj.rotation.y,rx:obj.rotation.x,moved:false};s.canvas.setPointerCapture(e.pointerId)});
  s.canvas.addEventListener("pointermove",e=>{if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.abs(dx)+Math.abs(dy)>3)d.moved=true;obj.rotation.y=d.ry+dx*.008;obj.rotation.x=clamp(d.rx+dy*.006,minX,maxX);s.lastInteract=performance.now();s.dirty=true});
  const end=e=>{if(d){s.wasDrag=d.moved;d=null}};s.canvas.addEventListener("pointerup",end);s.canvas.addEventListener("pointercancel",end);
  s.isDragging=()=>!!d;
}

// Sign-in hero: two distributions as a living terrain; the orchid peak drifts away from the moss one.
function initTerrain(canvas){
  const s=baseScene(canvas,36),{scene,camera}=s;
  const W=18,D=12,geo=new THREE.PlaneGeometry(W,D,132,88);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position,N=pos.count,colors=new Float32Array(N*3);geo.setAttribute("color",new THREE.BufferAttribute(colors,3));
  const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.18,side:THREE.DoubleSide}));
  const wire=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({wireframe:true,transparent:true,opacity:.07}));
  const group=new THREE.Group();group.add(mesh,wire);scene.add(group);group.position.set(1.6,-.6,0);
  const P=320,pp=new Float32Array(P*3),seed=mulberry32(9),ph=new Float32Array(P);for(let i=0;i<P;i++){pp[i*3]=(seed()-.5)*W;pp[i*3+1]=seed()*3.6+.3;pp[i*3+2]=(seed()-.5)*D;ph[i]=seed()*6.28}
  const pg=new THREE.BufferGeometry();pg.setAttribute("position",new THREE.BufferAttribute(pp,3));
  const pm=new THREE.PointsMaterial({size:.075,map:dotTex(),transparent:true,opacity:.9,depthWrite:false});group.add(new THREE.Points(pg,pm));
  const hemi=new THREE.HemisphereLight(0xffffff,0x000000,.85),dir=new THREE.DirectionalLight(0xffffff,.85),glow=new THREE.PointLight(0xffffff,1.3,16);
  dir.position.set(5,9,5);glow.position.set(-2,3.4,2);scene.add(hemi,dir,glow);
  camera.position.set(0,6.2,10.5);camera.lookAt(0,.2,0);scene.fog=new THREE.Fog(0xffffff,10,19);
  const cLow=new THREE.Color(),cHigh=new THREE.Color(),cNew=new THREE.Color(),tmp=new THREE.Color();
  let mx=0,my=0;window.addEventListener("pointermove",e=>{mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5},{passive:true});
  s.update=t=>{
    const cx=2.4+1.5*Math.sin(t*.32),cz=1.0*Math.cos(t*.25);
    for(let i=0;i<N;i++){const x=pos.getX(i),z=pos.getZ(i);
      const h1=1.8*Math.exp(-((x+2.8)**2+(z+.2)**2)/4.6),h2=1.45*Math.exp(-((x-cx)**2+(z-cz)**2)/2.5),rip=.07*Math.sin(x*1.15+t*.9)*Math.cos(z*1.05+t*.6);
      pos.setY(i,h1+h2+rip);tmp.copy(cLow).lerp(cHigh,clamp((h1+h2)/1.9,0,1)).lerp(cNew,clamp(h2/(h1+h2+.12)*1.05,0,.88));colors[i*3]=tmp.r;colors[i*3+1]=tmp.g;colors[i*3+2]=tmp.b}
    pos.needsUpdate=true;geo.attributes.color.needsUpdate=true;geo.computeVertexNormals();
    const pa=pg.attributes.position;for(let i=0;i<P;i++)pa.array[i*3+1]+=Math.sin(t*.8+ph[i])*.0025;pa.needsUpdate=true;
  };
  s.tick=t=>{s.update(t);group.rotation.y=Math.sin(t*.07)*.1+mx*.12;camera.position.y=6.2+my*-.8;camera.lookAt(0,.2,0)};
  s.theme=()=>{setC(cLow,"--t-low");setC(cHigh,"--t-high");setC(cNew,"--t-new");setC(wire.material.color,"--t-wire");setC(pm.color,"--gold");setC(glow.color,"--gold");setC(hemi.color,"--t-sky");setC(hemi.groundColor,"--t-ground");setC(scene.fog.color,"--t-fog");s.update(4);s.dirty=true};
  s.theme();return s;
}

// Overview: reference vs new rows projected on the first three principal components.
function initCloud(canvas){
  const s=baseScene(canvas,40),{scene,camera}=s,group=new THREE.Group();scene.add(group);
  camera.position.set(0,1.4,8.2);camera.lookAt(0,0,0);group.rotation.x=.25;
  const grid=new THREE.GridHelper(7,14);grid.position.y=-2.4;grid.material.transparent=true;grid.material.opacity=.45;grid.material.vertexColors=false;group.add(grid);
  const axes=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-3.5,-2.4,0),new THREE.Vector3(3.5,-2.4,0),new THREE.Vector3(0,-2.4,-3.5),new THREE.Vector3(0,-2.4,3.5),new THREE.Vector3(0,-2.4,0),new THREE.Vector3(0,2.6,0)]),new THREE.LineBasicMaterial({transparent:true,opacity:.5}));group.add(axes);
  const mk=()=>{const p=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({size:.12,map:dotTex(),transparent:true,opacity:.85,depthWrite:false}));group.add(p);return p};
  const pr=mk(),pn=mk();
  const sph=()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.17,32,20),new THREE.MeshStandardMaterial({roughness:.3,metalness:.4,emissiveIntensity:.35}));group.add(m);return m};
  const ca=sph(),cb=sph();
  const lineG=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),line=new THREE.Line(lineG,new THREE.LineBasicMaterial({linewidth:2}));group.add(line);
  const cone=new THREE.Mesh(new THREE.ConeGeometry(.12,.34,20),new THREE.MeshStandardMaterial({roughness:.3,metalness:.5}));group.add(cone);
  scene.add(new THREE.AmbientLight(0xffffff,.65));const dl=new THREE.DirectionalLight(0xffffff,.8);dl.position.set(3,6,5);scene.add(dl);
  dragRotate(s,group);
  s.setData=(A,B,a,b)=>{pr.geometry.setAttribute("position",new THREE.BufferAttribute(A,3));pn.geometry.setAttribute("position",new THREE.BufferAttribute(B,3));pr.geometry.computeBoundingSphere();pn.geometry.computeBoundingSphere();
    ca.position.set(...a);cb.position.set(...b);lineG.setFromPoints([ca.position.clone(),cb.position.clone()]);
    const dirV=new THREE.Vector3().subVectors(cb.position,ca.position),len=dirV.length();cone.visible=line.visible=len>.25;
    if(len>.25){cone.position.copy(cb.position).addScaledVector(dirV.normalize(),-.32);cone.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dirV)}s.dirty=true};
  s.tick=()=>{if(!s.isDragging()&&performance.now()-s.lastInteract>2500)group.rotation.y+=.0022};
  s.theme=()=>{setC(pr.material.color,"--s1");setC(pn.material.color,"--s2");setC(ca.material.color,"--s1");setC(ca.material.emissive,"--s1");setC(cb.material.color,"--s2");setC(cb.material.emissive,"--s2");
    setC(line.material.color,"--hi");setC(cone.material.color,"--hi");setC(grid.material.color,"--grid3d");setC(axes.material.color,"--grid3d");
    pn.material.blending=pr.material.blending=effectiveTheme()==="dark"?THREE.AdditiveBlending:THREE.NormalBlending;pn.material.needsUpdate=pr.material.needsUpdate=true;s.dirty=true};
  s.theme();return s;
}

// Feature drift: towers of PSI with glass threshold planes.
function initSky(canvas,onPick){
  const s=baseScene(canvas,34),{scene,camera}=s,group=new THREE.Group(),bars=new THREE.Group();scene.add(group);group.add(bars);group.rotation.x=.08;
  scene.add(new THREE.AmbientLight(0xffffff,.6));const dl=new THREE.DirectionalLight(0xffffff,.9);dl.position.set(4,8,6);scene.add(dl);const dl2=new THREE.DirectionalLight(0xffffff,.3);dl2.position.set(-5,3,-4);scene.add(dl2);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshStandardMaterial({transparent:true,opacity:.55,roughness:1}));floor.rotation.x=-Math.PI/2;group.add(floor);
  const planes=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({transparent:true,opacity:.13,side:THREE.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;const e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),new THREE.LineBasicMaterial({transparent:true,opacity:.7}));m.add(e);group.add(m);return m});
  dragRotate(s,group,{minX:-.2,maxX:.5});
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let hover=null,sel=null,rows=[];
  const sevVar={stable:"--good",minor:"--muted",moderate:"--warn",major:"--crit"};
  const paint=()=>bars.children.forEach(b=>{setC(b.material.color,sevVar[b.userData.sev]);setC(b.material.emissive,"--hi");b.material.emissiveIntensity=b===hover?.35:b.userData.f===sel?.22:0;b.scale.x=b.scale.z=b.userData.f===sel?1.12:1});
  s.setData=(rs,st,selF)=>{rows=rs;sel=selF;bars.children.slice().forEach(b=>{b.geometry.dispose();b.material.dispose();bars.remove(b)});
    const n=rs.length;if(!n){s.dirty=true;return}
    const cols=Math.min(n,n>12?Math.ceil(Math.sqrt(n*2.2)):n),nr=Math.ceil(n/cols),gap=1.25,H=3.1,maxP=Math.max(st.psiMaj*1.4,...rs.map(r=>Math.min(r.psi,2)));
    rs.forEach((r,i)=>{const h=Math.max(.05,Math.min(r.psi,maxP)/maxP*H),m=new THREE.Mesh(new THREE.BoxGeometry(.78,h,.78),new THREE.MeshStandardMaterial({roughness:.35,metalness:.15}));
      m.position.set((i%cols-(cols-1)/2)*gap,h/2,(Math.floor(i/cols)-(nr-1)/2)*gap);m.userData=r;bars.add(m)});
    const fw=cols*gap+.6,fd=nr*gap+.6;floor.scale.set(fw,fd,1);
    [st.psiMod,st.psiMaj].forEach((v,k)=>{const p=planes[k];p.scale.set(fw,fd,1);p.position.y=Math.min(v,maxP)/maxP*H;p.visible=v<maxP});
    const span=Math.max(fw*.62,fd*1.3);camera.position.set(0,2.6+span*.32,span*1.02+2.4);camera.lookAt(0,H*.38,0);paint();s.theme();s.dirty=true};
  s.highlight=f=>{sel=f;paint();s.dirty=true};
  const pickAt=e=>{const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);const hit=ray.intersectObjects(bars.children)[0];return hit?hit.object:null};
  canvas.addEventListener("pointermove",e=>{if(s.isDragging())return;const o=pickAt(e);if(o!==hover){hover=o;paint();s.dirty=true}
    if(o){const r=o.userData;tip.innerHTML=`<b>${esc(r.f)}</b><br>PSI ${fmt(r.psi)} · p ${fmtP(r.pAdj)}<br>${SEV_LABEL[r.sev]}${r.imp!=null?` · importance ${pct(r.imp,0)}`:""}`;tip.hidden=false;placeTip(e)}else tip.hidden=true;canvas.style.cursor=o?"pointer":"grab"});
  canvas.addEventListener("pointerleave",()=>{hover=null;paint();tip.hidden=true;s.dirty=true});
  canvas.addEventListener("click",e=>{if(s.wasDrag){s.wasDrag=false;return}const o=pickAt(e);if(o)onPick(o.userData.f)});
  s.tick=t=>{if(!s.isDragging()&&!hover&&performance.now()-s.lastInteract>3000)group.rotation.y=Math.sin(t*.18)*.35};
  s.theme=()=>{paint();setC(floor.material.color,"--grid3d");setC(planes[0].material.color,"--warn");setC(planes[0].children[0].material.color,"--warn");setC(planes[1].material.color,"--crit");setC(planes[1].children[0].material.color,"--crit");s.dirty=true};
  return s;
}

/* ---------- PCA for the data cloud ---------- */
function pca3(X,n,d){
  const mean=new Float64Array(d);for(let i=0;i<n;i++)for(let j=0;j<d;j++)mean[j]+=X[i*d+j]/n;
  const C=new Float64Array(d*d);
  for(let i=0;i<n;i++)for(let j=0;j<d;j++){const a=X[i*d+j]-mean[j];if(a===0)continue;for(let k=j;k<d;k++)C[j*d+k]+=a*(X[i*d+k]-mean[k])}
  for(let j=0;j<d;j++)for(let k=j;k<d;k++){C[j*d+k]/=n;C[k*d+j]=C[j*d+k]}
  let total=0;for(let j=0;j<d;j++)total+=C[j*d+j];
  const comps=[],vals=[],r=mulberry32(31);
  for(let c=0;c<Math.min(3,d);c++){let v=Float64Array.from({length:d},()=>r()-.5),lam=0;
    for(let it=0;it<80;it++){const w=new Float64Array(d);for(let j=0;j<d;j++){let s=0;for(let k=0;k<d;k++)s+=C[j*d+k]*v[k];w[j]=s}const nrm=Math.hypot(...w)||1;lam=nrm;v=w.map(x=>x/nrm)}
    comps.push(v);vals.push(lam);for(let j=0;j<d;j++)for(let k=0;k<d;k++)C[j*d+k]-=lam*v[j]*v[k]}
  while(comps.length<3){comps.push(new Float64Array(d));vals.push(0)}
  return{mean,comps,vals,total};
}
function computeCloud(R){
  const{ref,neu,schema}=S;if(!R.features.length)return null;
  const r=mulberry32(55),m=Math.min(700,ref.n),k=Math.min(700,neu.n);
  const ia=shuffle(range(ref.n),r).slice(0,m),ib=shuffle(range(neu.n),r).slice(0,k);
  const enc=R.model?R.model.enc:buildEncoder(ref,ia,R.features,schema),d=enc.d;if(!d)return null;
  const Xa=encode(enc,ref,ia),Xb=encode(enc,neu,ib),P=pca3(Xa,m,d);
  const sd=P.vals.map(v=>Math.sqrt(v)||1);
  const proj=(X,n)=>{const o=new Float32Array(n*3),c=[0,0,0];for(let i=0;i<n;i++)for(let q=0;q<3;q++){let s=0;for(let j=0;j<d;j++)s+=(X[i*d+j]-P.mean[j])*P.comps[q][j];const v=clamp(s/sd[q]*1.05,-3.3,3.3);o[i*3+q]=v;c[q]+=v/n}return[o,c]};
  const[A,ca]=proj(Xa,m),[B,cb]=proj(Xb,k);
  // map PC1→x, PC2→y, PC3→z
  const sw=(arr)=>arr;return{A:sw(A),B:sw(B),ca,cb,shift:Math.hypot(cb[0]-ca[0],cb[1]-ca[1],cb[2]-ca[2]),explained:P.total?(P.vals[0]+P.vals[1]+P.vals[2])/P.total:0};
}

/* ---------- overview & scenes ---------- */
let cloudScene=null,skyScene=null,terrainScene=null,loopOn=false;
function startLoop(){if(!loopOn&&has3D){loopOn=true;requestAnimationFrame(loop)}}
function no3d(id){const c=$(id);if(c&&!c.parentNode.querySelector(".no3d"))c.insertAdjacentHTML("afterend",'<div class="no3d">3D view needs WebGL, which this browser has turned off. The tables and charts below show the same numbers.</div>')}
function ensureAppScenes(){
  if(!has3D){no3d("#cloud");no3d("#sky");return}
  try{if(!cloudScene)cloudScene=initCloud($("#cloud"));if(!skyScene)skyScene=initSky($("#sky"),f=>{S.sel=f;renderDrift();skyScene.highlight(f);$("#featDetail")&&$("#featDetail").scrollIntoView({behavior:RM?"auto":"smooth",block:"nearest"})});startLoop()}catch(e){console.warn(e);no3d("#cloud");no3d("#sky")}
}
function updateScenes(){
  const R=S.R;if(!R)return;
  R.cloud=computeCloud(R);
  if(cloudScene&&R.cloud)cloudScene.setData(R.cloud.A,R.cloud.B,R.cloud.ca,R.cloud.cb);
  if(skyScene)skyScene.setData(sortedDrift(),S.settings,S.sel);
  const c=R.cloud;$("#cloudMeta").innerHTML=c?`<span>Centroid shift <b>${fmt(c.shift,2)}</b> σ</span><span>Variance shown <b>${pct(c.explained,0)}</b></span><span>${Math.round(c.A.length/3)} + ${Math.round(c.B.length/3)} sampled rows</span>`:"";
}
function renderOverview(){
  const R=S.R,rows=sortedDrift().slice(0,5),maxP=Math.max(S.settings.psiMaj*1.4,...rows.map(r=>r.psi));
  const sv={stable:"var(--good)",minor:"var(--muted)",moderate:"var(--warn)",major:"var(--crit)"};
  $("#topList").innerHTML=rows.length?rows.map(r=>`<div class="tl" style="--pc:${sv[r.sev]}"><span class="fname" style="overflow:hidden;text-overflow:ellipsis">${esc(r.f)}</span><span class="bar"><i style="width:${Math.min(100,r.psi/maxP*100)}%"></i></span>${sevPill(r.sev)}</div>`).join(""):`<div class="empty">No features to compare.</div>`;
  $("#dataSummary").textContent=`${S.ref.name} (${S.ref.n.toLocaleString()} rows) compared with ${S.neu.name} (${S.neu.n.toLocaleString()} rows) across ${R.features.length} features${R.predSource==="baseline"?", using a baseline model fitted on the reference data":R.predSource==="external"?`, using your "${S.cfg.pred}" predictions`:""}.`;
  const nd=R.drift.filter(r=>SEV_RANK[r.sev]>=2).length,nc=$("#navCount");nc.hidden=!nd;nc.textContent=nd;
  $("#crumb").textContent=S.isSample?"Credit default model · sample data":`${S.ref.name} → ${S.neu.name}`;
}
function afterRun(){if(S.pane==="data")selectPane("overview")}

/* ---------- navigation ---------- */
const PANES={overview:"Overview",data:"Datasets",drift:"Feature drift",perf:"Predictions & performance",stress:"Stress tests",method:"Settings & method"};
function selectPane(k){if(!PANES[k])k="overview";S.pane=k;
  document.querySelectorAll(".nav-item").forEach(b=>{if(b.dataset.nav===k)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
  Object.keys(PANES).forEach(p=>$("#p-"+p).hidden=p!==k);$("#pageTitle").textContent=PANES[k];
  Scenes.forEach(s=>s.dirty=true);try{localStorage.setItem("dg-pane",k)}catch(e){}window.scrollTo({top:0})}
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>selectPane(b.dataset.nav));
document.addEventListener("click",e=>{const g=e.target.closest("[data-goto]");if(g)selectPane(g.dataset.goto)});

/* ---------- data events ---------- */
$("#loadSample").onclick=()=>{loadSample();};
$("#runBtn").onclick=run;
$("#selTarget").onchange=e=>{S.cfg.target=e.target.value;if(S.cfg.pred===S.cfg.target)S.cfg.pred="__baseline";S.cfg.excluded.delete(S.cfg.target);refreshConfig(true)};
$("#selPred").onchange=e=>{S.cfg.pred=e.target.value;renderChips()};
$("#featChips").onclick=e=>{const c=e.target.closest(".chip");if(!c)return;const f=c.dataset.f;S.cfg.excluded.has(f)?S.cfg.excluded.delete(f):S.cfg.excluded.add(f);renderChips()};
$("#fileRef").onchange=e=>{if(e.target.files[0]){S.isSample=false;readFile(e.target.files[0],"ref")}};
$("#fileNew").onchange=e=>{if(e.target.files[0]){S.isSample=false;readFile(e.target.files[0],"new")}};
for(const[id,k]of[["#dropRef","ref"],["#dropNew","new"]]){const d=$(id);
  d.addEventListener("dragover",e=>{e.preventDefault();d.classList.add("over")});d.addEventListener("dragleave",()=>d.classList.remove("over"));
  d.addEventListener("drop",e=>{e.preventDefault();d.classList.remove("over");const f=e.dataTransfer.files[0];if(f){S.isSample=false;readFile(f,k)}})}
$("#p-drift").addEventListener("click",e=>{const tr=e.target.closest("tr.clk");if(!tr)return;S.sel=tr.dataset.f;document.querySelectorAll("#p-drift tr.clk").forEach(r=>r.classList.toggle("sel",r===tr));renderDetail();skyScene&&skyScene.highlight(S.sel)});
$("#p-drift").addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const tr=e.target.closest("tr.clk");if(tr){e.preventDefault();tr.click()}});
$("#copyBtn").onclick=()=>{const md=reportMd();if(!md){toast("Run an analysis first");return}
  const fb=()=>{let ta=$("#copyFb");if(!ta){ta=document.createElement("textarea");ta.id="copyFb";ta.className="copyfb";ta.readOnly=true;$("#verdict").after(ta)}selectPane("overview");ta.value=md;ta.focus();ta.select();toast("Select all and copy the report below")};
  try{navigator.clipboard.writeText(md).then(()=>toast("Report copied as Markdown"),fb)}catch(e){fb()}};
const tip=$("#tip");
function placeTip(e){const w=tip.offsetWidth,h=tip.offsetHeight;let x=e.clientX+14,y=e.clientY+14;if(x+w>innerWidth-8)x=e.clientX-w-14;if(y+h>innerHeight-8)y=e.clientY-h-14;tip.style.left=x+"px";tip.style.top=y+"px"}
document.addEventListener("mousemove",e=>{if(e.target.id==="sky")return;const t=e.target.closest&&e.target.closest("[data-tip]");if(!t){tip.hidden=true;return}tip.innerHTML=t.getAttribute("data-tip");tip.hidden=false;placeTip(e)});
document.addEventListener("scroll",()=>tip.hidden=true,{passive:true});

/* ---------- auth ---------- */
const CFG=window.DRIFTGUARD_CONFIG||{};
const authOn=!!(CFG.supabaseUrl&&CFG.supabaseAnonKey);
let sb=null,authMode="signin";
function loadScript(src){return new Promise((ok,no)=>{const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=()=>no(new Error("Could not load "+src));document.head.appendChild(s)})}
function authMsg(t,kind=""){const m=$("#authMsg");m.textContent=t;m.className="msg "+kind}
function setAuthMode(m){authMode=m;const up=m==="signup";
  $("#authTitle").textContent=up?"Create your account":"Welcome back";$("#authSub").textContent=up?"Start monitoring your models in minutes.":"Sign in to your DriftGuard workspace.";
  $("#authSubmit").textContent=up?"Create account":"Sign in";$("#authPass").autocomplete=up?"new-password":"current-password";
  $("#forgotBtn").hidden=up;$("#switchRow").innerHTML=up?'Already have an account? <button type="button" class="link" id="switchMode">Sign in</button>':'New to DriftGuard? <button type="button" class="link" id="switchMode">Create an account</button>';
  $("#switchMode").onclick=()=>setAuthMode(up?"signin":"signup");authMsg("")}
function showAuth(){
  $("#appView").hidden=true;$("#authView").hidden=false;document.title="Sign in · DriftGuard AI";
  $("#authNotice").hidden=authOn;
  ["#authEmail","#authPass","#authSubmit","#googleBtn","#forgotBtn","#switchMode"].forEach(id=>{const el=$(id);if(el)el.disabled=!authOn});
  if(has3D&&!terrainScene){try{terrainScene=initTerrain($("#terrain"));startLoop()}catch(e){console.warn(e)}}
  syncTheme();
}
function enterApp(user){
  S.user=user;$("#authView").hidden=true;$("#appView").hidden=false;document.title="DriftGuard AI";
  const name=user?(user.user_metadata&&user.user_metadata.full_name)||user.email:"Guest";
  $("#userName").textContent=name;$("#userKind").textContent=user?"Signed in":"Sample workspace";$("#avatar").textContent=(name||"G").trim()[0].toUpperCase();
  ensureAppScenes();syncTheme();
  let saved=null;try{saved=localStorage.getItem("dg-pane")}catch(e){}
  const h=(location.hash||"").slice(1);selectPane(PANES[h]?h:(PANES[saved]?saved:"overview"));
  if(!S.R)loadSample();else updateScenes();
}
async function signOut(){try{if(sb)await sb.auth.signOut()}catch(e){}try{localStorage.removeItem("dg-guest")}catch(e){}S.user=null;setAuthMode("signin");showAuth()}
$("#signOut").onclick=signOut;$("#signOutM").onclick=signOut;
$("#guestBtn").onclick=()=>{try{localStorage.setItem("dg-guest","1")}catch(e){}enterApp(null)};
$("#authForm").addEventListener("submit",async e=>{e.preventDefault();if(!sb)return;
  const email=$("#authEmail").value.trim(),pw=$("#authPass").value;
  if(!/^\S+@\S+\.\S+$/.test(email))return authMsg("Enter a valid email address.","err");
  if(pw.length<8)return authMsg("Passwords need at least 8 characters.","err");
  const b=$("#authSubmit");b.disabled=true;authMsg(authMode==="signup"?"Creating your account…":"Signing in…");
  try{
    if(authMode==="signup"){const{data,error}=await sb.auth.signUp({email,password:pw,options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error;
      if(data.session)enterApp(data.user);else authMsg("Check your inbox to confirm your email, then sign in.","ok")}
    else{const{data,error}=await sb.auth.signInWithPassword({email,password:pw});if(error)throw error;enterApp(data.user)}
  }catch(err){authMsg(err.message||"Sign-in failed. Try again.","err")}
  b.disabled=false});
$("#forgotBtn").onclick=async()=>{if(!sb)return;const email=$("#authEmail").value.trim();if(!/^\S+@\S+\.\S+$/.test(email))return authMsg("Type your email above, then select Forgot password.","err");
  const{error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});authMsg(error?error.message:"Password reset link sent. Check your inbox.",error?"err":"ok")};
$("#googleBtn").onclick=async()=>{if(!sb)return;const{error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+location.pathname}});if(error)authMsg(error.message,"err")};

async function boot(){
  setAuthMode("signin");syncTheme();
  if(authOn){
    try{await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js");
      sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey);
      const{data}=await sb.auth.getSession();
      sb.auth.onAuthStateChange((ev,session)=>{if(ev==="SIGNED_IN"&&session&&$("#appView").hidden)enterApp(session.user);if(ev==="SIGNED_OUT")showAuth()});
      if(data.session)return enterApp(data.session.user);
    }catch(e){console.error(e);sb=null}
  }
  let guest=false;try{guest=localStorage.getItem("dg-guest")==="1"}catch(e){}
  if(guest)enterApp(null);else showAuth();
}
const _loadSample=loadSample;loadSample=function(){S.isSample=true;_loadSample()};
boot();
