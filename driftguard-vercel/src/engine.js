/* ---------- utilities ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function randn(r){let u=0;while(u===0)u=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*r())}
function poisson(r,l){const L=Math.exp(-l);let k=0,p=1;do{k++;p*=r()}while(p>L);return k-1}
function pick(r,items,probs){let u=r(),c=0;for(let i=0;i<items.length;i++){c+=probs[i];if(u<c)return items[i]}return items[items.length-1]}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sigmoid=z=>1/(1+Math.exp(-z));
function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const range=n=>Array.from({length:n},(_,i)=>i);
const fin=Number.isFinite;
function fmt(x,d=3){if(x==null||!fin(x))return"—";const a=Math.abs(x);if(a>=10000)return x.toLocaleString(undefined,{maximumFractionDigits:0});if(a>=100)return x.toFixed(1);return x.toFixed(d)}
function fmtP(p){if(p==null||!fin(p))return"—";return p<0.001?"<0.001":p.toFixed(3)}
const pct=(x,d=1)=>x==null||!fin(x)?"—":(x*100).toFixed(d)+"%";
const spct=(x,d=1)=>x==null||!fin(x)?"—":(x>0?"+":x<0?"−":"")+Math.abs(x*100).toFixed(d)+"%";
function quant(s,p){if(!s.length)return NaN;const h=(s.length-1)*p,lo=Math.floor(h),hi=Math.ceil(h);return s[lo]+(s[hi]-s[lo])*(h-lo)}
function upper(s,x){let lo=0,hi=s.length;while(lo<hi){const m=(lo+hi)>>1;if(s[m]<=x)lo=m+1;else hi=m}return lo}
function meanStd(a){let n=0,m=0,q=0;for(const v of a){if(!fin(v))continue;n++;const d=v-m;m+=d/n;q+=d*(v-m)}return{n,mean:m,std:n>1?Math.sqrt(q/(n-1)):0}}
const tick=()=>new Promise(r=>setTimeout(r,16));

/* ---------- statistics ---------- */
function gammaln(x){const c=[76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5];let y=x,t=x+5.5;t-=(x+.5)*Math.log(t);let s=1.000000000190015;for(const cj of c)s+=cj/++y;return -t+Math.log(2.5066282746310005*s/x)}
function gammaQ(a,x){ // upper regularized incomplete gamma
  if(x<=0)return 1;
  const lf=-x+a*Math.log(x)-gammaln(a);
  if(x<a+1){let ap=a,sum=1/a,del=sum;for(let n=0;n<1000;n++){ap++;del*=x/ap;sum+=del;if(Math.abs(del)<Math.abs(sum)*1e-15)break}return Math.max(0,1-sum*Math.exp(lf))}
  let b=x+1-a,c=1e300,d=1/b,h=d;
  for(let i=1;i<1000;i++){const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<1e-300)d=1e-300;c=b+an/c;if(Math.abs(c)<1e-300)c=1e-300;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<1e-15)break}
  return Math.exp(lf)*h;
}
const chi2p=(x,df)=>df<=0?1:gammaQ(df/2,x/2);
function ksD(a,b){let i=0,j=0,d=0;const n=a.length,m=b.length;while(i<n&&j<m){const x=Math.min(a[i],b[j]);while(i<n&&a[i]<=x)i++;while(j<m&&b[j]<=x)j++;d=Math.max(d,Math.abs(i/n-j/m))}return d}
function ksP(D,n,m){const en=Math.sqrt(n*m/(n+m)),l=(en+.12+.11/en)*D;if(l<1e-3)return 1;let s=0,sg=1;for(let k=1;k<=100;k++){const t=sg*Math.exp(-2*k*k*l*l);s+=t;if(Math.abs(t)<1e-12)break;sg=-sg}return clamp(2*s,0,1)}
function psiOf(pa,pb){const e=1e-4;let s=0;for(let i=0;i<pa.length;i++){const a=Math.max(pa[i],e),b=Math.max(pb[i],e);s+=(b-a)*Math.log(b/a)}return s}
function bh(ps){const m=ps.length,o=range(m).sort((i,j)=>ps[i]-ps[j]),adj=new Array(m);let mn=1;for(let r=m-1;r>=0;r--){const i=o[r];mn=Math.min(mn,ps[i]*m/(r+1));adj[i]=mn}return adj}

/* ---------- data ingestion ---------- */
const NA=new Set(["","na","nan","null","none","?","n/a","#n/a"]);
const isNA=v=>v==null||NA.has(String(v).trim().toLowerCase());
function makeDataset(name,rows,fields){
  fields=fields.filter(f=>f!=null&&String(f).trim()!=="");
  let note="";
  if(rows.length>60000){const r=mulberry32(11);rows=shuffle(rows.slice(),r).slice(0,60000);note=" (random sample of 60,000 rows)"}
  const raw={};for(const f of fields)raw[f]=rows.map(r=>r[f]==null?"":String(r[f]).trim());
  return{name,n:rows.length,fields,raw,note};
}
function inferSchema(ref){
  const sc={};
  for(const f of ref.fields){
    const v=ref.raw[f];let ne=0,num=0;const u=new Set();
    for(const x of v){if(isNA(x))continue;ne++;if(fin(+x))num++;if(u.size<=5000)u.add(x)}
    let type=ne===0?"empty":(num/ne>=.95&&u.size>6?"numeric":"categorical");
    const idLike=(type==="categorical"&&ne>50&&u.size>.9*ne)||/(^|_|\b)id$/i.test(f)&&u.size>.9*ne;
    sc[f]={type,idLike,unique:u.size,missing:1-ne/ref.n};
  }
  return sc;
}
function typeCols(d,sc){
  d.cols={};
  for(const f in sc){const raw=d.raw[f];if(!raw){d.cols[f]=null;continue}
    if(sc[f].type==="numeric"){const a=new Float64Array(d.n);for(let i=0;i<d.n;i++){const x=isNA(raw[i])?NaN:+raw[i];a[i]=fin(x)?x:NaN}d.cols[f]=a}
    else d.cols[f]=raw.map(x=>isNA(x)?null:x);
  }
}

/* ---------- sample data: synthetic credit default ---------- */
const BASE={incomeMul:1,debtAdd:0,utilAdd:0,lateRate:.6,lateW:.8,utilW:.6,debtW:1,regionEff:{north:0,south:0,east:0,west:0},emp:[.6,.2,.12,.08],region:[.3,.25,.25,.2],miss:.02};
const SCEN={
  stable:{},
  covariate:{incomeMul:.84,debtAdd:.06,utilAdd:.1,lateRate:.9,emp:[.5,.2,.12,.18],region:[.2,.42,.2,.18],miss:.07},
  concept:{lateW:.25,utilW:.05,debtW:.35,regionEff:{north:0,south:1.1,east:-.3,west:.4},empEff:{salaried:0,"self-employed":.9,contract:.2,unemployed:.6}},
  both:{incomeMul:.84,debtAdd:.06,utilAdd:.1,lateRate:.9,emp:[.5,.2,.12,.18],region:[.2,.42,.2,.18],miss:.07,lateW:.25,utilW:.05,debtW:.35,regionEff:{north:0,south:1.1,east:-.3,west:.4},empEff:{salaried:0,"self-employed":.9,contract:.2,unemployed:.6}}
};
function genCredit(n,seed,o){
  o={...BASE,...o};const r=mulberry32(seed),rows=[];
  const empEff=o.empEff||{salaried:0,"self-employed":.3,contract:.5,unemployed:1.2};
  for(let i=0;i<n;i++){
    const age=Math.round(clamp(41+11*randn(r),18,80));
    const income=Math.round(55*Math.exp(.4*randn(r))*o.incomeMul*10)/10;
    const debt=+clamp(.32+o.debtAdd+.12*randn(r),.01,.95).toFixed(3);
    const util=+clamp(.35+o.utilAdd+.2*randn(r),0,1).toFixed(3);
    const lines=poisson(r,5),late=poisson(r,o.lateRate);
    const months=Math.round(clamp(60+40*randn(r),1,360));
    const emp=pick(r,["salaried","self-employed","contract","unemployed"],o.emp);
    const region=pick(r,["north","south","east","west"],o.region);
    const z=-1.7+o.debtW*(debt-.32)/.12+o.regionEff[region]+o.lateW*late+o.utilW*(util-.35)/.2-.6*Math.log(income/55)/.4-.015*(age-41)+empEff[emp]-.004*(months-60);
    rows.push({customer_id:"C"+(seed*1e5+i),age,annual_income_k:r()<o.miss?"":income,debt_to_income:debt,credit_utilization:util,open_credit_lines:lines,late_payments_12m:late,account_age_months:months,employment:emp,region,defaulted:r()<sigmoid(z)?1:0});
  }
  return rows;
}

/* ---------- model: encoder, softmax regression, ridge ---------- */
function buildEncoder(data,idx,features,sc){
  const blocks=[];let d=0;
  for(const f of features){const col=data.cols[f];
    if(sc[f].type==="numeric"){const v=[];for(const i of idx){const x=col?col[i]:NaN;if(fin(x))v.push(x)}v.sort((a,b)=>a-b);const ms=meanStd(v);
      blocks.push({f,type:"num",start:d,len:1,mean:ms.mean,std:ms.std||1,fill:v.length?quant(v,.5):0});d++}
    else{const cnt=new Map();for(const i of idx){const x=col?col[i]:null;if(x!=null)cnt.set(x,(cnt.get(x)||0)+1)}
      const levels=[...cnt.entries()].sort((a,b)=>b[1]-a[1]).slice(0,14).map(e=>e[0]);
      blocks.push({f,type:"cat",start:d,len:levels.length,levels,index:new Map(levels.map((l,k)=>[l,k]))});d+=levels.length}
  }
  return{blocks,d};
}
function encode(enc,data,idx){
  const n=idx.length,d=enc.d,X=new Float64Array(n*d);
  for(const b of enc.blocks){const col=data.cols[b.f];
    if(b.type==="num")for(let r=0;r<n;r++){let v=col?col[idx[r]]:NaN;if(!fin(v))v=b.fill;X[r*d+b.start]=clamp((v-b.mean)/b.std,-8,8)}
    else for(let r=0;r<n;r++){const v=col?col[idx[r]]:null;const k=b.index.get(v);if(k!==undefined)X[r*d+b.start+k]=1}
  }
  return X;
}
function trainSoftmax(X,n,d,y,K,iters=220,l2=1e-3,lr=.08){
  const P=(d+1)*K,W=new Float64Array(P),m=new Float64Array(P),v=new Float64Array(P),g=new Float64Array(P),z=new Float64Array(K);
  for(let t=1;t<=iters;t++){g.fill(0);
    for(let i=0;i<n;i++){const o=i*d;for(let k=0;k<K;k++)z[k]=W[d*K+k];
      for(let j=0;j<d;j++){const x=X[o+j];if(x!==0)for(let k=0;k<K;k++)z[k]+=x*W[j*K+k]}
      let mx=-Infinity;for(let k=0;k<K;k++)if(z[k]>mx)mx=z[k];let s=0;for(let k=0;k<K;k++){z[k]=Math.exp(z[k]-mx);s+=z[k]}
      for(let k=0;k<K;k++)z[k]=z[k]/s-(y[i]===k?1:0);
      for(let j=0;j<d;j++){const x=X[o+j];if(x!==0)for(let k=0;k<K;k++)g[j*K+k]+=z[k]*x}
      for(let k=0;k<K;k++)g[d*K+k]+=z[k];
    }
    const b1=1-.9**t,b2=1-.999**t;
    for(let p=0;p<P;p++){const gp=g[p]/n+(p<d*K?l2*W[p]:0);m[p]=.9*m[p]+.1*gp;v[p]=.999*v[p]+.001*gp*gp;W[p]-=lr*(m[p]/b1)/(Math.sqrt(v[p]/b2)+1e-8)}
  }
  return W;
}
function softmaxProba(W,X,n,d,K){const P=new Float64Array(n*K),z=new Float64Array(K);
  for(let i=0;i<n;i++){const o=i*d;for(let k=0;k<K;k++)z[k]=W[d*K+k];for(let j=0;j<d;j++){const x=X[o+j];if(x!==0)for(let k=0;k<K;k++)z[k]+=x*W[j*K+k]}
    let mx=-Infinity;for(let k=0;k<K;k++)if(z[k]>mx)mx=z[k];let s=0;for(let k=0;k<K;k++){z[k]=Math.exp(z[k]-mx);s+=z[k]}for(let k=0;k<K;k++)P[i*K+k]=z[k]/s}
  return P}
