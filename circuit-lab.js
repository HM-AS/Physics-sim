(() => {
'use strict';
const $=id=>document.getElementById(id),E=window.CircuitEngine;
const catalog={battery:['▥','Battery',12],resistor:['▰','Resistor',10],lamp:['☼','Lamp',20],switch:['╱','Switch',1],wire:['⌁','Material wire',1],ammeter:['Ⓐ','Ammeter',1],voltmeter:['Ⓥ','Voltmeter',1],fuse:['─','Fuse',2],coil:['➿','Coil',5],thermistor:['ϑ','Thermistor',100],ldr:['◉','LDR',100],compass:['➤','Compass',1],iron:['▣','Iron bead',1]};
let root,canvas,ctx,observer,parts=[],wires=[],selected=null,tool='select',pending=null,mode='circuit',view3=false,yaw=-.4,tilt=.65,zoom=1,playing=false,raf=0,last=0,elapsed=0,readings={},serial=0,history=[],drag=null,fields=true,vectors=true,dots=true,labels=true,grid=true,changed=true,lastInspect=0;
let inspectorNodes=null,inspectedPart=null;
const fmt=n=>Number.isFinite(n)?Math.abs(n)<.00001?'0':Number(n.toPrecision(4)).toString():'—';
const magnetic=p=>p.type==='compass'||p.type==='iron';
function snapshot(){return JSON.stringify({parts,wires,serial});}
function checkpoint(){history.push(snapshot());if(history.length>40)history.shift();}
function stop(){playing=false;cancelAnimationFrame(raf);raf=0;last=0;if($('cb-play'))$('cb-play').textContent='▶ Play';}
function close(){stop();canvas=null;ctx=null;inspectorNodes=null;inspectedPart=null;observer?.disconnect();observer=null;if(root){root.hidden=true;root.innerHTML='';}pending=null;drag=null;}
function open(){close();window.PhysicsLabs.close();cancelAnimationFrame(animationFrameId);state.activeView='circuit-builder';state.isPlaying=false;state.projectile.isFlying=false;updateEngineHum();DOM.homeView.style.display='none';DOM.simView.style.display='none';DOM.projectileView.style.display='none';if(!root){root=document.createElement('section');root.id='circuit-lab';document.body.append(root);}root.hidden=false;root.innerHTML=`<header class="cb-header"><button id="cb-back">← All labs</button><span class="cb-brand" data-theme-brand><span class="brand-name">PhysicsSim <b>HD</b></span></span></header><main class="cb-choice"><span class="cb-eyebrow">B.5 · Current & circuits / D.2 extension</span><h1>Your ideas. Your circuit.</h1><p>Start with an empty workbench. Build, connect, measure, and experiment.</p><div class="cb-choice-grid"><button data-mode="circuit"><span class="cb-eyebrow">01 / BUILD & MEASURE</span><strong>Circuit studio →</strong><p>Make your own DC networks with batteries, switches, lamps, resistors, sensors, and meters. Investigate series and parallel connections.</p></button><button data-mode="physics"><span class="cb-eyebrow">02 / FIELDS & MOTION</span><strong>Circuits + physics →</strong><p>Explore magnetic fields around current-carrying components. Add coils, compasses, and iron beads, then inspect your experiment in 3D.</p></button></div><p class="cb-note">A lightweight educational model. Includes guided experiments and transparent assumptions.</p></main>`;Theme.mount(root);$('cb-back').onclick=()=>{close();navigateToHome();};root.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;parts=[];wires=[];history=[];serial=0;elapsed=0;selected=null;build();});}
function build(){
root.innerHTML=`<header class="cb-header"><button id="cb-back">← All labs</button><div><span class="cb-eyebrow">B.5 / INTERACTIVE WORKBENCH</span><h1>Current & circuits</h1></div><button class="cb-mode" id="cb-mode">${mode==='physics'?'◈ Circuits + physics':'⌁ Circuit studio'} ⇄</button><span class="cb-brand" data-theme-brand><span class="brand-name">PhysicsSim <b>HD</b></span></span></header><div class="cb-layout"><aside class="cb-panel"><h2>Components</h2><p>Choose a part, then click the board to place it.</p><div class="cb-palette">${Object.entries(catalog).filter(([k])=>mode==='physics'||!['compass','iron'].includes(k)).map(([k,[s,n]])=>`<button data-part="${k}" aria-pressed="false"><b>${s}</b>${n}</button>`).join('')}</div><p>Click two terminal dots to connect them. Crossed wires connect only when they share a terminal.</p><label class="cb-field">Select a component<select id="cb-select"><option value="">None</option></select></label><details id="cb-settings"><summary>⚙ View settings</summary>${[['fields','Magnetic field lines',fields],['vectors','Field vectors',vectors],['dots','Conventional current',dots],['labels','Component labels',labels],['grid','Grid / snap to 20',grid]].map(([id,n,v])=>`<label class="cb-field"><input type="checkbox" id="cb-${id}" ${v?'checked':''}> ${n}</label>`).join('')}<label class="cb-field">Zoom<input id="cb-zoom" type="range" min="0.5" max="1.6" step=".05" value="${zoom}"></label><label class="cb-field">Orbit angle<input id="cb-yaw" type="range" min="-3.14" max="3.14" step=".05" value="${yaw}"></label><label class="cb-field">Elevation<input id="cb-tilt" type="range" min=".2" max="1.3" step=".05" value="${tilt}"></label></details></aside><main><div class="cb-toolbar"><button id="cb-select-tool" aria-pressed="true">↖ Move</button><button id="cb-wire-tool">⌁ Connect</button><button id="cb-view">${view3?'3D orbit':'2D build'}</button><button id="cb-undo">↶ Undo</button><button id="cb-save">Save</button><button id="cb-load">Load</button><button id="cb-clear">Clear</button></div><div class="cb-stage"><canvas id="cb-canvas" tabindex="0" aria-label="Circuit workbench. Place using component buttons then Enter. Select parts using the dropdown; arrow keys move a selected part, R rotates, Delete removes. Click two terminals to wire, or use the connection dropdowns below."></canvas><div class="cb-empty" id="cb-empty"><strong>A blank canvas for discovery</strong>Choose a battery to start your first circuit.</div><div class="cb-status" id="cb-status" role="status">Ready to build · paused</div></div><div class="cb-bottom"><div class="cb-toolbar"><button class="primary" id="cb-play">▶ Play</button><button id="cb-step">Step 0.02 s</button><button id="cb-reset">Reset motion</button></div><span id="cb-clock">0.00 s · 0 components</span></div><details class="cb-panel cb-learn"><summary>Learn by building · guided experiments</summary><div class="cb-lessons">${['First circuit','Series','Parallel','Conductivity','Electromagnet'].map((n,i)=>`<button data-lesson="${i}">${n}</button>`).join('')}</div><div id="cb-lesson"><p>1. Place a battery and a lamp. 2. Connect battery + to one lamp terminal. 3. Connect the remaining terminals. 4. Press Play. Select a part to see voltage, current, resistance, and power.</p><p>Drag components or the small midpoint on a wire. Select a part and press R to rotate. In 3D, drag empty space to orbit; use 2D for the easiest wiring. Your circuit survives switching between modes.</p></div><details><summary>Equations & model limits</summary><p>V = IR · P = IV · Q = It · E = Pt · R = ρL/A · ε = V + Ir. Junction currents sum to zero; loop voltage changes sum to zero. Lamps use fixed resistance; thermistors use a 3500 K beta model; LDR resistance varies inversely with illumination. Fuses open when current exceeds their rating.</p><p>Steady DC resistor networks, up to 60 parts / 120 connections. Connecting leads are ideal; material-wire parts model resistivity. Batteries have at least 0.01 Ω internal resistance. Ammeters have 0.001 Ω resistance. Voltmeters draw no current; measurements between disconnected islands are undefined. No AC, capacitive/inductive transients, semiconductor junctions, thermal dynamics, or induction feedback.</p><p>3D is an orbitable projection of a planar circuit. In physics mode, field vectors use numerical Biot–Savart segments (100 board units = 1 m), with a finite distance cutoff. Lines trace the numerical field; ideal-wire loops use one valid spanning-tree current distribution, so redundant zero-resistance loops have no unique field prediction. Coil fields use circular turns. Field-line animations show direction, not field motion. Compass alignment and bead attraction are damped, illustrative responses, not calibrated dynamics; magnetic objects do not alter the circuit.</p></details></details></main><aside class="cb-panel cb-right"><h2>Inspector</h2><div id="cb-inspector"></div><details class="cb-limit"><summary>Connect by terminal</summary><label class="cb-field">From<select id="cb-from"></select></label><label class="cb-field">To<select id="cb-to"></select></label><button id="cb-connect">Connect terminals</button></details><p class="cb-note">Editing pauses playback. Saved circuits stay in this browser. Clear can be undone.</p></aside></div>`;
Theme.mount(root);canvas=$('cb-canvas');ctx=canvas.getContext('2d');observer?.disconnect();observer=new ResizeObserver(draw);observer.observe(canvas);
$('cb-back').onclick=()=>{close();navigateToHome();};$('cb-mode').onclick=()=>{stop();mode=mode==='physics'?'circuit':'physics';build();};
root.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>{tool=b.dataset.part;pending=null;syncTools();status(`Place ${catalog[tool][1]}: click the board, or focus it and press Enter.`);});
$('cb-select-tool').onclick=()=>{tool='select';pending=null;syncTools();};$('cb-wire-tool').onclick=()=>{tool='connect';pending=null;syncTools();status('Click a terminal, then another terminal. Escape cancels.');};
$('cb-view').onclick=()=>{view3=!view3;$('cb-view').textContent=view3?'3D orbit':'2D build';draw();};
$('cb-undo').onclick=()=>{if(!history.length)return;stop();const s=JSON.parse(history.pop());parts=s.parts;wires=s.wires;serial=s.serial;selected=null;refresh();};
$('cb-clear').onclick=()=>{checkpoint();stop();parts=[];wires=[];selected=null;elapsed=0;refresh();};
$('cb-save').onclick=()=>{try{localStorage.setItem('physics-circuit-v1',snapshot());status('Circuit saved in this browser.');}catch{status('Browser storage unavailable.');}};
$('cb-load').onclick=()=>{try{const raw=localStorage.getItem('physics-circuit-v1');if(!raw){status('No saved circuit yet.');return;}if(raw.length>200000)throw Error();const s=JSON.parse(raw);if(!valid(s))throw Error();checkpoint();stop();parts=s.parts;wires=s.wires;serial=s.serial;selected=null;elapsed=0;refresh();status('Saved circuit loaded.');}catch{status('Could not load: saved data is unavailable or invalid.');}};
$('cb-play').onclick=()=>{if(playing)stop();else{playing=true;last=0;$('cb-play').textContent='Ⅱ Pause';if(!document.hidden)raf=requestAnimationFrame(tick);}draw();};$('cb-step').onclick=()=>{stop();advance(.02);draw();inspect();};$('cb-reset').onclick=()=>{stop();elapsed=0;parts.forEach(p=>{p.angle=0;if(p.type==='iron'&&p.origin){p.x=p.origin.x;p.y=p.origin.y;}p.blown=false;p.charge=0;p.energy=0;});refresh();};
$('cb-select').onchange=e=>{selected=e.target.value||null;tool='select';inspect();draw();};$('cb-connect').onclick=()=>connect($('cb-from').value,$('cb-to').value);
for(const id of ['fields','vectors','dots','labels','grid'])$('cb-'+id).onchange=e=>{if(id==='fields')fields=e.target.checked;if(id==='vectors')vectors=e.target.checked;if(id==='dots')dots=e.target.checked;if(id==='labels')labels=e.target.checked;if(id==='grid')grid=e.target.checked;draw();};
for(const id of ['zoom','yaw','tilt'])$('cb-'+id).oninput=e=>{if(id==='zoom')zoom=+e.target.value;if(id==='yaw')yaw=+e.target.value;if(id==='tilt')tilt=+e.target.value;draw();};
root.querySelectorAll('[data-lesson]').forEach(b=>b.onclick=()=>lesson(+b.dataset.lesson));
canvas.onpointerdown=pointerDown;canvas.onpointermove=pointerMove;canvas.onpointerup=canvas.onpointercancel=()=>{if(drag?.kind==='part'){const p=parts.find(p=>p.id===selected);if(p?.type==='iron')p.origin={x:p.x,y:p.y};}drag=null;};
canvas.onkeydown=e=>{if(e.key==='Escape'){pending=null;tool='select';syncTools();draw();}else if(e.key==='Enter'&&catalog[tool]){add(tool,0,0);}else if(selected){const p=parts.find(p=>p.id===selected);if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();}else if(p&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','r','R'].includes(e.key)){e.preventDefault();checkpoint();stop();if(e.key.toLowerCase()==='r')p.rotation=(p.rotation+1)%4;else{p.x+=e.key==='ArrowRight'?20:e.key==='ArrowLeft'?-20:0;p.y+=e.key==='ArrowDown'?20:e.key==='ArrowUp'?-20:0;}refresh();}}};
refresh();}
function valid(s){if(!s||!Array.isArray(s.parts)||!Array.isArray(s.wires)||s.parts.length>60||s.wires.length>120||!Number.isSafeInteger(s.serial)||s.serial<0)return false;const ids=new Set();for(const p of s.parts){if(!catalog[p.type]||!/^p\d+$/.test(p.id)||ids.has(p.id)||!['x','y','rotation','value','internal','length','area','temperature','light','turns'].every(k=>Number.isFinite(p[k])&&Math.abs(p[k])<1e6)||p.value<=0||p.internal<.01||p.area<=0||p.length<=0||p.temperature< -50||p.temperature>200||p.light<=0||p.turns<1)return false;if(!Number.isFinite(p.angle)||!Number.isFinite(p.charge??0)||!Number.isFinite(p.energy??0)||!Number.isInteger(p.rotation)||p.rotation<0||p.rotation>3||!E.rho[p.material]||typeof p.closed!=='boolean'||typeof p.blown!=='boolean'||!p.origin||!Number.isFinite(p.origin.x)||!Number.isFinite(p.origin.y)||Number(p.id.slice(1))>s.serial)return false;ids.add(p.id);}return new Set(s.wires.map(w=>w.id)).size===s.wires.length&&s.wires.every(w=>Number(w.id?.slice(1))<=s.serial&&typeof w.id==='string'&&/^w\d+$/.test(w.id)&&[w.a,w.b].every(t=>typeof t==='string'&&/^p\d+:[01]$/.test(t)&&ids.has(t.split(':')[0]))&&(!w.bend||Number.isFinite(w.bend.x)&&Number.isFinite(w.bend.y)));}
function status(t){$('cb-status').textContent=t;}
function syncTools(){root.querySelectorAll('[data-part]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.part===tool)));$('cb-select-tool').setAttribute('aria-pressed',String(tool==='select'));$('cb-wire-tool').setAttribute('aria-pressed',String(tool==='connect'));}
function create(type,x,y){return {id:'p'+(++serial),type,x,y,rotation:0,value:catalog[type][2],internal:.5,closed:true,blown:false,material:'copper',length:1,area:1,temperature:25,light:100,turns:20,angle:0,charge:0,energy:0,origin:{x,y}};}
function add(type,x,y){if(parts.length>=60){status('60 component limit reached.');return;}checkpoint();stop();const p=create(type,snap(x),snap(y));parts.push(p);selected=p.id;tool='select';syncTools();refresh();}
function connect(a,b){if(!a||!b||a===b){status('Choose two different terminals.');return;}if(wires.some(w=>w.a===a&&w.b===b||w.b===a&&w.a===b)){status('Those terminals are already connected.');return;}if(wires.length>=120){status('120 connection limit reached.');return;}checkpoint();stop();wires.push({id:'w'+(++serial),a,b});pending=null;refresh();status('Connected. Drag a wire midpoint to route it.');}
function remove(){checkpoint();stop();parts=parts.filter(p=>p.id!==selected);wires=wires.filter(w=>w.id!==selected&&!w.a.startsWith(selected+':')&&!w.b.startsWith(selected+':'));selected=null;refresh();}
function refresh(){readings=E.solve(parts,wires);changed=true;const opts=parts.map(p=>`<option value="${p.id}">${p.id} · ${catalog[p.type][1]}</option>`).join('');$('cb-select').innerHTML='<option value="">None</option>'+opts;$('cb-select').value=selected||'';const terminals=parts.filter(p=>!magnetic(p)).flatMap(p=>[0,1].map(i=>`<option value="${p.id}:${i}">${p.id} ${catalog[p.type][1]} · ${p.type==='battery'?(i?'−':'+'):(i?'B':'A')}</option>`)).join('');$('cb-from').innerHTML=terminals;$('cb-to').innerHTML=terminals;inspect();draw();}
function inspect(){inspectorNodes=null;inspectedPart=null;const box=$('cb-inspector'),p=parts.find(p=>p.id===selected),w=wires.find(w=>w.id===selected);if(!p){box.innerHTML=w?'<p>Connecting lead · ideal conductor. Drag its midpoint to route. Crossings do not form junctions.</p><button id="cb-delete">Delete wire</button>':'<p>Select a component to edit its properties and inspect live measurements.</p><div class="cb-readings"><div>Components<strong>'+parts.length+'</strong></div><div>Connections<strong>'+wires.length+'</strong></div></div>';if(w)$('cb-delete').onclick=remove;return;}
const propertyField=(key,name,min,max,step=1)=>`<label class="cb-field">${name}<input type="number" data-prop="${key}" min="${min}" max="${max}" step="${step}" value="${p[key]}"></label>`;
let html=`<span class="cb-eyebrow">${p.id} / ${catalog[p.type][1]}</span>`;
if(['battery','resistor','lamp','coil','thermistor','ldr','fuse'].includes(p.type))html+=propertyField('value',p.type==='battery'?'EMF (V)':p.type==='fuse'?'Fuse rating (A)':'Resistance at reference (Ω)',.01,p.type==='battery'?100:100000,.1);
if(p.type==='battery')html+=propertyField('internal','Internal resistance (Ω)',.01,100,.01);
if(p.type==='switch')html+=`<label class="cb-field"><input id="cb-closed" type="checkbox" ${p.closed?'checked':''}> Switch closed</label>`;
if(p.type==='wire')html+=`<label class="cb-field">Material<select id="cb-material">${Object.keys(E.rho).map(k=>`<option ${p.material===k?'selected':''}>${k}</option>`).join('')}</select></label>`+propertyField('length','Length (m)',.01,100,.1)+propertyField('area','Cross-section (mm²)',.01,100,.1);
if(p.type==='coil')html+=propertyField('turns','Coil turns',1,100,1);
if(p.type==='thermistor')html+=propertyField('temperature','Temperature (°C)',-50,200,1);
if(p.type==='ldr')html+=propertyField('light','Illuminance (lux)',1,10000,1);
const q=readings[p.id];if(q)html+=`<div class="cb-readings">${[['Voltage',q.floating?'Floating':fmt(q.voltage)+' V'],['Current',fmt(q.current)+' A'],['Resistance',fmt(q.resistance)+' Ω'],['Dissipation',fmt(q.power)+' W'],['Charge passed',fmt(p.charge||0)+' C'],['Energy dissipated',fmt(p.energy||0)+' J']].map(([n,v])=>`<div>${n}<strong>${v}</strong></div>`).join('')}</div><p class="cb-note">Signed readings use terminal A → B (+ → − for a battery). ${p.type==='battery'?'Negative current means the battery supplies energy.':''}</p>${p.blown?'<p class="cb-warning">Fuse blown · Reset motion to replace.</p>':''}`;
if(p.type==='wire'&&q)html+=`<p>Conductivity: ${fmt(1/E.rho[p.material])} S/m. ${p.material==='copper'?'Electron drift estimate: '+fmt(Math.abs(q.current)/(8.5e28*1.602e-19*p.area*1e-6))+' m/s (n = 8.5 × 10²⁸ m⁻³).':''}</p>`;
if(magnetic(p)){fieldPoint.x=p.x;fieldPoint.y=p.y;const b=field(fieldPoint,fieldResult);html+=`<div class="cb-readings"><div>Local field<strong>${fmt(Math.hypot(b.x,b.y,b.z)*1e6)} μT</strong></div></div>`;}
if(magnetic(p))html+='<p>Press Play in physics mode to respond to the local field. Motion is illustrative and damped.</p>';
html+='<button id="cb-rotate">Rotate 90°</button><button id="cb-delete">Delete</button>';box.innerHTML=html;inspectedPart=p;inspectorNodes=box.querySelectorAll('.cb-readings strong');box.onfocusin=()=>{if(playing){stop();draw();}};
box.querySelectorAll('[data-prop]').forEach(el=>el.onchange=()=>{const n=Number(el.value);if(!Number.isFinite(n)||n<Number(el.min)||n>Number(el.max)){el.value=p[el.dataset.prop];return;}checkpoint();stop();p[el.dataset.prop]=n;refresh();});if($('cb-closed'))$('cb-closed').onchange=e=>{checkpoint();stop();p.closed=e.target.checked;refresh();};if($('cb-material'))$('cb-material').onchange=e=>{checkpoint();stop();p.material=e.target.value;refresh();};$('cb-delete').onclick=remove;$('cb-rotate').onclick=()=>{checkpoint();stop();p.rotation=(p.rotation+1)%4;refresh();};}
function terminal(key){const [id,s]=key.split(':'),p=parts.find(p=>p.id===id);if(!p)return {x:0,y:0,z:0};const a=p.rotation*Math.PI/2,d=Number(s)?42:-42;return{x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d,z:0};}
function project(p){const w=canvas.clientWidth,h=canvas.clientHeight,scale=Math.min(w/850,h/540)*zoom;let x=p.x,y=p.y,z=p.z||0;if(view3){const xx=x*Math.cos(yaw)-y*Math.sin(yaw);y=(x*Math.sin(yaw)+y*Math.cos(yaw))*Math.cos(tilt)-z*Math.sin(tilt);x=xx;}return{x:w/2+x*scale,y:h/2+y*scale};}
function unproject(p){const scale=Math.min(canvas.clientWidth/850,canvas.clientHeight/540)*zoom;let x=(p.x-canvas.clientWidth/2)/scale,y=(p.y-canvas.clientHeight/2)/scale;if(view3){y/=Math.cos(tilt);return{x:x*Math.cos(yaw)+y*Math.sin(yaw),y:-x*Math.sin(yaw)+y*Math.cos(yaw)};}return{x,y};}
function snap(n){return grid?Math.round(n/20)*20:n;}
function pos(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function pointerDown(e){canvas.focus();canvas.setPointerCapture(e.pointerId);const screen=pos(e),world=unproject(screen);if(catalog[tool]){add(tool,world.x,world.y);return;}for(const p of parts.filter(p=>!magnetic(p)))for(const s of [0,1]){const key=p.id+':'+s;if(distance(screen,project(terminal(key)))<13){if(pending)connect(pending,key);else{pending=key;status('Now choose the second terminal.');}draw();return;}}
if(tool==='connect'){pending=null;draw();return;}const p=[...parts].reverse().find(p=>distance(screen,project(p))<28);if(p){checkpoint();stop();selected=p.id;drag={kind:'part',dx:world.x-p.x,dy:world.y-p.y};inspect();$('cb-select').value=selected;draw();return;}
const w=wires.find(w=>distance(screen,project(bend(w)))<14);if(w){checkpoint();stop();selected=w.id;drag={kind:'wire'};inspect();draw();return;}selected=null;inspect();if(view3)drag={kind:'orbit',screen,yaw,tilt};draw();}
function pointerMove(e){if(!drag)return;const screen=pos(e),world=unproject(screen);if(drag.kind==='orbit'){yaw=drag.yaw+(screen.x-drag.screen.x)/150;tilt=Math.max(.2,Math.min(1.3,drag.tilt+(screen.y-drag.screen.y)/200));}else if(drag.kind==='part'){const p=parts.find(p=>p.id===selected);p.x=snap(world.x-drag.dx);p.y=snap(world.y-drag.dy);changed=true;}else{wires.find(w=>w.id===selected).bend={x:snap(world.x),y:snap(world.y)};changed=true;}draw();}
function bend(w){if(w.bend)return w.bend;const a=terminal(w.a),b=terminal(w.b);return{x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
function stroke(points,color,width=2){ctx.beginPath();points.forEach((p,i)=>{const q=project(p);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});ctx.strokeStyle=drawColor(color);ctx.lineWidth=width;ctx.stroke();}
function ball(p,r,color){const q=project(p);ctx.beginPath();ctx.arc(q.x,q.y,r,0,Math.PI*2);ctx.fillStyle=drawColor(color);ctx.fill();}
function text(p,t,color='#b8c9df',size=11){const q=project(p);ctx.fillStyle=drawColor(color);ctx.font=`${size}px system-ui`;ctx.textAlign='center';ctx.fillText(t,q.x,q.y);}
function arrow(a,b,color){stroke([a,b],color,1.5);const p=project(a),q=project(b),ang=Math.atan2(q.y-p.y,q.x-p.x);ctx.beginPath();ctx.moveTo(q.x-6*Math.cos(ang-.5),q.y-6*Math.sin(ang-.5));ctx.lineTo(q.x,q.y);ctx.lineTo(q.x-6*Math.cos(ang+.5),q.y-6*Math.sin(ang+.5));ctx.stroke();}
let segments=[],fieldPaths=[],fieldArrows=[],fieldCacheDirty=true;
function makeSegments(){segments=[];for(const p of parts){const I=readings[p.id]?.current||0;if(Math.abs(I)<1e-8)continue;if(p.type==='coil'){const a=p.rotation*Math.PI/2;for(let i=0;i<24;i++){const point=t=>({x:p.x+24*Math.cos(t)*Math.cos(a),y:p.y+24*Math.cos(t)*Math.sin(a),z:24*Math.sin(t)});segments.push({a:point(i*Math.PI/12),b:point((i+1)*Math.PI/12),I:I*p.turns});}}else segments.push({a:terminal(p.id+':0'),b:terminal(p.id+':1'),I});}
// Kirchhoff flow on the ideal-lead spanning forest; redundant ideal loops have non-unique currents.
const inject={};for(const p of parts){const i=readings[p.id]?.current||0;inject[p.id+':0']=-i;inject[p.id+':1']=i;}const adj={};for(const w of wires){(adj[w.a]??=[]).push([w.b,w]);(adj[w.b]??=[]).push([w.a,w]);w.current=0;}const seen=new Set();function visit(n){seen.add(n);let sum=inject[n]||0;for(const [v,w]of adj[n]||[])if(!seen.has(v)){const s=visit(v);w.current=w.a===v?s:-s;sum+=s;}return sum;}Object.keys(adj).forEach(n=>{if(!seen.has(n))visit(n);});for(const w of wires){const a=terminal(w.a),b=terminal(w.b),m=bend(w);segments.push({a,b:m,I:w.current},{a:m,b,I:w.current});}changed=false;fieldCacheDirty=true;}
function field(p,out={x:0,y:0,z:0}){let x=0,y=0,z=0;for(const s of segments){const dx=(s.b.x-s.a.x)/100,dy=(s.b.y-s.a.y)/100,dz=((s.b.z||0)-(s.a.z||0))/100;for(let k=0;k<3;k++){const f=(k+.5)/3,rx=(p.x-s.a.x)/100-dx*f,ry=(p.y-s.a.y)/100-dy*f,rz=((p.z||0)-(s.a.z||0))/100-dz*f;const r=Math.max(.025,Math.hypot(rx,ry,rz)),v=1e-7*s.I/(3*r*r*r);x+=(dy*rz-dz*ry)*v;y+=(dz*rx-dx*rz)*v;z+=(dx*ry-dy*rx)*v;}}out.x=x;out.y=y;out.z=z;return out;}
// Recompute spatial field geometry only after circuit or layout edits.
function cacheField(){fieldPaths=[];fieldArrows=[];
for(const segment of segments.filter(s=>Math.abs(s.I)>1e-8).slice(0,12)){
 const seed={x:(segment.a.x+segment.b.x)/2,y:(segment.a.y+segment.b.y)/2,z:18};
 for(const sign of [-1,1]){let p={...seed},points=[p];for(let i=0;i<100;i++){const f=field(p),n=Math.hypot(f.x,f.y,f.z);if(n<1e-12)break;const next={x:p.x+sign*f.x/n*8,y:p.y+sign*f.y/n*8,z:p.z+sign*f.z/n*8};if(Math.hypot(next.x,next.y,next.z)>700)break;points.push(next);p=next;}if(sign<0)points.reverse();fieldPaths.push(points);}}
for(let x=-320;x<=320;x+=80)for(let y=-200;y<=200;y+=80){const p={x,y,z:35},f=field(p),n=Math.hypot(f.x,f.y,f.z);if(n>1e-10)fieldArrows.push([p,{x:x+f.x/n*22,y:y+f.y/n*22,z:35+f.z/n*22}]);}
fieldCacheDirty=false;}
const board=document.createElement('canvas');
const markerLines=new Float32Array(24*101*4),markerOffsets=new Uint16Array(25),wireScreen=new Float32Array(120*7);
let markerCount=0,wireCount=0,boardDirty=true,cachedWidth=0,cachedHeight=0,cachedDpr=0;
let projectScale=1,projectCos=1,projectSin=0,projectTilt=1,projectZ=0;
const drawTokens={'#1a2a40':'grid','#227b93':'axis','#67e8f9':'blue','#43968c':'teal','#7e9fbd':'axis','#36536f':'axis','#d2dfed':'ink','#fde68a':'amber','#fbbf24':'amber','#b8c9df':'muted','#fb7185':'red','#38bdf8':'blue'};
function drawColor(color){return Theme.palette[drawTokens[color]]||color;}
function screenX(x,y){return cachedWidth/2+(view3?x*projectCos-y*projectSin:x)*projectScale;}
function screenY(x,y,z=0){return cachedHeight/2+(view3?(x*projectSin+y*projectCos)*projectTilt-z*projectZ:y)*projectScale;}
function screenArrow(ax,ay,bx,by,color){
    const a=Math.atan2(by-ay,bx-ax);ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.moveTo(bx-6*Math.cos(a-.5),by-6*Math.sin(a-.5));ctx.lineTo(bx,by);ctx.lineTo(bx-6*Math.cos(a+.5),by-6*Math.sin(a+.5));ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();
}
function draw(invalidate=true){
    if(!canvas||root.hidden||!canvas.isConnected)return;
    const dpr=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;
    if(invalidate!==false||w!==cachedWidth||h!==cachedHeight||dpr!==cachedDpr)boardDirty=true;
    if(boardDirty){
        cachedWidth=w;cachedHeight=h;cachedDpr=dpr;projectScale=Math.min(w/850,h/540)*zoom;
        projectCos=Math.cos(yaw);projectSin=Math.sin(yaw);projectTilt=Math.cos(tilt);projectZ=Math.sin(tilt);
        canvas.width=board.width=Math.round(w*dpr);canvas.height=board.height=Math.round(h*dpr);
        const live=ctx;ctx=board.getContext('2d');paintBoard();ctx=live;ctx.setTransform(dpr,0,0,dpr,0,0);
        wireCount=0;for(const part of parts)part.drawLabel=part.id+' · '+catalog[part.type][1];
        for(const wire of wires){const a=terminal(wire.a),b=terminal(wire.b),m=bend(wire),i=wireCount++*7;
            wireScreen[i]=screenX(a.x,a.y);wireScreen[i+1]=screenY(a.x,a.y);wireScreen[i+2]=screenX(m.x,m.y);wireScreen[i+3]=screenY(m.x,m.y);wireScreen[i+4]=screenX(b.x,b.y);wireScreen[i+5]=screenY(b.x,b.y);wireScreen[i+6]=wire.current;}
        markerCount=0;let index=0;markerOffsets[0]=0;
        if(mode==='physics'&&fields)for(const path of fieldPaths){
            for(let j=0;j<path.length-1;j++){const a=path[j],b=path[j+1];markerLines[index++]=screenX(a.x,a.y);markerLines[index++]=screenY(a.x,a.y,a.z);markerLines[index++]=screenX(b.x,b.y);markerLines[index++]=screenY(b.x,b.y,b.z);}
            markerOffsets[++markerCount]=index;
        }
        boardDirty=false;updateClock();
    }
    ctx.clearRect(0,0,w,h);ctx.drawImage(board,0,0,w,h);
    if(mode==='physics'&&fields)for(let i=0;i<markerCount;i++){
        const start=markerOffsets[i],count=(markerOffsets[i+1]-start)/4;
        if(!count)continue;const at=start+Math.floor(elapsed*10%count)*4;
        screenArrow(markerLines[at],markerLines[at+1],markerLines[at+2],markerLines[at+3],Theme.palette.blue);
    }
    if(dots){ctx.beginPath();for(let i=0;i<wireCount;i++){
        const offset=i*7,current=wireScreen[offset+6];if(Math.abs(current)<1e-7)continue;
        for(let k=0;k<3;k++){
            const t=((elapsed*Math.sign(current)*.3+k/3)%1+1)%1,at=offset+(t<.5?0:2),f=(t%.5)*2;
            const x=wireScreen[at]+(wireScreen[at+2]-wireScreen[at])*f,y=wireScreen[at+1]+(wireScreen[at+3]-wireScreen[at+1])*f;
            ctx.moveTo(x+2.5,y);ctx.arc(x,y,2.5,0,Math.PI*2);
        }
    }ctx.fillStyle=Theme.palette.amber;ctx.fill();}
    if(mode==='physics')for(const part of parts){
        if(!magnetic(part))continue;
        const x=screenX(part.x,part.y),y=screenY(part.x,part.y);
        ctx.fillStyle=Theme.palette.track;ctx.fillRect(x-24,y-18,48,36);ctx.strokeStyle=selected===part.id?Theme.palette.amber:Theme.palette.ink;ctx.lineWidth=1.5;ctx.strokeRect(x-24,y-18,48,36);
        ctx.fillStyle=Theme.palette.ink;ctx.font='22px system-ui';ctx.textAlign='center';ctx.fillText(catalog[part.type][0],x,y+7);
        if(part.type==='compass')screenArrow(x,y,screenX(part.x+30*Math.cos(part.angle),part.y+30*Math.sin(part.angle)),screenY(part.x+30*Math.cos(part.angle),part.y+30*Math.sin(part.angle)),Theme.palette.red);
        if(labels){ctx.fillStyle=Theme.palette.muted;ctx.font='11px system-ui';ctx.fillText(part.drawLabel,screenX(part.x,part.y+54),screenY(part.x,part.y+54));}
    }
}
document.addEventListener('themechange',()=>{if(root&&!root.hidden&&canvas?.isConnected)draw();});
function paintBoard(){if(!canvas||root.hidden||!canvas.isConnected)return;const dpr=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);if(changed)makeSegments();
if(grid){for(let x=-420;x<=420;x+=40)stroke([{x,y:-260},{x,y:260}],'#1a2a40',1);for(let y=-260;y<=260;y+=40)stroke([{x:-420,y},{x:420,y}],'#1a2a40',1);}
if(mode==='physics'&&(fields||vectors)&&fieldCacheDirty)cacheField();
if(mode==='physics'&&fields){for(const points of fieldPaths)stroke(points,'#227b93',1);}
if(mode==='physics'&&vectors)for(const [a,b]of fieldArrows)arrow(a,b,'#43968c');
for(const w of wires){const a=terminal(w.a),b=terminal(w.b),m=bend(w);stroke([a,m,b],selected===w.id?'#fbbf24':'#7e9fbd',3);ball(m,4,selected===w.id?'#fbbf24':'#36536f');}

for(const p of parts){if(magnetic(p))continue;const q=readings[p.id],color=selected===p.id?'#fde68a':'#d2dfed',s=project(p);if(!magnetic(p)){stroke([terminal(p.id+':0'),terminal(p.id+':1')],'#7e9fbd',3);}
ctx.save();ctx.translate(s.x,s.y);const a=project(terminal(p.id+':0')),b=project(terminal(p.id+':1'));ctx.rotate(magnetic(p)?0:Math.atan2(b.y-a.y,b.x-a.x));ctx.fillStyle=p.type==='lamp'&&Math.abs(q?.current)>.001?`rgba(251,191,36,${Math.min(1,.3+(q.power||0)/8)})`:Theme.palette.track;ctx.strokeStyle=drawColor(color);ctx.lineWidth=selected===p.id?2.5:1.5;ctx.beginPath();ctx.roundRect(-24,-18,48,36,7);ctx.fill();ctx.stroke();ctx.fillStyle=drawColor(color);ctx.textAlign='center';ctx.font='22px system-ui';ctx.fillText(p.type==='switch'?(p.closed?'─':'╱'):p.blown?'×':catalog[p.type][0],0,7);ctx.restore();
if(p.type==='compass'){const v=p.angle||0;arrow(p,{x:p.x+30*Math.cos(v),y:p.y+30*Math.sin(v)},'#fb7185');}
if(!magnetic(p))for(const i of [0,1]){const key=p.id+':'+i;ball(terminal(key),6,pending===key?'#38bdf8':i===0&&p.type==='battery'?'#fb7185':'#fbbf24');}
if(labels){text({x:p.x,y:p.y+54},p.id+' · '+catalog[p.type][1]);if(q&&['ammeter','voltmeter'].includes(p.type))text({x:p.x,y:p.y-40},q.floating?'Floating':fmt(p.type==='ammeter'?q.current:q.voltage)+(p.type==='ammeter'?' A':' V'),'#67e8f9',13);}}
}
const fieldPoint={x:0,y:0,z:5},fieldResult={x:0,y:0,z:0};
function fieldNorm(x,y) {fieldPoint.x=x;fieldPoint.y=y;field(fieldPoint,fieldResult);return fieldResult.x*fieldResult.x+fieldResult.y*fieldResult.y+fieldResult.z*fieldResult.z;}
function advance(dt){
    elapsed+=dt;
    let blown=false;
    for(const p of parts){const q=readings[p.id];if(q){p.charge=(p.charge||0)+Math.abs(q.current)*dt;p.energy=(p.energy||0)+q.power*dt;}
        if(p.type==='fuse'&&!p.blown&&Math.abs(q?.current)>p.value){p.blown=true;blown=true;}}
    if(blown){readings=E.solve(parts,wires);changed=true;boardDirty=true;status('Fuse opened: current exceeded its rating. Reset motion to replace it.');}
    if(changed)makeSegments();
    if(mode==='physics')for(const p of parts){
        if(!magnetic(p))continue;
        fieldPoint.x=p.x;fieldPoint.y=p.y;field(fieldPoint,fieldResult);
        if(p.type==='compass'){
            if(Math.hypot(fieldResult.x,fieldResult.y)>1e-10){const target=Math.atan2(fieldResult.y,fieldResult.x),delta=Math.atan2(Math.sin(target-p.angle),Math.cos(target-p.angle));p.angle+=delta*(-Math.expm1(-dt*5));}
        }else{
            const gx=fieldNorm(p.x+2,p.y)-fieldNorm(p.x-2,p.y),gy=fieldNorm(p.x,p.y+2)-fieldNorm(p.x,p.y-2),n=Math.hypot(gx,gy);
            if(n>1e-22){const speed=Math.min(25,n*1e12);p.x+=gx/n*speed*dt;p.y+=gy/n*speed*dt;}
        }
    }
}
function tick(now){
    if(!playing||document.hidden||root.hidden)return;
    if(last){let remaining=Math.min(.08,(now-last)/1000);while(remaining>1e-9){const dt=Math.min(remaining,1/240);advance(dt);remaining-=dt;}}
    last=now;draw(false);
    if(now-lastInspect>300){
        // Update existing readout nodes; never rebuild focused inspector controls during playback.
        updateLiveInspector();updateClock();lastInspect=now;
    }
    raf=requestAnimationFrame(tick);
}
function updateLiveInspector(){
    const p=inspectedPart,q=p&&readings[p.id];if(!q)return;
    const nodes=inspectorNodes;if(!nodes||nodes.length<6)return;
    nodes[0].textContent=q.floating?'Floating':fmt(q.voltage)+' V';nodes[1].textContent=fmt(q.current)+' A';nodes[2].textContent=fmt(q.resistance)+' Ω';nodes[3].textContent=fmt(q.power)+' W';nodes[4].textContent=fmt(p.charge)+' C';nodes[5].textContent=fmt(p.energy)+' J';
}
function updateClock(){
    $('cb-empty').hidden=parts.length>0;$('cb-clock').textContent=elapsed.toFixed(2)+' s · '+parts.length+' components · '+(playing?'Running':'Paused');
    let max=0;for(const p of parts)max=Math.max(max,Math.abs(readings[p.id]?.current||0));
    if(max>10)status('High current: '+fmt(max)+' A. Increase resistance or add a fuse.');
}
function lesson(i){checkpoint();stop();parts=[];wires=[];elapsed=0;selected=null;const battery=create('battery',-220,-120),r=create(i===0?'lamp':i===3?'wire':i===4?'coil':'resistor',20,-120);parts.push(battery,r);function link(a,s,b,t,bend){wires.push({id:'w'+(++serial),a:a.id+':'+s,b:b.id+':'+t,...(bend?{bend}: {})});}link(battery,1,r,0);if(i===1){const r2=create('resistor',180,100);r2.value=20;parts.push(r2);link(r,1,r2,0);link(r2,1,battery,0,{x:-300,y:180});}else if(i===2){const r2=create('resistor',20,120);r2.value=20;parts.push(r2);link(r,0,r2,0);link(r,1,r2,1);link(r,1,battery,0,{x:-300,y:220});}else{if(i===3){const load=create('resistor',180,120);parts.push(load);link(r,1,load,0);link(load,1,battery,0,{x:-300,y:200});}else link(r,1,battery,0,{x:-300,y:180});}if(i===4){mode='physics';parts.push(create('compass',20,20),create('iron',80,35));build();}refresh();const lessons=[['Close the loop','Select the lamp and compare V, I and P. Raise the battery emf: with fixed resistance, doubling voltage doubles current and quadruples power. Delete a lead to open the circuit.'],['Series: one path','Select each resistor. Both carry the same current; voltage drops add to terminal voltage. Change either resistance and observe both currents.'],['Parallel: shared voltage','Both resistors span the same pair of nodes. Compare branch currents and verify that their sum equals the battery’s supplied current.'],['Conductivity: R = ρL/A','Select the material wire. Compare copper, aluminium, nichrome and an insulator. Increase length or reduce cross-section; observe the change in current. A load limits current.'],['A current creates a field','Press Play. The compass aligns with the local field; the bead responds to its gradient. Select the coil and change its turns. Rotate into 3D and toggle field lines and vectors.']];$('cb-lesson').innerHTML=`<h3>${lessons[i][0]}</h3><p>${lessons[i][1]}</p>`;$('cb-lesson').closest('details').open=true;status('Example loaded. Undo restores your previous circuit.');}
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(raf);raf=0;last=0;if(!document.hidden&&playing&&root&&!root.hidden)raf=requestAnimationFrame(tick);});
window.CircuitLab={open,close,getState:()=>({parts:JSON.parse(JSON.stringify(parts)),wires:JSON.parse(JSON.stringify(wires)),playing,elapsed,readings,mode}),loadExample:lesson};
})();
