/* DC network solver: each disconnected island has its own voltage reference. */
(function(root){
'use strict';
const rho={copper:1.68e-8,aluminium:2.82e-8,nichrome:1.1e-6,insulator:1e12};
function resistance(c){
 if(c.type==='battery')return Math.max(.01,c.internal||.5);
 if(c.type==='switch')return c.closed?.0001:Infinity;
 if(c.type==='voltmeter')return Infinity;
 if(c.type==='ammeter')return .001;
 if(c.type==='fuse')return c.blown?Infinity:.01;
 if(c.type==='wire')return Math.max(.0001,(rho[c.material]||rho.copper)*(c.length||1)/((c.area||1)*1e-6));
 if(c.type==='thermistor')return c.value*Math.exp(3500*(1/(273.15+c.temperature)-1/298.15));
 if(c.type==='ldr')return c.value*100/Math.max(1,c.light);
 return Math.max(.01,c.value||10);
}
function solve(parts,wires){
 const electrical=parts.filter(p=>!['compass','iron'].includes(p.type));
 const keys=electrical.flatMap(p=>[p.id+':0',p.id+':1']);
 const parent=Object.fromEntries(keys.map(k=>[k,k]));
 function find(k){while(parent[k]!==k){parent[k]=parent[parent[k]];k=parent[k];}return k;}
 for(const w of wires)if(parent[w.a]&&parent[w.b])parent[find(w.a)]=find(w.b);
 const nodes=[...new Set(keys.map(find))], idx=Object.fromEntries(nodes.map((n,i)=>[n,i]));
 const edges=electrical.map(p=>({p,a:idx[find(p.id+':0')],b:idx[find(p.id+':1')],r:resistance(p)}));
 const N=nodes.length,A=Array.from({length:N},()=>Array(N).fill(0)),b=Array(N).fill(0),adj=Array.from({length:N},()=>[]);
 for(const e of edges){if(!Number.isFinite(e.r)||e.a===e.b)continue;const g=1/e.r;A[e.a][e.a]+=g;A[e.b][e.b]+=g;A[e.a][e.b]-=g;A[e.b][e.a]-=g;adj[e.a].push(e.b);adj[e.b].push(e.a);if(e.p.type==='battery'){b[e.a]+=g*e.p.value;b[e.b]-=g*e.p.value;}}
 const seen=new Set(),island=Array(N);let group=0;
 for(let i=0;i<N;i++)if(!seen.has(i)){const stack=[i];seen.add(i);while(stack.length){const n=stack.pop();island[n]=group;for(const j of adj[n])if(!seen.has(j)){seen.add(j);stack.push(j);}}A[i].fill(0);A[i][i]=1;b[i]=0;group++;}
 for(let k=0;k<N;k++){let pivot=k;for(let i=k+1;i<N;i++)if(Math.abs(A[i][k])>Math.abs(A[pivot][k]))pivot=i;[A[k],A[pivot]]=[A[pivot],A[k]];[b[k],b[pivot]]=[b[pivot],b[k]];if(Math.abs(A[k][k])<1e-14)continue;for(let i=k+1;i<N;i++){const f=A[i][k]/A[k][k];if(!f)continue;for(let j=k;j<N;j++)A[i][j]-=f*A[k][j];b[i]-=f*b[k];}}
 const v=Array(N).fill(0);for(let i=N-1;i>=0;i--){let t=b[i];for(let j=i+1;j<N;j++)t-=A[i][j]*v[j];v[i]=t/A[i][i];}
 const result={};for(const e of edges){const voltage=v[e.a]-v[e.b],current=Number.isFinite(e.r)?(voltage-(e.p.type==='battery'?e.p.value:0))/e.r:0;result[e.p.id]={voltage,current,power:current*current*(Number.isFinite(e.r)?e.r:0),resistance:e.r,floating:island[e.a]!==island[e.b]};}
 return result;
}
const api={solve,resistance,rho};if(typeof module!=='undefined')module.exports=api;else root.CircuitEngine=api;
})(globalThis);