function trainRidge(X,n,d,y,l2=1e-3){
  const D=d+1,A=new Float64Array(D*D),b=new Float64Array(D),row=new Float64Array(D);
  for(let i=0;i<n;i++){for(let j=0;j<d;j++)row[j]=X[i*d+j];row[d]=1;for(let j=0;j<D;j++){if(row[j]===0)continue;b[j]+=row[j]*y[i];for(let k=0;k<D;k++)A[j*D+k]+=row[j]*row[k]}}
  for(let j=0;j<d;j++)A[j*D+j]+=l2*n+1e-9;A[d*D+d]+=1e-9;
  // Gaussian elimination with partial pivoting
  for(let c=0;c<D;c++){let p=c;for(let r=c+1;r<D;r++)if(Math.abs(A[r*D+c])>Math.abs(A[p*D+c]))p=r;
    if(p!==c){for(let k=0;k<D;k++){const t=A[c*D+k];A[c*D+k]=A[p*D+k];A[p*D+k]=t}const t=b[c];b[c]=b[p];b[p]=t}
    const pv=A[c*D+c]||1e-12;for(let r=c+1;r<D;r++){const f=A[r*D+c]/pv;if(f===0)continue;for(let k=c;k<D;k++)A[r*D+k]-=f*A[c*D+k];b[r]-=f*b[c]}}
  const w=new Float64Array(D);for(let r=D-1;r>=0;r--){let s=b[r];for(let k=r+1;k<D;k++)s-=A[r*D+k]*w[k];w[r]=s/(A[r*D+r]||1e-12)}
  return w;
}
function fitModel(task,K,data,idx,y,features,sc){
  const enc=buildEncoder(data,idx,features,sc);
  let rows=idx;if(rows.length>6000)rows=shuffle(idx.slice(),mulberry32(5)).slice(0,6000);
  const X=encode(enc,data,rows),yy=rows.map(i=>y[i]);
  const W=task==="cls"?trainSoftmax(X,rows.length,enc.d,yy,K):trainRidge(X,rows.length,enc.d,yy);
  return makeModel(task,K,enc,W);
}
function makeModel(task,K,enc,W){
  return{task,K,enc,W,
    predX(X,n){const d=enc.d;
      if(task==="cls"){const P=softmaxProba(W,X,n,d,K),yh=new Float64Array(n);for(let i=0;i<n;i++){let b=0;for(let k=1;k<K;k++)if(P[i*K+k]>P[i*K+b])b=k;yh[i]=b}return{proba:P,yhat:yh,K}}
      const yh=new Float64Array(n);for(let i=0;i<n;i++){let s=W[d];for(let j=0;j<d;j++)s+=X[i*d+j]*W[j];yh[i]=s}return{proba:null,yhat:yh,K}},
    predict(data,idx){return this.predX(encode(enc,data,idx),idx.length)}};
}

/* ---------- metrics ---------- */
const METRIC={auc:{label:"ROC AUC",hi:true},accuracy:{label:"Accuracy",hi:true},f1:{label:"Macro F1",hi:true},logloss:{label:"Log loss",hi:false},brier:{label:"Brier score",hi:false},ece:{label:"Calibration error (ECE)",hi:false},rmse:{label:"RMSE",hi:false},mae:{label:"MAE",hi:false},r2:{label:"R²",hi:true}};
function metric(name,y,pr,rows){
  const n=rows.length;if(!n)return NaN;const K=pr.K,P=pr.proba,yh=pr.yhat;
  switch(name){
    case"accuracy":{let c=0;for(const i of rows)if(yh[i]===y[i])c++;return c/n}
    case"f1":{let s=0,used=0;for(let k=0;k<K;k++){let tp=0,fp=0,fn=0;for(const i of rows){const a=y[i]===k,b=yh[i]===k;if(a&&b)tp++;else if(b)fp++;else if(a)fn++}if(tp+fp+fn===0)continue;used++;s+=2*tp/(2*tp+fp+fn)}return used?s/used:NaN}
    case"auc":{if(!P||K!==2)return NaN;const a=rows.map(i=>[P[i*2+1],y[i]]).sort((u,v)=>u[0]-v[0]);let R=0,np=0,i=0;
      while(i<a.length){let j=i;while(j+1<a.length&&a[j+1][0]===a[i][0])j++;const rk=(i+j)/2+1;for(let t=i;t<=j;t++)if(a[t][1]===1){R+=rk;np++}i=j+1}
      const nn=a.length-np;return np&&nn?(R-np*(np+1)/2)/(np*nn):NaN}
    case"logloss":{if(!P)return NaN;let s=0;for(const i of rows)s-=Math.log(Math.max(P[i*K+y[i]],1e-12));return s/n}
    case"brier":{if(!P||K!==2)return NaN;let s=0;for(const i of rows){const d=P[i*2+1]-(y[i]===1?1:0);s+=d*d}return s/n}
    case"ece":{if(!P||K!==2)return NaN;const B=10,cn=new Array(B).fill(0),sp=new Array(B).fill(0),sy=new Array(B).fill(0);for(const i of rows){const p=P[i*2+1],b=Math.min(B-1,Math.floor(p*B));cn[b]++;sp[b]+=p;sy[b]+=y[i]===1?1:0}let e=0;for(let b=0;b<B;b++)if(cn[b])e+=Math.abs(sy[b]-sp[b])/n;return e}
    case"rmse":{let s=0;for(const i of rows){const d=yh[i]-y[i];s+=d*d}return Math.sqrt(s/n)}
    case"mae":{let s=0;for(const i of rows)s+=Math.abs(yh[i]-y[i]);return s/n}
    case"r2":{let m=0;for(const i of rows)m+=y[i];m/=n;let a=0,b=0;for(const i of rows){a+=(yh[i]-y[i])**2;b+=(y[i]-m)**2}return b?1-a/b:NaN}
  }
}
function metricList(task,K,pr){if(task==="reg")return["rmse","mae","r2"];if(!pr.proba)return["accuracy","f1"];return K===2?["auc","accuracy","f1","logloss","brier","ece"]:["accuracy","f1","logloss"]}
function primaryMetric(task,K,pr){return task==="reg"?"rmse":(pr.proba&&K===2?"auc":"accuracy")}
const relDrop=(name,base,val)=>METRIC[name].hi?(base-val)/Math.abs(base):(val-base)/Math.abs(base);

/* ---------- drift tests ---------- */
function numDrift(a0,b0,n0,n1){
  const a=Float64Array.from(a0).sort(),b=Float64Array.from(b0).sort();
  const res={type:"numeric",missA:1-a.length/n0,missB:1-b.length/n1};
  if(a.length<5||b.length<5){Object.assign(res,{stat:NaN,p:1,psi:0,w1:0,shift:0});return res}
  const D=ksD(a,b);res.stat=D;res.p=ksP(D,a.length,b.length);res.test="KS";
  const edges=[...new Set([.1,.2,.3,.4,.5,.6,.7,.8,.9].map(q=>quant(a,q)))];
  const binc=s=>{const c=new Array(edges.length+1).fill(0);let prev=0;edges.forEach((e,k)=>{const u=upper(s,e);c[k]=u-prev;prev=u});c[edges.length]=s.length-prev;return c};
  const ca=binc(a),cb=binc(b);ca.push(n0-a.length);cb.push(n1-b.length);
  res.psi=psiOf(ca.map(c=>c/n0),cb.map(c=>c/n1));
  const ms=meanStd(a),sd=ms.std||1;let w=0;for(let k=0;k<100;k++){const q=(k+.5)/100;w+=Math.abs(quant(a,q)-quant(b,q))}
  res.w1=w/100/sd;res.shift=(meanStd(b).mean-ms.mean)/sd;res.meanA=ms.mean;res.meanB=meanStd(b).mean;res.sdA=sd;res.sdB=meanStd(b).std;
  res.medA=quant(a,.5);res.medB=quant(b,.5);
  // histogram for charts
  let lo=Math.min(quant(a,.005),quant(b,.005)),hi=Math.max(quant(a,.995),quant(b,.995));if(!(hi>lo))hi=lo+1;
  const NB=28,bw=(hi-lo)/NB,ha=new Array(NB).fill(0),hb=new Array(NB).fill(0);
  for(const x of a)ha[clamp(Math.floor((x-lo)/bw),0,NB-1)]++;for(const x of b)hb[clamp(Math.floor((x-lo)/bw),0,NB-1)]++;
  res.hist={kind:"num",lo,hi,ref:ha.map(c=>c/a.length),neu:hb.map(c=>c/b.length)};
  return res;
}
function catDrift(va,vb){
  const ca=new Map(),cb=new Map(),MISS="(missing)";
  for(const v of va){const k=v??MISS;ca.set(k,(ca.get(k)||0)+1)}for(const v of vb){const k=v??MISS;cb.set(k,(cb.get(k)||0)+1)}
  const n0=va.length,n1=vb.length;let unseen=0;for(const[k,c]of cb)if(!ca.has(k)&&k!==MISS)unseen+=c;
  const keys=[...new Set([...ca.keys(),...cb.keys()])];
  // pool sparse categories for the chi-square test
  const big=[],other=[0,0];for(const k of keys){const a=ca.get(k)||0,b=cb.get(k)||0;if(a+b>=10)big.push([k,a,b]);else{other[0]+=a;other[1]+=b}}
  if(other[0]+other[1]>0)big.push(["(other)",other[0],other[1]]);
  let chi=0;const N=n0+n1;for(const[,a,b]of big){const t=a+b;const ea=t*n0/N,eb=t*n1/N;if(ea>0)chi+=(a-ea)**2/ea;if(eb>0)chi+=(b-eb)**2/eb}
  const df=big.length-1;
  const res={type:"categorical",test:"χ²",stat:chi,df,p:df>0?chi2p(chi,df):1,psi:psiOf(big.map(e=>e[1]/n0),big.map(e=>e[2]/n1)),unseen:n1?unseen/n1:0,
    missA:(ca.get(MISS)||0)/n0,missB:(cb.get(MISS)||0)/n1,levelsA:[...ca.keys()].filter(k=>k!==MISS).length};
  // Cramér's V as effect size
  res.cramer=N&&df>0?Math.sqrt(chi/N):0;
  const top=keys.map(k=>[k,(ca.get(k)||0)/n0,(cb.get(k)||0)/n1]).sort((x,y)=>(y[1]+y[2])-(x[1]+x[2]));
  const shown=top.slice(0,9),rest=top.slice(9);
  if(rest.length)shown.push(["(other)",rest.reduce((s,e)=>s+e[1],0),rest.reduce((s,e)=>s+e[2],0)]);
  res.hist={kind:"cat",labels:shown.map(e=>e[0]),ref:shown.map(e=>e[1]),neu:shown.map(e=>e[2])};
  res.top=top;
  return res;
}
function severity(r,st){
  if(r.missingInNew)return"major";
  if(!(r.pAdj<st.alpha))return"stable";
  if(r.psi>=st.psiMaj)return"major";
  if(r.psi>=st.psiMod)return"moderate";
  return"minor";
}
const SEV_RANK={major:3,moderate:2,minor:1,stable:0};
const SEV_LABEL={major:"Major drift",moderate:"Moderate drift",minor:"Minor",stable:"Stable"};

/* ---------- state ---------- */
const S={ref:null,neu:null,schema:null,cfg:{target:"",pred:"",excluded:new Set()},
  settings:{psiMod:.1,psiMaj:.25,alpha:.05,tol:.05,retrain:.10,domain:.75},R:null,sel:null,tab:"drift"};
const LEVELS=[{k:"Stable",c:"var(--good)",head:"The model looks reliable on the new data."},{k:"Monitor",c:"var(--warn)",head:"Small changes detected. Keep watching the next batches."},{k:"Investigate",c:"var(--serious)",head:"Material drift. Investigate before trusting these predictions."},{k:"Retrain",c:"var(--crit)",head:"Performance has degraded. Retrain the model."}];

/* ---------- analysis ---------- */
function labelArray(d,target,task,classes){
  const raw=d.raw[target];if(!raw)return null;
  if(task==="reg")return Float64Array.from(raw,v=>isNA(v)||!fin(+v)?NaN:+v);
  const ix=new Map(classes.map((c,i)=>[c,i]));return Int32Array.from(raw,v=>isNA(v)?-1:(ix.has(v)?ix.get(v):-2));
}
const validRows=(y,task)=>y?range(y.length).filter(i=>task==="reg"?fin(y[i]):y[i]>=0):[];
function externalPred(d,col,task,K){
  const raw=d.raw[col];if(!raw)return null;
  const n=d.n,nums=raw.map(v=>isNA(v)?NaN:+v);
  if(task==="reg")return{proba:null,yhat:Float64Array.from(nums),K};
  const allProb=nums.every(x=>!fin(x)||(x>=0&&x<=1))&&nums.some(x=>fin(x)&&x>0&&x<1);
  if(K===2&&allProb){const P=new Float64Array(n*2),yh=new Float64Array(n);for(let i=0;i<n;i++){const p=fin(nums[i])?nums[i]:.5;P[i*2]=1-p;P[i*2+1]=p;yh[i]=p>=.5?1:0}return{proba:P,yhat:yh,K,isProb:true}}
  const ix=new Map(S.classes.map((c,i)=>[c,i]));return{proba:null,yhat:Float64Array.from(raw,v=>ix.has(v)?ix.get(v):-1),K};
}
function subset(d,idx){const cols={};for(const f in d.cols){const c=d.cols[f];if(!c){cols[f]=null;continue}cols[f]=c instanceof Float64Array?Float64Array.from(idx,i=>c[i]):idx.map(i=>c[i])}return{n:idx.length,cols}}

async function analyze(){
  const{ref,neu,schema:sc,cfg,settings:st}=S;
  const R={warnings:[]};
  const target=cfg.target,predCol=cfg.pred&&cfg.pred!=="__baseline"?cfg.pred:"";
  R.features=ref.fields.filter(f=>f!==target&&f!==predCol&&!cfg.excluded.has(f)&&(sc[f].type==="numeric"||sc[f].type==="categorical"));
  const extra=neu.fields.filter(f=>!(f in sc));if(extra.length)R.warnings.push(`New data has ${extra.length} column${extra.length>1?"s":""} not in the reference (${extra.slice(0,4).join(", ")}${extra.length>4?"…":""}); ignored.`);
  // 1. feature drift
  R.drift=R.features.map(f=>{
    let r;const missing=!neu.raw[f];
    if(sc[f].type==="numeric"){const a=[],b=[];const ca=ref.cols[f],cb=neu.cols[f];for(let i=0;i<ref.n;i++)if(fin(ca[i]))a.push(ca[i]);if(cb)for(let i=0;i<neu.n;i++)if(fin(cb[i]))b.push(cb[i]);r=numDrift(a,b,ref.n,neu.n)}
    else r=catDrift(ref.cols[f],neu.cols[f]||new Array(neu.n).fill(null));
    r.f=f;r.missingInNew=missing;return r;
  });
  const adj=bh(R.drift.map(r=>r.p));R.drift.forEach((r,i)=>{r.pAdj=adj[i];r.sev=severity(r,st)});
  await tick();
  // 2. model
  R.task=null;
  if(target){R.task=sc[target].type==="numeric"?"reg":"cls";
    if(R.task==="cls"){const u=[...new Set(ref.raw[target].filter(v=>!isNA(v)))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));S.classes=u;R.classes=u;R.K=u.length;
      if(u.length<2){R.task=null;R.warnings.push("The label column has only one class in the reference data, so performance checks are off.")}
      if(u.length>20){R.task=null;R.warnings.push("The label column has more than 20 classes. Mark it as a feature or pick another label.")}}
    else R.K=1;
  }
  const yRef=R.task?labelArray(ref,target,R.task,S.classes):null,yNew=R.task?labelArray(neu,target,R.task,S.classes):null;
  const refRows=validRows(yRef,R.task),newRows=validRows(yNew,R.task);
  if(yNew&&R.task==="cls"){const unk=Array.from(yNew).filter(v=>v===-2).length;if(unk)R.warnings.push(`${unk} new rows have label values never seen in the reference; they are left out of performance metrics.`)}
  R.hasNewLabels=newRows.length>=30;
  if(R.task&&refRows.length>=60&&R.features.length){
    const sh=shuffle(refRows.slice(),mulberry32(42)),cut=Math.floor(sh.length*.7);
    R.trainIdx=sh.slice(0,cut);R.holdIdx=sh.slice(cut);
    R.model=fitModel(R.task,R.K,ref,R.trainIdx,yRef,R.features,sc);
  }
  await tick();
  // 3. predictions
  let pRef=null,pNew=null,evalRef=[];
  if(predCol&&R.task){pRef=externalPred(ref,predCol,R.task,R.K);pNew=externalPred(neu,predCol,R.task,R.K);R.predSource="external";
    if(pRef)evalRef=refRows.filter(i=>R.task==="reg"?fin(pRef.yhat[i]):pRef.yhat[i]>=0);
    if(!pNew)R.warnings.push(`The new data has no "${predCol}" column, so prediction drift cannot be measured from your model.`)}
  else if(predCol&&!R.task){R.predSource="external-nolabel";const vals=c=>c?c.map(v=>isNA(v)?NaN:+v):null;R.extRaw=[ref.raw[predCol],neu.raw[predCol]]}
  else if(R.model){pRef=R.model.predict(ref,range(ref.n));pNew=R.model.predict(neu,range(neu.n));evalRef=R.holdIdx;R.predSource="baseline"}
  R.pRef=pRef;R.pNew=pNew;R.yRef=yRef;R.yNew=yNew;
  // prediction drift
  if(pRef&&pNew){
    if(R.task==="reg")R.predDrift=numDrift(Array.from(pRef.yhat).filter(fin),Array.from(pNew.yhat).filter(fin),ref.n,neu.n);
    else if(pRef.proba&&R.K===2)R.predDrift=numDrift(range(ref.n).map(i=>pRef.proba[i*2+1]),range(neu.n).map(i=>pNew.proba[i*2+1]),ref.n,neu.n);
    else R.predDrift=catDrift(Array.from(pRef.yhat,v=>v>=0?S.classes[v]:null),Array.from(pNew.yhat,v=>v>=0?S.classes[v]:null));
    R.predDrift.pAdj=R.predDrift.p;R.predDrift.sev=severity(R.predDrift,st);
    if(R.task==="cls"){const cr=new Array(R.K).fill(0),cn=new Array(R.K).fill(0);for(let i=0;i<ref.n;i++)if(pRef.yhat[i]>=0)cr[pRef.yhat[i]]++;for(let i=0;i<neu.n;i++)if(pNew.yhat[i]>=0)cn[pNew.yhat[i]]++;R.classRates={ref:cr.map(c=>c/ref.n),neu:cn.map(c=>c/neu.n)}}
  } else if(R.predSource==="external-nolabel"){
    const a=R.extRaw[0].map(v=>+v),b=(R.extRaw[1]||[]).map(v=>+v);
    if(a.filter(fin).length>a.length*.9&&R.extRaw[1])R.predDrift=numDrift(a.filter(fin),b.filter(fin),ref.n,neu.n);
    else if(R.extRaw[1])R.predDrift=catDrift(R.extRaw[0].map(v=>isNA(v)?null:v),R.extRaw[1].map(v=>isNA(v)?null:v));
    if(R.predDrift){R.predDrift.pAdj=R.predDrift.p;R.predDrift.sev=severity(R.predDrift,st)}
  }
  // 4. performance
  if(pRef&&evalRef.length>=20){
    const names=metricList(R.task,R.K,pRef),prim=primaryMetric(R.task,R.K,pRef);
    R.perf={names,prim,ref:{},neu:{},nRef:evalRef.length,nNew:0};
    names.forEach(m=>R.perf.ref[m]=metric(m,yRef,pRef,evalRef));
    if(pNew&&R.hasNewLabels){
      const evalNew=newRows.filter(i=>R.task==="reg"?fin(pNew.yhat[i]):pNew.yhat[i]>=0);R.perf.nNew=evalNew.length;
      names.forEach(m=>R.perf.neu[m]=metric(m,yNew,pNew,evalNew));
      // bootstrap interval for the relative drop of the primary metric
      const r=mulberry32(99),B=200,capA=evalRef.slice(0,3000),capB=shuffle(evalNew.slice(),mulberry32(3)).slice(0,3000),drops=[];
      for(let b=0;b<B;b++){const sa=capA.map(()=>capA[Math.floor(r()*capA.length)]),sb=capB.map(()=>capB[Math.floor(r()*capB.length)]);
        const ma=metric(prim,yRef,pRef,sa),mb=metric(prim,yNew,pNew,sb);if(fin(ma)&&fin(mb))drops.push(relDrop(prim,ma,mb));if(b%50===49)await tick()}
      drops.sort((a,b)=>a-b);
      R.perf.drop=relDrop(prim,R.perf.ref[prim],R.perf.neu[prim]);R.perf.lo=quant(drops,.05);R.perf.hi=quant(drops,.95);
    }
    // confidence-based performance estimate (no labels needed)
    if(R.task==="cls"&&pRef.proba&&pNew){const conf=(p,n)=>{let s=0;for(let i=0;i<n;i++){let m=0;for(let k=0;k<R.K;k++)m=Math.max(m,p.proba[i*R.K+k]);s+=m}return s/n};
      R.cbpe={ref:conf(pRef,ref.n),neu:conf(pNew,neu.n)};
      if(R.perf.ref.accuracy!=null&&R.perf.ref.ece!=null)R.cbpe.refEce=R.perf.ref.ece}
  }
  await tick();
  // 5. permutation importance (baseline model on reference holdout)
  const M=R.model;
  if(M){
    const hold=R.holdIdx.slice(0,2000),X=encode(M.enc,ref,hold),n=hold.length,d=M.enc.d,yh=Int32Array.from(hold,i=>yRef[i]);
    const yv=R.task==="reg"?Float64Array.from(hold,i=>yRef[i]):yh,rows=range(n);
    const loss=pr=>R.task==="reg"?metric("rmse",yv,pr,rows):metric("logloss",yv,pr,rows);
    const base=loss(M.predX(X,n)),r=mulberry32(17),imp={};
    for(const b of M.enc.blocks){if(!b.len){imp[b.f]=0;continue}const Xp=X.slice(),perm=shuffle(range(n),r);
      for(let i=0;i<n;i++)for(let c=b.start;c<b.start+b.len;c++)Xp[i*d+c]=X[perm[i]*d+c];
      imp[b.f]=Math.max(0,loss(M.predX(Xp,n))-base)}
    const tot=Object.values(imp).reduce((s,v)=>s+v,0)||1;R.drift.forEach(r=>r.imp=imp[r.f]/tot);
    R.wPsi=R.drift.reduce((s,r)=>s+(r.imp||0)*Math.min(r.psi,1),0);
  }
  await tick();
  // 6. domain classifier: can a model tell reference rows from new rows?
  if(R.features.length){
    const r=mulberry32(23),m=Math.min(ref.n,neu.n,3000);
    const ia=shuffle(range(ref.n),r).slice(0,m),ib=shuffle(range(neu.n),r).slice(0,m);
    const enc=M?M.enc:buildEncoder(ref,ia,R.features,sc);
    const Xa=encode(enc,ref,ia),Xb=encode(enc,neu,ib),d=enc.d,X=new Float64Array(2*m*d);X.set(Xa);X.set(Xb,m*d);
    const y=Int32Array.from({length:2*m},(_,i)=>i<m?0:1),ord=shuffle(range(2*m),r),cut=Math.floor(1.4*m);
    const take=ids=>{const o=new Float64Array(ids.length*d);ids.forEach((id,k)=>o.set(X.subarray(id*d,id*d+d),k*d));return o};
    const tr=ord.slice(0,cut),te=ord.slice(cut);
    const W=trainSoftmax(take(tr),tr.length,d,tr.map(i=>y[i]),2,160);
    const P=softmaxProba(W,take(te),te.length,d,2),yt=te.map(i=>y[i]);
    R.domainAUC=Math.max(.5,metric("auc",yt,{proba:P,K:2},range(te.length)));
    R.domainTop=enc.blocks.map(b=>{let s=0;for(let c=b.start;c<b.start+b.len;c++)s+=Math.abs(W[c*2+1]-W[c*2]);return[b.f,s]}).sort((a,b)=>b[1]-a[1]).slice(0,4);
  }
  await tick();
  // 7. stress tests on reference holdout
  if(M&&R.holdIdx.length>=40){R.stress=await stressTests(R,ref,yRef);}
  // 8. retrain check: does a model fit on part of the new labeled data beat the current one on the rest?
  if(M&&R.hasNewLabels&&newRows.length>=200){
    const sh=shuffle(newRows.slice(),mulberry32(77)),cut=Math.floor(sh.length/2),tr=sh.slice(0,cut),te=sh.slice(cut);
    const M2=fitModel(R.task,R.K,neu,tr,yNew,R.features,sc),p1=M.predict(neu,te),p2=M2.predict(neu,te);
    const prim=primaryMetric(R.task,R.K,p1),rows=range(te.length),yt=R.task==="reg"?Float64Array.from(te,i=>yNew[i]):Int32Array.from(te,i=>yNew[i]);
    R.retrain={prim,cur:metric(prim,yt,p1,rows),neu:metric(prim,yt,p2,rows),nTrain:tr.length,nTest:te.length};
    R.retrain.gain=-relDrop(prim,R.retrain.cur,R.retrain.neu);
  }
  R.rec=recommend(R);
  return R;
}

async function stressTests(R,ref,yRef){
  const M=R.model,sc=S.schema,hold=R.holdIdx.slice(0,2500),sub=subset(ref,hold),y0=R.task==="reg"?Float64Array.from(hold,i=>yRef[i]):Int32Array.from(hold,i=>yRef[i]);
  const nums=M.enc.blocks.filter(b=>b.type==="num"),cats=M.enc.blocks.filter(b=>b.type==="cat"&&b.levels.length>1);
  const prim=primaryMetric(R.task,R.K,M.predict(sub,[0]));
  const evalOn=(data,y)=>{const n=data.n,pr=M.predict(data,range(n));const rows=range(n);return metric(prim,y,pr,rows)};
  const copy=d=>{const cols={};for(const f in d.cols){const c=d.cols[f];cols[f]=c?(c instanceof Float64Array?Float64Array.from(c):c.slice()):null}return{n:d.n,cols}};
  const sevs=[0,.25,.5,.75,1];
  const P=[];
  if(nums.length){
    P.push({name:"Gaussian noise",desc:"Adds noise of up to 1 standard deviation to every numeric feature.",fn:(s,r)=>{const d=copy(sub);for(const b of nums){const c=d.cols[b.f];for(let i=0;i<d.n;i++)if(fin(c[i]))c[i]+=randn(r)*s*b.std}return[d,y0]}});
    P.push({name:"Mean shift",desc:"Moves every numeric feature up by as much as 1.5 standard deviations.",fn:s=>{const d=copy(sub);for(const b of nums){const c=d.cols[b.f];for(let i=0;i<d.n;i++)if(fin(c[i]))c[i]+=1.5*s*b.std}return[d,y0]}});
    P.push({name:"Scale change",desc:"Stretches numeric features around their mean by up to 2.5×, as with a unit or sensor change.",fn:s=>{const d=copy(sub);for(const b of nums){const c=d.cols[b.f];for(let i=0;i<d.n;i++)if(fin(c[i]))c[i]=b.mean+(c[i]-b.mean)*(1+1.5*s)}return[d,y0]}});
  }
  P.push({name:"Missing values",desc:"Blanks up to 60% of values in every feature; the model imputes them.",fn:(s,r)=>{const d=copy(sub);for(const f of R.features){const c=d.cols[f];if(!c)continue;const isN=c instanceof Float64Array;for(let i=0;i<d.n;i++)if(r()<.6*s)c[i]=isN?NaN:null}return[d,y0]}});
  if(cats.length)P.push({name:"Category corruption",desc:"Replaces up to 60% of categorical values with a random known category.",fn:(s,r)=>{const d=copy(sub);for(const b of cats){const c=d.cols[b.f];for(let i=0;i<d.n;i++)if(r()<.6*s)c[i]=b.levels[Math.floor(r()*b.levels.length)]}return[d,y0]}});
  // selection bias on the most important numeric feature
  const impNum=R.drift.filter(r=>r.type==="numeric").sort((a,b)=>(b.imp||0)-(a.imp||0))[0];
  if(impNum){const f=impNum.f,vals=Array.from(sub.cols[f]).filter(fin).sort((a,b)=>a-b);
    P.push({name:`Subpopulation: high ${f}`,desc:`Keeps only rows above a rising percentile of ${f} (up to the 80th), mimicking a narrower customer segment.`,fn:s=>{const th=s?quant(vals,.8*s):-Infinity,keep=range(sub.n).filter(i=>fin(sub.cols[f][i])?sub.cols[f][i]>=th:s===0);const d=subset(sub,keep);return[d,keep.map(i=>y0[i])]}})}
  if(R.task==="cls"&&R.K===2){const pos=range(sub.n).filter(i=>y0[i]===1),neg=range(sub.n).filter(i=>y0[i]===0),base=pos.length/sub.n;
    if(pos.length>5&&neg.length>5)P.push({name:"Label prior shift",desc:`Resamples so the positive class share moves from ${pct(base,0)} toward ${base<.5?"60%":"20%"}.`,fn:(s,r)=>{const t=base+s*((base<.5?.6:.2)-base),N=2000,np=Math.round(N*t);const ids=[];for(let k=0;k<np;k++)ids.push(pos[Math.floor(r()*pos.length)]);for(let k=np;k<N;k++)ids.push(neg[Math.floor(r()*neg.length)]);return[subset(sub,ids),ids.map(i=>y0[i])]}})}
  const out=[];
  for(const p of P){const r=mulberry32(101),vals=[];for(const s of sevs){const[d,y]=p.fn(s,r);vals.push(d.n>=20?evalOn(d,y):NaN)}out.push({name:p.name,desc:p.desc,vals});await tick()}
  const base=out[0]?out[0].vals[0]:NaN;
  // per-feature sensitivity: +1 SD shift (numeric) or 50% corruption (categorical)
  const sens=[],r=mulberry32(202);
  for(const b of M.enc.blocks){const d=copy(sub),c=d.cols[b.f];if(!c)continue;
    if(b.type==="num"){for(let i=0;i<d.n;i++)if(fin(c[i]))c[i]+=b.std}else if(b.levels.length>1){for(let i=0;i<d.n;i++)if(r()<.5)c[i]=b.levels[Math.floor(r()*b.levels.length)]}else continue;
    const v=evalOn(d,y0);sens.push({f:b.f,type:b.type,val:v,drop:relDrop(prim,base,v)})}
  sens.sort((a,b)=>b.drop-a.drop);
  const at=k=>{const xs=out.map(o=>METRIC[prim].hi?o.vals[k]/base:base/o.vals[k]).filter(fin);return xs.reduce((s,v)=>s+v,0)/xs.length};
  return{prim,sevs,series:out,base,sens,retain50:at(2),retain100:at(4),n:sub.n};
}

/* ---------- recommendation ---------- */
function recommend(R){
  const st=S.settings,rs=[];let lvl=0;const add=(l,title,detail)=>{rs.push({l,title,detail});lvl=Math.max(lvl,l)};
  const dr=R.drift,nF=dr.length,drifted=dr.filter(r=>SEV_RANK[r.sev]>=2),share=nF?drifted.length/nF:0;
  const missingCols=dr.filter(r=>r.missingInNew);
  const P=R.perf,hasPerf=P&&P.drop!=null,lab=hasPerf?METRIC[P.prim].label:"";
  // performance
  if(hasPerf){const sig=P.lo>0;
    if(P.drop>=st.retrain&&sig)add(3,`${lab} fell ${pct(P.drop)} on new data`,`90% bootstrap interval for the drop: ${pct(P.lo)} to ${pct(P.hi)}. Past the ${pct(st.retrain,0)} retraining threshold.`);
    else if(P.drop>=st.tol&&sig)add(2,`${lab} fell ${pct(P.drop)}`,`Interval ${pct(P.lo)} to ${pct(P.hi)}. Above your ${pct(st.tol,0)} tolerance, below the retraining threshold.`);
    else if(P.drop>=st.tol)add(1,`${lab} may have fallen ${pct(P.drop)}`,`The interval (${pct(P.lo)} to ${pct(P.hi)}) includes no change. Collect more labeled rows.`);
    else add(0,`${lab} holds on new data`,`${fmt(P.ref[P.prim])} on reference, ${fmt(P.neu[P.prim])} on new data (change ${spct(-P.drop)}).`);
  } else if(R.task) add(1,"No labels in the new data",R.cbpe?`Performance cannot be measured directly. Mean model confidence moved from ${pct(R.cbpe.ref)} to ${pct(R.cbpe.neu)}, which estimates accuracy only if the model is calibrated.`:"Performance cannot be measured. Add the label column to the new data when outcomes arrive.");
  // prediction drift
  if(R.predDrift){const pd=R.predDrift;
    if(pd.sev==="major")add(2,"Predictions shifted sharply",`Prediction PSI ${fmt(pd.psi)}. The model is producing a different mix of outputs than on reference data.`);
    else if(pd.sev==="moderate")add(1,"Predictions shifted moderately",`Prediction PSI ${fmt(pd.psi)}.`);
    else add(0,"Prediction distribution is steady",`Prediction PSI ${fmt(pd.psi)}.`);
  }
  // important features
  if(R.model){const top=[...dr].sort((a,b)=>(b.imp||0)-(a.imp||0)).slice(0,3),hit=top.filter(r=>SEV_RANK[r.sev]>=2);
    if(hit.some(r=>r.sev==="major"))add(2,`Drift in high-impact feature${hit.length>1?"s":""}: ${hit.map(r=>r.f).join(", ")}`,`Among the model's three most important inputs. Importance-weighted PSI: ${fmt(R.wPsi)}.`);
    else if(hit.length)add(1,`Moderate drift in ${hit.map(r=>r.f).join(", ")}`,"Among the model's three most important inputs.");}
  // breadth
  if(missingCols.length)add(2,`Missing column${missingCols.length>1?"s":""} in new data: ${missingCols.map(r=>r.f).join(", ")}`,"The model will see these as fully missing. Check the data pipeline.");
  if(share>=.3)add(2,`${drifted.length} of ${nF} features drifted`,"Broad shift in the input data.");
  else if(drifted.length)add(1,`${drifted.length} of ${nF} feature${nF>1?"s":""} drifted`,drifted.map(r=>r.f).join(", "));
  else add(0,"Feature distributions are stable","No feature passed both the significance test and the moderate PSI threshold.");
  if(R.domainAUC!=null){if(R.domainAUC>=st.domain)add(2,`Domain classifier separates the datasets (AUC ${fmt(R.domainAUC,2)})`,"New rows are easy to tell apart from reference rows, so the joint distribution has moved.");
    else if(R.domainAUC>=.6)add(1,`Datasets partly separable (AUC ${fmt(R.domainAUC,2)})`,"Some multivariate shift.");}
  const missUp=dr.filter(r=>r.missB-r.missA>.03);if(missUp.length)add(1,`More missing values in ${missUp.map(r=>r.f).join(", ")}`,missUp.map(r=>`${r.f}: ${pct(r.missA)} → ${pct(r.missB)}`).join("; "));
  const unseen=dr.filter(r=>r.unseen>.02);if(unseen.length)add(1,`Unseen categories in ${unseen.map(r=>r.f).join(", ")}`,unseen.map(r=>`${r.f}: ${pct(r.unseen)} of rows`).join("; "));
  if(R.retrain&&R.retrain.gain>.02)add(Math.max(1,Math.min(lvl,3)),`A model refit on new data scores ${pct(R.retrain.gain)} better`,`${METRIC[R.retrain.prim].label} ${fmt(R.retrain.cur)} → ${fmt(R.retrain.neu)} on ${R.retrain.nTest} held-out new rows.`);
  if(!hasPerf&&lvl>2)lvl=2;
  // diagnosis
  let diag="";const fd=share>=.2||(R.domainAUC||0)>=.65;
  if(hasPerf&&P.drop>=st.tol&&P.lo>0)diag=fd?"Both the inputs and the model's accuracy changed. Covariate shift is present, and the gain from refitting suggests the feature–outcome relationship moved too.":"Inputs look much like the reference, yet accuracy fell. That points to concept drift: the relationship between features and outcome has changed.";
  else if(hasPerf&&fd)diag="Inputs shifted but performance held. The model tolerates this shift so far.";
  else if(!hasPerf&&fd)diag="Inputs shifted. Without labels, the effect on accuracy is unknown.";
  if(R.retrain&&R.retrain.gain<=.02&&hasPerf&&P.drop>=st.tol)diag+=" Refitting on new data alone did not help much; check data quality first.";
  const topDrift=[...dr].filter(r=>SEV_RANK[r.sev]>=2).sort((a,b)=>((b.imp||0)*b.psi)-((a.imp||0)*a.psi)).slice(0,3).map(r=>r.f);
  const acts=[];
  if(lvl===3){acts.push("Retrain on recent labeled data"+(R.retrain?`; a quick refit here already reaches ${METRIC[R.retrain.prim].label} ${fmt(R.retrain.neu)}.`:"."));if(topDrift.length)acts.push(`Before retraining, confirm the shift in ${topDrift.join(", ")} is real and not a pipeline bug.`);acts.push("Validate the new model on a time-ordered holdout from the latest period, then shadow-deploy it.");}
  else if(lvl===2){if(topDrift.length)acts.push(`Inspect ${topDrift.join(", ")}: check upstream sources, units, and encoding.`);acts.push(hasPerf?"Watch performance closely and prepare a retraining candidate.":"Collect labels for a recent sample so performance can be measured.");acts.push("Compare against a model refit on recent data before the next release.");}
  else if(lvl===1){acts.push("Re-run this check on the next batch to see if the change persists.");if(drifted.length)acts.push(`Add alerts on ${drifted.slice(0,3).map(r=>r.f).join(", ")}.`);}
  else acts.push("Keep the regular monitoring schedule. No action needed.");
  rs.sort((a,b)=>b.l-a.l);
  return{lvl,reasons:rs,diag,acts};
}

/* ---------- charts ---------- */
function roundTop(x,y,w,h,r){if(h<=0)return"";r=Math.min(r,w/2,h);return`M${x},${y+h}V${y+r}Q${x},${y} ${x+r},${y}H${x+w-r}Q${x+w},${y} ${x+w},${y+r}V${y+h}Z`}
function niceNum(x){const a=Math.abs(x);if(a>=1000)return(x/1000).toFixed(a>=10000?0:1)+"k";if(a>=100)return x.toFixed(0);if(a>=10)return x.toFixed(1).replace(/\.0$/,"");return x.toFixed(2).replace(/0$/,"").replace(/\.0$/,"")}
function histChart(h,{w=640,ht=230,mini=false,refName="Reference",newName="New",title=""}={}){
  const pad=mini?{l:1,r:1,t:2,b:1}:{l:42,r:10,t:10,b:h.kind==="cat"?44:28};
  const W=w-pad.l-pad.r,H=ht-pad.t-pad.b,ymax=(Math.max(...h.ref,...h.neu)||1)*1.08,Y=v=>pad.t+H-(v/ymax)*H,base=pad.t+H,n=h.ref.length;
  let s=`<svg class="chart${mini?" mini":""}" viewBox="0 0 ${w} ${ht}" ${mini?'preserveAspectRatio="none" aria-hidden="true"':`role="img" aria-label="${esc(title)}"`}>`;
  if(!mini){for(let k=0;k<=4;k++){const v=ymax/1.08*k/4,y=Y(v);s+=`<line class="grid" x1="${pad.l}" x2="${w-pad.r}" y1="${y}" y2="${y}"/><text x="${pad.l-6}" y="${y+3.5}" text-anchor="end">${(v*100).toFixed(v*100<10?1:0)}%</text>`}}
  if(h.kind==="num"){const bw=W/n,X=i=>pad.l+i*bw;
    let area=`M${X(0)},${base}`,lr="",ln="";for(let i=0;i<n;i++){area+=`L${X(i)},${Y(h.ref[i])}L${X(i+1)},${Y(h.ref[i])}`;lr+=(i?"L":"M")+`${X(i)},${Y(h.ref[i])}L${X(i+1)},${Y(h.ref[i])}`;ln+=(i?"L":"M")+`${X(i)},${Y(h.neu[i])}L${X(i+1)},${Y(h.neu[i])}`}
    area+=`L${X(n)},${base}Z`;
    s+=`<path d="${area}" fill="var(--s1)" fill-opacity=".2"/><path d="${lr}" fill="none" stroke="var(--s1)" stroke-width="${mini?1.5:2}"/><path d="${ln}" fill="none" stroke="var(--s2)" stroke-width="${mini?1.5:2}"/>`;
    if(!mini){s+=`<line class="base" x1="${pad.l}" x2="${w-pad.r}" y1="${base}" y2="${base}"/>`;
      for(let k=0;k<=4;k++){const v=h.lo+(h.hi-h.lo)*k/4;s+=`<text x="${pad.l+W*k/4}" y="${base+17}" text-anchor="${k===0?"start":k===4?"end":"middle"}">${niceNum(v)}</text>`}
      const bwv=(h.hi-h.lo)/n;for(let i=0;i<n;i++){const a=h.lo+i*bwv;s+=`<rect class="band" x="${X(i)}" y="${pad.t}" width="${bw}" height="${H}" data-tip="${esc(`<b>${niceNum(a)} – ${niceNum(a+bwv)}</b><br><span class=sw style=background:var(--s1)></span>${refName}: ${pct(h.ref[i])}<br><span class=sw style=background:var(--s2)></span>${newName}: ${pct(h.neu[i])}`)}"/>`}}
  } else {const gw=W/n,bw=Math.max(2,Math.min(26,(gw-8)/2));
    for(let i=0;i<n;i++){const cx=pad.l+gw*i+gw/2;
      s+=`<path d="${roundTop(cx-bw-1,Y(h.ref[i]),bw,base-Y(h.ref[i]),mini?1:4)}" fill="var(--s1)"/><path d="${roundTop(cx+1,Y(h.neu[i]),bw,base-Y(h.neu[i]),mini?1:4)}" fill="var(--s2)"/>`;
      if(!mini){const lab=String(h.labels[i]),mx=Math.max(3,Math.floor(gw/6.6));s+=`<text x="${cx}" y="${base+15}" text-anchor="middle">${esc(lab.length>mx?lab.slice(0,mx-1)+"…":lab)}</text>`;
        s+=`<rect class="band" x="${pad.l+gw*i}" y="${pad.t}" width="${gw}" height="${H+18}" data-tip="${esc(`<b>${esc(lab)}</b><br><span class=sw style=background:var(--s1)></span>${refName}: ${pct(h.ref[i])}<br><span class=sw style=background:var(--s2)></span>${newName}: ${pct(h.neu[i])}`)}"/>`}}
    if(!mini)s+=`<line class="base" x1="${pad.l}" x2="${w-pad.r}" y1="${base}" y2="${base}"/>`}
  return s+"</svg>";
}
const SER=["var(--s1)","var(--s2)","var(--s3)","var(--s4)","var(--s5)","var(--s6)","var(--muted)"];
function lineChart(series,xs,{w=660,ht=290,fmtY=v=>fmt(v),xLab=x=>pct(x,0)}={}){
  const pad={l:48,r:14,t:12,b:30},W=w-pad.l-pad.r,H=ht-pad.t-pad.b;
  const all=series.flatMap(s=>s.vals).filter(fin);let lo=Math.min(...all),hi=Math.max(...all);if(!(hi>lo)){lo-=.05;hi+=.05}const padv=(hi-lo)*.08;lo-=padv;hi+=padv;
  const X=i=>pad.l+W*i/(xs.length-1),Y=v=>pad.t+H-(v-lo)/(hi-lo)*H;
  let s=`<svg class="chart" viewBox="0 0 ${w} ${ht}" role="img" aria-label="Metric under increasing shift severity">`;
  for(let k=0;k<=4;k++){const v=lo+(hi-lo)*k/4,y=Y(v);s+=`<line class="grid" x1="${pad.l}" x2="${w-pad.r}" y1="${y}" y2="${y}"/><text x="${pad.l-6}" y="${y+3.5}" text-anchor="end">${fmtY(v)}</text>`}
  xs.forEach((x,i)=>s+=`<text x="${X(i)}" y="${ht-10}" text-anchor="${i===0?"start":i===xs.length-1?"end":"middle"}">${xLab(x)}</text>`);
  series.forEach((sr,si)=>{const c=SER[si%SER.length];let d="";sr.vals.forEach((v,i)=>{if(fin(v))d+=(d?"L":"M")+`${X(i)},${Y(v)}`});
    s+=`<path d="${d}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>`;sr.vals.forEach((v,i)=>{if(fin(v))s+=`<circle cx="${X(i)}" cy="${Y(v)}" r="4" fill="${c}" stroke="var(--surface)" stroke-width="2"/>`})});
  xs.forEach((x,i)=>{const bw=W/(xs.length-1),x0=clamp(X(i)-bw/2,pad.l,w-pad.r),x1=clamp(X(i)+bw/2,pad.l,w-pad.r);
    s+=`<rect class="band" x="${x0}" y="${pad.t}" width="${x1-x0}" height="${H}" data-tip="${esc(`<b>Severity ${xLab(x)}</b><br>`+series.map((sr,si)=>`<span class=sw style=background:${SER[si%SER.length]}></span>${esc(sr.name)}: ${fmtY(sr.vals[i])}`).join("<br>"))}"/>`});
  return s+"</svg>";
}

/* ---------- rendering ---------- */
const sevPill=s=>`<span class="pill" data-s="${s}">${SEV_LABEL[s]}</span>`;
function renderAll(){renderVerdict();renderKpis();renderDrift();renderPerf();renderStress();renderMethod();renderOverview();updateScenes()}
function renderVerdict(){
  const R=S.R,rec=R.rec,L=LEVELS[rec.lvl];
  const lc=l=>LEVELS[l].c;
  $("#verdict").style.setProperty("--vc",L.c);
  $("#verdict").innerHTML=`<div class="v-main">
    <span class="v-level"><i></i>${L.k}</span>
    <h1 class="v-head">${L.head}</h1>
    <p class="v-sub">${esc(rec.diag||`Compared ${S.ref.n.toLocaleString()} reference rows with ${S.neu.n.toLocaleString()} new rows across ${R.features.length} features.`)}</p>
    <div class="ladder" aria-label="Recommendation scale">${LEVELS.map((l,i)=>`<span class="${i===rec.lvl?"on":""}">${l.k}</span>`).join("")}</div>
    <div class="v-actions"><div class="eyebrow">Recommended next steps</div><ol>${rec.acts.map(a=>`<li>${esc(a)}</li>`).join("")}</ol></div>
  </div>
  <div class="v-side"><div class="eyebrow">What drove this</div><ul class="reasons">${rec.reasons.slice(0,6).map(r=>`<li style="--rc:${lc(r.l)}"><span class="d" title="${LEVELS[r.l].k}"></span><div><b>${esc(r.title)}</b><p>${esc(r.detail)}</p></div></li>`).join("")}</ul></div>`;
}
function renderKpis(){
  const R=S.R,dr=R.drift,nd=dr.filter(r=>SEV_RANK[r.sev]>=2).length,P=R.perf;
  const k=[];
  k.push(`<div class="kpi"><span class="eyebrow">Drifted features</span><span class="v">${nd}<small> of ${dr.length}</small></span><span class="h">${dr.filter(r=>r.sev==="major").length} major · ${dr.filter(r=>r.sev==="moderate").length} moderate</span></div>`);
  k.push(`<div class="kpi"><span class="eyebrow">Domain classifier AUC</span><span class="v">${R.domainAUC!=null?fmt(R.domainAUC,2):"—"}</span><span class="h">0.50 means the datasets are indistinguishable</span></div>`);
  k.push(`<div class="kpi"><span class="eyebrow">Prediction shift (PSI)</span><span class="v">${R.predDrift?fmt(R.predDrift.psi):"—"}</span><span class="h">${R.predDrift?sevPill(R.predDrift.sev):"Needs a label or predictions column"}</span></div>`);
  if(P&&P.drop!=null)k.push(`<div class="kpi"><span class="eyebrow">${METRIC[P.prim].label} change</span><span class="v">${spct(METRIC[P.prim].hi?(P.neu[P.prim]-P.ref[P.prim])/P.ref[P.prim]:(P.neu[P.prim]-P.ref[P.prim])/P.ref[P.prim])}</span><span class="h">${fmt(P.ref[P.prim])} → ${fmt(P.neu[P.prim])} on labeled new rows</span></div>`);
  else if(R.cbpe)k.push(`<div class="kpi"><span class="eyebrow">Estimated accuracy</span><span class="v">${pct(R.cbpe.neu)}</span><span class="h">From model confidence; no labels in new data</span></div>`);
  else k.push(`<div class="kpi"><span class="eyebrow">Performance</span><span class="v">—</span><span class="h">Add a label column to measure it</span></div>`);
  $("#kpis").innerHTML=k.join("");
}
function sortedDrift(){return[...S.R.drift].sort((a,b)=>SEV_RANK[b.sev]-SEV_RANK[a.sev]||b.psi-a.psi)}
function renderDrift(){
  const R=S.R,rows=sortedDrift();if(!S.sel||!rows.find(r=>r.f===S.sel))S.sel=rows[0]&&rows[0].f;
  const maxImp=Math.max(...rows.map(r=>r.imp||0),1e-9);
  const tr=rows.map(r=>`<tr class="clk${r.f===S.sel?" sel":""}" data-f="${esc(r.f)}" tabindex="0">
    <td class="fname">${esc(r.f)}</td><td>${r.type==="numeric"?"num":"cat"}</td>
    <td>${r.hist?histChart(r.hist,{w:96,ht:26,mini:true}):""}</td>
    <td class="num">${r.test?`${r.test} ${fmt(r.stat,r.type==="numeric"?3:1)}`:"—"}</td>
    <td class="num">${fmtP(r.pAdj)}</td><td class="num">${fmt(r.psi)}</td>
    <td class="num">${r.type==="numeric"?fmt(r.shift,2)+" σ":pct(r.unseen)+" new"}</td>
    <td>${R.model?`<span class="ibar" style="width:${Math.round(40*(r.imp||0)/maxImp)}px"></span><span class="num">${pct(r.imp||0,0)}</span>`:"—"}</td>
    <td>${sevPill(r.sev)}</td></tr>`).join("");
  const dom=R.domainAUC!=null?`<div class="card"><div class="card-head"><h3>Multivariate check: domain classifier</h3><span class="mono">AUC ${fmt(R.domainAUC,3)}</span></div>
    <p class="lead">A logistic model was trained to tell reference rows from new rows. If it can't (AUC near 0.5), the joint distribution is stable even when single features wobble. It catches shifts in feature combinations that per-feature tests miss.</p>
    <div class="stats">${R.domainTop.map(([f,v],i)=>`<div><span class="k">Separating feature ${i+1}</span><span class="val">${esc(f)}</span></div>`).join("")}</div></div>`:"";
  $("#driftBody").innerHTML=`<div class="grid2"><div class="card"><div class="card-head"><h3>Per-feature tests</h3><div class="legend"><span><i class="area" style="--c:var(--s1)"></i>Reference</span><span><i style="--c:var(--s2)"></i>New</span></div></div>
    <div class="scroll"><table><thead><tr><th>Feature</th><th>Type</th><th>Shape</th><th class="num">Test</th><th class="num">p (BH)</th><th class="num">PSI</th><th class="num">Shift</th><th>Importance</th><th>Status</th></tr></thead><tbody>${tr}</tbody></table></div>
    <p class="note">p-values are Benjamini–Hochberg adjusted across ${rows.length} tests. Shift is the mean change in reference standard deviations, or the share of new rows with unseen categories. Select a row for detail.</p></div>
    <div class="card" id="featDetail"></div></div>${dom}`;
  renderDetail();
}
function renderDetail(){
  const r=S.R.drift.find(x=>x.f===S.sel),el=$("#featDetail");if(!el)return;if(!r){el.innerHTML=`<div class="empty">No features selected.</div>`;return}
  let st,interp;
  if(r.missingInNew){el.innerHTML=`<div class="card-head"><h3 class="fname">${esc(r.f)}</h3>${sevPill(r.sev)}</div><div class="interp">This column is absent from the new data. The model will treat it as fully missing.</div>`;return}
  if(r.type==="numeric"){st=[["Mean",`${fmt(r.meanA)} → ${fmt(r.meanB)}`],["Median",`${fmt(r.medA)} → ${fmt(r.medB)}`],["Std dev",`${fmt(r.sdA)} → ${fmt(r.sdB)}`],["Missing",`${pct(r.missA)} → ${pct(r.missB)}`],["KS statistic",fmt(r.stat)],["Wasserstein / σ",fmt(r.w1)],["PSI",fmt(r.psi)],["p (BH)",fmtP(r.pAdj)]];
    interp=r.sev==="stable"?"No statistically reliable change.":r.sev==="minor"?`The change is detectable with ${S.neu.n.toLocaleString()} rows but small (PSI ${fmt(r.psi)}). Large samples make tiny shifts significant, so effect size decides the status.`:`The distribution moved ${r.shift>0?"up":"down"} by ${fmt(Math.abs(r.shift),2)} reference standard deviations${Math.abs(r.sdB/r.sdA-1)>.15?` and its spread changed ${spct(r.sdB/r.sdA-1,0)}`:""}.`;}
  else{const big=r.top.map(([k,a,b])=>[k,b-a]).sort((x,y)=>Math.abs(y[1])-Math.abs(x[1]))[0];
    st=[["Categories (ref)",r.levelsA],["Unseen in new",pct(r.unseen)],["Missing",`${pct(r.missA)} → ${pct(r.missB)}`],["χ²",`${fmt(r.stat,1)} (df ${r.df})`],["Cramér's V",fmt(r.cramer)],["PSI",fmt(r.psi)],["p (BH)",fmtP(r.pAdj)]];
    interp=r.sev==="stable"?"Category mix is unchanged.":big?`Largest change: "${big[0]}" ${big[1]>0?"rose":"fell"} by ${pct(Math.abs(big[1]))} of rows.`:"";}
  if(S.R.model&&r.imp!=null)st.push(["Model importance",pct(r.imp,1)]);
  el.innerHTML=`<div class="card-head"><h3 class="fname">${esc(r.f)}</h3>${sevPill(r.sev)}</div>
    <div class="legend" style="margin-bottom:6px"><span><i class="area" style="--c:var(--s1)"></i>Reference</span><span><i style="--c:var(--s2)"></i>New</span></div>
    ${histChart(r.hist,{title:`Distribution of ${r.f}, reference vs new`})}
    <div class="stats">${st.map(([k,v])=>`<div><span class="k">${k}</span><span class="val">${esc(v)}</span></div>`).join("")}</div>
    <div class="interp">${esc(interp)}</div>`;
}
function renderPerf(){
  const R=S.R,el=$("#p-perf"),parts=[];
  const src=R.predSource==="baseline"?`Predictions come from a baseline ${R.task==="reg"?"ridge regression":"logistic regression"} fitted here on 70% of the reference rows. Reference metrics use the other 30%.`:R.predSource==="external"?`Predictions come from your column "${esc(S.cfg.pred)}".`:"";
  if(R.predDrift){const pd=R.predDrift;
    const title=R.task==="reg"?"Predicted values":R.task==="cls"&&R.K===2&&R.pRef&&R.pRef.proba?`Predicted probability of "${esc(S.classes[1])}"`:"Predicted classes";
    let rates="";if(R.classRates)rates=`<div class="stats">${S.classes.map((c,i)=>`<div><span class="k">Predicted "${esc(c)}"</span><span class="val">${pct(R.classRates.ref[i])} → ${pct(R.classRates.neu[i])}</span></div>`).join("")}</div>`;
    parts.push(`<div class="card"><div class="card-head"><h3>${title}</h3>${sevPill(pd.sev)}</div><p class="lead">${src} Prediction drift is visible without labels, so it is often the first warning.</p>
      <div class="legend" style="margin:10px 0 6px"><span><i class="area" style="--c:var(--s1)"></i>Reference</span><span><i style="--c:var(--s2)"></i>New</span></div>${histChart(pd.hist,{title})}
      <div class="stats"><div><span class="k">PSI</span><span class="val">${fmt(pd.psi)}</span></div><div><span class="k">${pd.test} statistic</span><span class="val">${fmt(pd.stat)}</span></div><div><span class="k">p-value</span><span class="val">${fmtP(pd.p)}</span></div>${pd.type==="numeric"?`<div><span class="k">Mean</span><span class="val">${fmt(pd.meanA)} → ${fmt(pd.meanB)}</span></div>`:""}</div>${rates}</div>`);
  } else parts.push(`<div class="card"><div class="empty">Pick a label column or a predictions column to compare prediction distributions.</div></div>`);
  const P=R.perf;let right="";
  if(P){const hasN=P.drop!=null;
    right=`<div class="card"><div class="card-head"><h3>Model performance</h3><span class="mono">${P.nRef.toLocaleString()} ref · ${P.nNew.toLocaleString()} new labeled</span></div>
    <div class="scroll"><table><thead><tr><th>Metric</th><th class="num">Reference</th><th class="num">New</th><th class="num">Change</th></tr></thead><tbody>
    ${P.names.map(m=>{const a=P.ref[m],b=P.neu[m],ch=hasN?(b-a):NaN,bad=hasN&&(METRIC[m].hi?ch<0:ch>0);
      return`<tr><td>${METRIC[m].label}${m===P.prim?' <span class="eyebrow">primary</span>':""}</td><td class="num">${fmt(a)}</td><td class="num">${hasN?fmt(b):"—"}</td><td class="num" style="color:${hasN?(bad?"var(--crit)":"var(--good-ink)"):"inherit"}">${hasN?(ch>0?"+":"")+fmt(ch):"—"}</td></tr>`}).join("")}
    </tbody></table></div>
    ${hasN?`<p class="note">Relative drop in ${METRIC[P.prim].label}: <b class="mono">${pct(P.drop)}</b>, 90% bootstrap interval ${pct(P.lo)} to ${pct(P.hi)} (200 resamples).</p>`:`<p class="note">The new data has no usable labels, so only reference metrics are shown.</p>`}
    ${R.cbpe?`<div class="interp">Confidence-based estimate: mean top-class probability is ${pct(R.cbpe.ref)} on reference and ${pct(R.cbpe.neu)} on new data. ${R.cbpe.refEce!=null?`Reference calibration error is ${fmt(R.cbpe.refEce)}; the lower it is, the more this estimate can be trusted.`:""}</div>`:""}</div>`;
    if(R.retrain)right+=`<div class="card"><div class="card-head"><h3>Retraining check</h3><span class="mono">${R.retrain.nTrain} train · ${R.retrain.nTest} test</span></div>
      <p class="lead">Half of the labeled new rows trained a fresh model; both models were scored on the other half.</p>
      <div class="cmp"><div><span class="eyebrow">Current model</span><div class="val">${fmt(R.retrain.cur)}</div><span class="h">${METRIC[R.retrain.prim].label}</span></div><div><span class="eyebrow">Refit on new data</span><div class="val">${fmt(R.retrain.neu)}</div><span class="h">${spct(R.retrain.gain)} relative</span></div></div></div>`;
  } else right=`<div class="card"><div class="empty">${R.task?"Not enough labeled reference rows to measure performance.":"Choose a label column to measure model performance."}</div></div>`;
  el.innerHTML=`<div class="grid2 even"><div class="pane">${parts.join("")}</div><div class="pane">${right}</div></div>`;
}
function renderStress(){
  const R=S.R,el=$("#p-stress"),T=R.stress;
  if(!T){el.innerHTML=`<div class="card"><div class="empty">Stress tests need a label column, so a baseline model can be fitted and re-scored under simulated shifts.</div></div>`;return}
  const m=METRIC[T.prim],maxD=Math.max(...T.sens.map(s=>Math.max(0,s.drop)),1e-6);
  el.innerHTML=`<div class="card"><div class="card-head"><h3>${m.label} under simulated distribution shift</h3><span class="mono">${T.n.toLocaleString()} held-out reference rows</span></div>
    <p class="lead">Each line applies one kind of shift at increasing severity, then re-scores the ${R.predSource==="external"?"baseline model fitted here (the browser cannot run your own model)":"model"}. ${m.hi?"Higher is better.":"Lower is better."} Flat lines mean the model is robust to that shift.</p>
    <div class="legend" style="margin:10px 0 6px">${T.series.map((s,i)=>`<span><i style="--c:${SER[i%SER.length]}"></i>${esc(s.name)}</span>`).join("")}</div>
    ${lineChart(T.series,T.sevs)}
    <div class="scroll" style="margin-top:12px"><table><thead><tr><th>Shift</th>${T.sevs.map(s=>`<th class="num">${pct(s,0)}</th>`).join("")}<th>What it simulates</th></tr></thead><tbody>
    ${T.series.map((s,i)=>`<tr><td><span class="legend"><span><i style="--c:${SER[i%SER.length]}"></i>${esc(s.name)}</span></span></td>${s.vals.map(v=>`<td class="num">${fmt(v)}</td>`).join("")}<td style="white-space:normal;min-width:240px;color:var(--ink-2)">${esc(s.desc)}</td></tr>`).join("")}</tbody></table></div></div>
    <div class="grid2 even"><div class="card"><div class="card-head"><h3>Robustness score</h3></div>
      <div class="cmp"><div><span class="eyebrow">At 50% severity</span><div class="val">${pct(T.retain50,0)}</div><span class="h">of baseline ${m.label} kept</span></div><div><span class="eyebrow">At 100% severity</span><div class="val">${pct(T.retain100,0)}</div><span class="h">of baseline ${m.label} kept</span></div></div>
      <p class="note">Average across all shift types. Baseline ${m.label} on clean held-out data: ${fmt(T.base)}.</p></div>
    <div class="card"><div class="card-head"><h3>Sensitivity by feature</h3></div><p class="lead">Relative ${m.label} loss when one feature moves up 1 standard deviation (numeric) or half its values are corrupted (categorical). Drift in the top features hurts most.</p>
      <div class="sens" style="margin-top:10px">${T.sens.slice(0,10).map(s=>`<div class="sens-row"><span class="fname" title="${esc(s.f)}">${esc(s.f)}</span><div class="track"><div class="fill" style="width:${Math.max(0,s.drop)/maxD*100}%"></div></div><span class="num" style="text-align:right">${spct(-s.drop)}</span></div>`).join("")}</div></div></div>`;
}
function renderMethod(){
  const st=S.settings;
  $("#p-method").innerHTML=`<div class="card"><div class="card-head"><h3>Decision thresholds</h3><button class="btn" id="applySet">Apply and re-run</button></div>
    <p class="lead">Tune how sensitive the recommendation is. Defaults follow common industry practice for PSI and a 5% / 10% performance budget.</p>
    <div class="settings">
      <div class="field"><label for="setPsiMod">PSI: moderate drift</label><input type="number" id="setPsiMod" step="0.01" min="0" value="${st.psiMod}"><small>Common rule: 0.10</small></div>
      <div class="field"><label for="setPsiMaj">PSI: major drift</label><input type="number" id="setPsiMaj" step="0.01" min="0" value="${st.psiMaj}"><small>Common rule: 0.25</small></div>
      <div class="field"><label for="setAlpha">Significance level</label><input type="number" id="setAlpha" step="0.01" min="0.001" max="0.5" value="${st.alpha}"><small>After Benjamini–Hochberg correction</small></div>
      <div class="field"><label for="setTol">Performance tolerance</label><input type="number" id="setTol" step="0.01" min="0" value="${st.tol}"><small>Relative drop that triggers Investigate</small></div>
      <div class="field"><label for="setRetrain">Retraining threshold</label><input type="number" id="setRetrain" step="0.01" min="0" value="${st.retrain}"><small>Relative drop that triggers Retrain</small></div>
      <div class="field"><label for="setDomain">Domain AUC alarm</label><input type="number" id="setDomain" step="0.01" min="0.5" max="1" value="${st.domain}"><small>Separability that triggers Investigate</small></div>
    </div></div>
  <div class="card method"><h3 style="margin-top:0">How DriftGuard decides</h3>
    <p>Everything runs in your browser. Uploaded files never leave this page.</p>
    <h3>Feature drift</h3>
    <ul><li><b>Numeric features:</b> two-sample Kolmogorov–Smirnov test, Population Stability Index on reference deciles (plus a missing-value bin), Wasserstein distance in reference standard deviations, and mean shift.</li>
    <li><b>Categorical features:</b> chi-square test of the category mix (sparse levels pooled), PSI, Cramér's V, and the share of unseen categories.</li>
    <li><b>Status</b> needs both a significant test after Benjamini–Hochberg correction and a PSI above the threshold. With thousands of rows, p-values flag trivial shifts, so effect size sets the severity and the test only gates it.</li></ul>
    <h3>Multivariate drift</h3><p>A domain classifier (logistic regression) learns to separate reference rows from new rows. Its held-out AUC measures how far the joint distribution moved, which catches changes in feature combinations.</p>
    <h3>Predictions and performance</h3><p>Prediction drift compares the score or class distribution and needs no labels. With labels, metrics are compared directly, and the relative drop in the primary metric gets a 90% bootstrap interval. Without labels, mean model confidence gives an accuracy estimate that holds only for a calibrated model. If the new data has 200+ labeled rows, a model refit on half of them is scored against the current model on the other half.</p>
    <h3>Stress tests</h3><p>The baseline model is re-scored on held-out reference rows after synthetic noise, mean shift, scale change, missing values, category corruption, subpopulation selection and label prior shift. This shows which shifts the model tolerates before they happen in production. Permutation importance on the same rows weights feature drift by how much the model relies on each feature.</p>
    <h3>Bring your own model</h3><p>The browser cannot run a pickled model. Score both datasets with your model and include the output as a column, then pick it under Model predictions. Drift and performance then use your model; stress tests still use the baseline fitted here.</p>
    <h3>Recommendation</h3><p>Each signal votes for a level: Stable, Monitor, Investigate or Retrain. The highest vote wins. Retrain requires a measured, significant performance drop past the retraining threshold; without labels the ceiling is Investigate.</p></div>`;
  $("#applySet").onclick=()=>{const g=id=>parseFloat($(id).value);const ns={psiMod:g("#setPsiMod"),psiMaj:g("#setPsiMaj"),alpha:g("#setAlpha"),tol:g("#setTol"),retrain:g("#setRetrain"),domain:g("#setDomain")};
    for(const k in ns)if(fin(ns[k]))S.settings[k]=ns[k];run()};
}

/* ---------- config UI ---------- */
function refreshConfig(keep){
  const{ref,neu}=S;if(!ref||!neu)return;
  S.schema=inferSchema(ref);typeCols(ref,S.schema);typeCols(neu,S.schema);
  const fields=ref.fields;
  if(!keep){
    const tg=fields.find(f=>/^(target|label|y|class|outcome|churn(ed)?|default(ed)?|is_.*|fraud)$/i.test(f)&&S.schema[f].type!=="empty")||"";
    const pr=fields.find(f=>/(pred|score|prob)/i.test(f))||"";
    S.cfg={target:tg,pred:pr||"__baseline",excluded:new Set(fields.filter(f=>S.schema[f].idLike||S.schema[f].type==="empty"))};
  }
  $("#selTarget").innerHTML=`<option value="">None</option>`+fields.map(f=>`<option ${f===S.cfg.target?"selected":""}>${esc(f)}</option>`).join("");
  $("#selPred").innerHTML=`<option value="__baseline">Train a baseline here</option>`+fields.filter(f=>f!==S.cfg.target).map(f=>`<option ${f===S.cfg.pred?"selected":""}>${esc(f)}</option>`).join("");
  $("#selTarget").value=S.cfg.target;$("#selPred").value=S.cfg.pred||"__baseline";
  renderChips();
  const miss=fields.filter(f=>!neu.raw[f]);
  const n=$("#dataNote");n.className="note";
  n.textContent=miss.length?`The new data is missing ${miss.length} reference column${miss.length>1?"s":""}: ${miss.join(", ")}.`:"";
}
function renderChips(){
  const fs=S.ref.fields.filter(f=>f!==S.cfg.target&&f!==S.cfg.pred);
  $("#featChips").innerHTML=fs.map(f=>{const t=S.schema[f];const on=!S.cfg.excluded.has(f);return`<button type="button" class="chip" aria-pressed="${on}" data-f="${esc(f)}" title="${t.idLike?"Looks like an ID column; excluded by default":""}">${esc(f)}<span class="t">${t.idLike?"id":t.type==="numeric"?"num":t.type==="empty"?"empty":"cat"}</span></button>`}).join("");
  $("#featCount").textContent=`(${fs.filter(f=>!S.cfg.excluded.has(f)).length} used; select to toggle)`;
}
function setMeta(k,d){$(k==="ref"?"#metaRef":"#metaNew").textContent=`${d.name} · ${d.n.toLocaleString()} rows · ${d.fields.length} columns${d.note}`}

let runSeq=0;
async function run(){
  if(!S.ref||!S.neu){const n=$("#dataNote");n.className="note err";n.textContent="Add both a reference and a new dataset, or load a sample.";return}
  const btn=$("#runBtn");btn.disabled=true;btn.textContent="Analyzing…";document.querySelectorAll("#verdict,#kpis,.pane").forEach(e=>e.classList.add("busy"));
  const my=++runSeq;await tick();
  try{const R=await analyze();if(my!==runSeq)return;S.R=R;renderAll();afterRun();const n=$("#dataNote");n.className="note";n.textContent=S.R.warnings.join(" ")}
  catch(e){if(my!==runSeq)return;console.error(e);const n=$("#dataNote");n.className="note err";n.textContent="Analysis failed: "+e.message+". Check that both files share the same columns."}
  btn.disabled=false;btn.textContent="Run analysis";document.querySelectorAll(".busy").forEach(e=>e.classList.remove("busy"));
}
function loadSample(){
  const sc=$("#scenario").value,name=$("#scenario").selectedOptions[0].text;
  const fields=Object.keys(genCredit(1,1,{})[0]);
  S.ref=makeDataset("credit_reference_2025Q4.csv",genCredit(4000,1,{}),fields);
  S.neu=makeDataset(`credit_${sc}_2026-09.csv`,genCredit(2500,2,SCEN[sc]),fields);
  setMeta("ref",S.ref);setMeta("new",S.neu);S.sel=null;refreshConfig(false);run();
}
function readFile(file,k){
  const sep=/\.tsv$/i.test(file.name)?"\t":"";
  Papa.parse(file,{header:true,skipEmptyLines:"greedy",delimiter:sep,complete:res=>{
    if(!res.data.length||!res.meta.fields){const n=$("#dataNote");n.className="note err";n.textContent=`Could not read ${file.name}. Use a CSV with a header row.`;return}
    const d=makeDataset(file.name,res.data,res.meta.fields);
    if(k==="ref")S.ref=d;else S.neu=d;setMeta(k,d);
    if(S.ref&&S.neu){const keep=S.cfg&&S.ref.fields.includes(S.cfg.target)&&S.schema&&S.ref.fields.every(f=>f in S.schema);S.sel=null;refreshConfig(keep);run()}
    else{const n=$("#dataNote");n.className="note";n.textContent=`Loaded ${file.name}. Now add the ${k==="ref"?"new":"reference"} dataset.`}
  },error:e=>{const n=$("#dataNote");n.className="note err";n.textContent=`Could not read ${file.name}: ${e.message}`}});
}

/* ---------- report ---------- */
function reportMd(){
  const R=S.R;if(!R)return"";const L=LEVELS[R.rec.lvl];
  let s=`# DriftGuard report\n\nReference: ${S.ref.name} (${S.ref.n} rows) · New: ${S.neu.name} (${S.neu.n} rows)\n\n## Verdict: ${L.k}\n${L.head}\n${R.rec.diag?"\n"+R.rec.diag+"\n":""}\n### Signals\n${R.rec.reasons.map(r=>`- **[${LEVELS[r.l].k}]** ${r.title}. ${r.detail}`).join("\n")}\n\n### Next steps\n${R.rec.acts.map((a,i)=>`${i+1}. ${a}`).join("\n")}\n\n## Feature drift\n| Feature | Type | p (BH) | PSI | Importance | Status |\n|---|---|---|---|---|---|\n`;
  s+=sortedDrift().map(r=>`| ${r.f} | ${r.type} | ${fmtP(r.pAdj)} | ${fmt(r.psi)} | ${r.imp!=null?pct(r.imp,0):"—"} | ${SEV_LABEL[r.sev]} |`).join("\n");
  if(R.domainAUC!=null)s+=`\n\nDomain classifier AUC: ${fmt(R.domainAUC)}`;
  if(R.predDrift)s+=`\nPrediction PSI: ${fmt(R.predDrift.psi)} (${SEV_LABEL[R.predDrift.sev]})`;
  if(R.perf){s+=`\n\n## Performance\n| Metric | Reference | New |\n|---|---|---|\n`+R.perf.names.map(m=>`| ${METRIC[m].label} | ${fmt(R.perf.ref[m])} | ${fmt(R.perf.neu[m])} |`).join("\n");if(R.perf.drop!=null)s+=`\n\nRelative drop in ${METRIC[R.perf.prim].label}: ${pct(R.perf.drop)} (90% CI ${pct(R.perf.lo)} to ${pct(R.perf.hi)})`}
  if(R.stress)s+=`\n\n## Stress tests\nRobustness: keeps ${pct(R.stress.retain50,0)} of baseline ${METRIC[R.stress.prim].label} at 50% severity, ${pct(R.stress.retain100,0)} at 100%.`;
  return s+"\n";
}
function toast(msg){const t=document.createElement("div");t.className="toast";t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2200)}

