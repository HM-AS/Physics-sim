/* Four labs share controls and lifecycle; each keeps an independently testable model. */
(() => {
    'use strict';
    const M = window.PhysicsModels;
    const colors = { gravity: '#38bdf8', circuits: '#fbbf24', waves: '#2dd4bf', shm: '#c084fc' };
    const definitions = {
        gravity: {
            title: 'Gravitational Fields', topic: 'D.1 · Gravitational fields', kicker: 'FIELDS & ORBITS',
            description: 'Explore inverse-square fields, gravitational potential, and circular satellite orbits.',
            defaults: { mass: 1, radius: 2, satellite: 500 }, clock: 180,
            controls: [ ['mass', 'Central mass', .1, 5, .1, 'M⊕'], ['radius', 'Orbital radius from centre', 1.1, 8, .1, 'R⊕'], ['satellite', 'Satellite mass', 100, 2000, 100, 'kg'] ],
            presets: [ ['Near Earth', { mass: 1, radius: 1.1, satellite: 500 }], ['Double radius', { mass: 1, radius: 2.2, satellite: 500 }], ['Stronger field', { mass: 2, radius: 2.2, satellite: 500 }] ],
            experiment: 'Compare Near Earth with Double radius. Predict how g, orbital speed, and period change before reading the measurements. Then double the central mass.',
            explanation: 'Outside a spherical body, its field is equivalent to that of a point mass at its centre. Gravity provides the centripetal force for this circular orbit.',
            equations: ['g = GM / r²', 'V = −GM / r', 'v = √(GM / r)', 'T = 2π√(r³ / GM)'],
            assumptions: 'Spherical central body with a fixed Earth radius; test satellite in a circular orbit. No atmosphere or other bodies. Arrow lengths are illustrative. M⊕ = 5.972 × 10²⁴ kg; R⊕ = 6,371 km.',
            chartTitle: 'Field strength against radius', chartNote: 'The marker shows the current orbit. Radius is measured from the centre.',
            metrics(p,t) { const q=M.gravity(p,t); return [['Field strength',q.g,'N/kg'],['Circular speed',q.speed/1000,'km/s'],['Orbital period',q.period/60,'min'],['Potential',q.potential/1e6,'MJ/kg'],['Force on satellite',q.force,'N'],['Orbital energy',q.energy/1e9,'GJ']]; }
        },
        circuits: {
            title: 'Current & Circuits', topic: 'B.5 · Current and circuits', kicker: 'ELECTRICITY',
            description: 'Build series and parallel resistor circuits. Measure current, voltage, and power.',
            defaults: { voltage: 12, r1: 10, r2: 20, internal: 0, topology: 'series', closed: true }, clock: 1,
            controls: [ ['voltage','Battery emf',0,24,.5,'V'], ['r1','Resistance R₁',1,100,1,'Ω'], ['r2','Resistance R₂',1,100,1,'Ω'], ['internal','Internal resistance',0,10,.5,'Ω'] ],
            presets: [ ['Series', { voltage:12,r1:10,r2:20,internal:0,topology:'series',closed:true }], ['Parallel', { voltage:12,r1:10,r2:20,internal:0,topology:'parallel',closed:true }], ['Real battery', { voltage:12,r1:10,r2:20,internal:2,topology:'parallel',closed:true }] ],
            experiment: 'Compare Series and Parallel with the same resistors. Check how current divides and voltage is shared. Try Real battery to investigate lost volts and internal heating.',
            explanation: 'Series components carry the same current. Parallel branches share the same potential difference. Internal resistance lowers terminal voltage when current flows.',
            equations: ['I = ε / (Rₑq + r)', 'Vterminal = ε − Ir', 'Rseries = R₁ + R₂', '1 / Rparallel = 1 / R₁ + 1 / R₂', 'P = IV = I²R'],
            assumptions: 'Steady DC with ideal wires, fixed ohmic resistors, and a battery with adjustable internal resistance. Dots indicate conventional current; their motion is illustrative, not electron drift speed.',
            chartTitle: 'Power balance', chartNote: 'Source power equals the power dissipated in both resistors and inside the battery.',
            metrics(p) {const q=M.circuit(p);return [['Total current',q.current,'A'],['Load resistance',q.resistance,'Ω'],['Terminal voltage',q.terminal,'V'],['Current I₁',q.i1,'A'],['Current I₂',q.i2,'A'],['Source power',q.sourcePower,'W']];}
        },
        waves: {
            title: 'Wave Superposition', topic: 'C.2 / C.3 · Waves and wave phenomena', kicker: 'WAVES',
            description: 'Combine two travelling waves and investigate phase, cancellation, and standing waves.',
            defaults: { a1: 1, a2: 1, frequency: .5, speed: 3, phase: 0, direction:'same', probe:3 }, clock:1,
            controls: [ ['a1','Amplitude A₁',0,2,.1,'m'], ['a2','Amplitude A₂',0,2,.1,'m'], ['frequency','Frequency',.2,2,.1,'Hz'], ['speed','Wave speed',1,6,.5,'m/s'], ['phase','Relative phase',0,360,15,'°'], ['probe','Probe position',0,12,.1,'m'] ],
            presets: [ ['Constructive',{a1:1,a2:1,frequency:.5,speed:3,phase:0,direction:'same',probe:3}], ['Destructive',{a1:1,a2:1,frequency:.5,speed:3,phase:180,direction:'same',probe:3}], ['Standing wave',{a1:1,a2:1,frequency:.5,speed:3,phase:0,direction:'opposite',probe:3}] ],
            experiment: 'Use Destructive to see equal waves cancel everywhere. Switch to Standing wave, then move the probe between a node and an antinode. Change frequency and observe node spacing.',
            explanation: 'Displacements add algebraically. Equal-frequency waves travelling in opposite directions form a standing wave when their amplitudes match.',
            equations: ['λ = v / f', 'y₁ = A₁ sin(kx − ωt)', 'y₂ = A₂ sin(kx ∓ ωt + φ)', 'y = y₁ + y₂;  k = 2π / λ'],
            assumptions: 'Two continuous sinusoidal waves in a linear, non-dispersive medium. No damping or boundaries. The opposing wave uses +ωt; phase is specified at x = 0, t = 0.',
            chartTitle: 'Displacement at the probe', chartNote: 'One cycle of the resultant at the selected position. The dot marks the current phase.',
            metrics(p,t) {const q=M.wave(p,p.probe,t);return [['Wavelength',q.wavelength,'m'],['Period',q.period,'s'],['Wave 1 at probe',q.y1,'m'],['Wave 2 at probe',q.y2,'m'],['Resultant at probe',q.y,'m'],['Probe position',p.probe,'m']];}
        },
        shm: {
            title: 'Simple Harmonic Motion', topic: 'C.1 · Simple harmonic motion', kicker: 'OSCILLATIONS',
            description: 'Investigate a spring–mass oscillator and the exchange between kinetic and potential energy.',
            defaults: {mass:1,stiffness:20,amplitude:.5}, clock:1,
            controls: [['mass','Oscillating mass',.2,5,.1,'kg'],['stiffness','Spring constant',2,80,1,'N/m'],['amplitude','Amplitude',.05,1,.05,'m']],
            presets: [['Reference',{mass:1,stiffness:20,amplitude:.5}],['Heavier mass',{mass:4,stiffness:20,amplitude:.5}],['Larger amplitude',{mass:1,stiffness:20,amplitude:1}]],
            experiment: 'Compare Reference with Heavier mass: does four times the mass double the period? Try Larger amplitude to test whether period depends on amplitude. Pause and step through an equilibrium crossing.',
            explanation: 'The restoring force points toward equilibrium and is proportional to displacement. Energy transfers between the spring and the moving mass while total energy stays constant.',
            equations: ['F = −kx;  a = −ω²x', 'ω = √(k / m);  T = 2π√(m / k)', 'x = A cos(ωt)', 'E = ½kA² = ½kx² + ½mv²'],
            assumptions: 'Horizontal frictionless surface, massless Hooke’s-law spring, no damping. Released from rest at x = +A. Changing a variable resets time to this release point.',
            chartTitle: 'Displacement through two cycles', chartNote: 'At equilibrium, speed is greatest and acceleration is zero. At a turning point, velocity is zero.',
            metrics(p,t) {const q=M.shm(p,t);return [['Period',q.period,'s'],['Displacement',q.x,'m'],['Velocity',q.v,'m/s'],['Acceleration',q.a,'m/s²'],['Kinetic energy',q.kinetic,'J'],['Potential energy',q.potential,'J']];}
        }
    };
    const fmt = n => (Math.abs(n)<.0005 ? 0 : n).toLocaleString('en-US',{maximumFractionDigits:3});
    const controlValue = (n,step) => n.toFixed(step<.1 ? 2 : step<1 ? 1 : 0);
    const $ = id => document.getElementById(id);
    let active=null, params={}, time=0, playing=false, speed=1, frame=0, last=0, lastReadout=0, lastDraw=0, captures=[];
    const svgNS='http://www.w3.org/2000/svg';
    const svg = content => `<svg viewBox="0 0 720 430" role="img" aria-labelledby="scene-title"><title id="scene-title">${definitions[active].title} diagram</title>${content}</svg>`;
    const line=(x1,y1,x2,y2,color='#50617a',extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" ${extra}/>`;
    const label=(x,y,text,color='#aab9ce',extra='')=>`<text x="${x}" y="${y}" fill="${color}" font-size="14" ${extra}>${text}</text>`;
    const circle=(x,y,r,fill,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
    function arrow(x,y,dx,dy,color){const a=Math.atan2(dy,dx),ex=x+dx,ey=y+dy;return line(x,y,ex,ey,color)+`<path d="M${ex-9*Math.cos(a-.45)},${ey-9*Math.sin(a-.45)} L${ex},${ey} L${ex-9*Math.cos(a+.45)},${ey-9*Math.sin(a+.45)}" fill="none" stroke="${color}" stroke-width="2"/>`;}
    function curve(fn,x0,x1,y0,scale,range=12,n=180){let d='';for(let i=0;i<=n;i++){const x=range*i/n;d+=`${i?'L':'M'}${(x0+(x1-x0)*i/n).toFixed(2)},${(y0-fn(x)*scale).toFixed(2)} `;}return d;}
    function path(d,color,width=2,extra=''){return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" ${extra}/>`;}
    function grid(){let s='';for(let x=30;x<720;x+=30)s+=line(x,20,x,410,'#131e30');for(let y=20;y<430;y+=30)s+=line(20,y,700,y,'#131e30');return s;}
    function preview(id){
        if(id==='gravity')return `<ellipse cx="100" cy="52" rx="65" ry="32" fill="none" stroke="#38bdf8" stroke-width="1.5"/><circle cx="100" cy="52" r="15" fill="#0369a1"/><circle cx="160" cy="40" r="6" fill="#7dd3fc"/>`;
        if(id==='circuits')return `<path d="M30 55V25H78V18H112V32H78V25M112 25H170V75H30V55M20 48H40M24 58H36" fill="none" stroke="#fbbf24" stroke-width="3"/><circle cx="148" cy="25" r="4" fill="#fde68a"/>`;
        if(id==='waves')return `<path d="M10 50Q30 5 50 50T90 50T130 50T170 50T210 50" fill="none" stroke="#2dd4bf" stroke-width="3"/><path d="M10 50Q30 85 50 50T90 50T130 50T170 50T210 50" fill="none" stroke="#818cf8" stroke-width="2"/>`;
        return `<path d="M20 25V75M20 50H35L42 35L54 65L66 35L78 65L90 35L102 65L110 50H130" fill="none" stroke="#c084fc" stroke-width="3"/><rect x="130" y="32" width="40" height="36" rx="5" fill="#9333ea"/>`;
    }
    function init(){
        document.querySelectorAll('.locked-sim').forEach(el=>el.remove());
        const gridEl=document.querySelector('.sims-grid');
        Object.entries(definitions).forEach(([id,d])=>{
            const card=document.createElement('button');card.type='button';card.className='sim-card active-sim new-sim-card';card.id=`card-${id}-sim`;card.style.setProperty('--lab-accent',colors[id]);
            card.innerHTML=`<span class="card-preview"><svg viewBox="0 0 200 100" class="preview-svg" aria-hidden="true">${preview(id)}</svg><span class="status-badge badge-active">ENTER LAB</span></span><span class="card-info"><span class="syllabus-tag">${d.topic}</span><span class="sim-title">${d.title}</span><span class="sim-desc">${d.description}</span></span>`;
            card.addEventListener('click',()=>open(id));gridEl.append(card);
        });
        document.querySelector('.hero-subtitle').textContent='Six interactive laboratories. Explore forces, fields, circuits, waves, and oscillations with live measurements and guided experiments.';
        const note=document.createElement('p');note.className='curriculum-note';note.innerHTML='Selected concepts from IB DP Physics · Independent learning resource, not endorsed by the IB. <a href="https://www.ibo.org/globalassets/new-structure/university-admission/pdfs/subject-guides/physics-guide.pdf" target="_blank" rel="noopener">Curriculum reference ↗</a>';gridEl.after(note);
        const view=document.createElement('section');view.id='extended-lab';view.hidden=true;document.body.append(view);
        document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);last=0;if(!document.hidden&&active&&playing)frame=requestAnimationFrame(tick);});
    }
    function close(){cancelAnimationFrame(frame);frame=0;playing=false;active=null;const el=$('extended-lab');if(el)el.hidden=true;}
    function open(id){
        close();cancelAnimationFrame(animationFrameId);state.activeView='extended';state.isPlaying=false;state.projectile.isFlying=false;updateEngineHum();
        DOM.homeView.style.display='none';DOM.simView.style.display='none';DOM.projectileView.style.display='none';
        active=id;params={...definitions[id].defaults};time=0;speed=1;captures=[];
        const d=definitions[id],view=$('extended-lab');view.hidden=false;view.style.setProperty('--lab-accent',colors[id]);
        view.innerHTML=`<header class="lab-header"><button class="lab-back" id="lab-back">← All labs</button><div><p class="lab-eyebrow">${d.topic}</p><h1 tabindex="-1" id="lab-title">${d.title}</h1></div><span class="lab-brand">PhysicSim <b>HD</b></span></header>
        <div class="lab-layout"><aside class="lab-controls"><h2>Configure experiment</h2><div class="lab-presets" aria-label="Experiment presets">${d.presets.map((p,i)=>`<button data-preset="${i}">${p[0]}</button>`).join('')}</div>
        ${id==='circuits'?`<label class="lab-select-label" for="lab-topology">Circuit arrangement</label><select id="lab-topology"><option value="series">Series</option><option value="parallel">Parallel</option></select><label class="lab-check"><input id="lab-closed" type="checkbox" checked> Close switch</label>`:''}
        ${id==='waves'?`<label class="lab-select-label" for="lab-direction">Wave 2 direction</label><select id="lab-direction"><option value="same">Right → (same direction)</option><option value="opposite">Left ← (opposite direction)</option></select>`:''}
        ${d.controls.map(([key,text,min,max,step,unit])=>`<div class="lab-control"><div><label for="lab-${key}">${text}</label><output id="out-${key}" for="lab-${key}"></output></div><input id="lab-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${params[key]}" aria-describedby="unit-${key}"><span class="range-extents" id="unit-${key}">${min}–${max} ${unit}</span></div>`).join('')}
        <div class="lab-transport"><button id="lab-play" class="primary-action">▶ Play</button><button id="lab-step">Step</button><button id="lab-reset">Reset</button></div><label class="lab-select-label" for="lab-playback-speed">Playback speed</label><select id="lab-playback-speed"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select><p class="lab-small">${id==='gravity'?'At 1×, one second represents 180 seconds in orbit.':'At 1×, one second represents one simulated second.'} Changing a variable pauses and resets time. Step advances ${id==='gravity'?'18':'0.1'} s.</p></aside>
        <main class="lab-workspace"><div class="scene-heading"><span>${d.kicker}</span><span id="lab-clock">t = 0.00 s · Paused</span></div><div class="lab-scene" id="lab-scene"></div><div class="lab-legend" id="lab-legend"></div><section class="lab-chart-panel"><h2>${d.chartTitle}</h2><div id="lab-chart"></div><p>${d.chartNote}</p></section><section class="lab-investigate"><span class="lab-eyebrow">TRY AN EXPERIMENT</span><p>${d.experiment}</p></section></main>
        <aside class="lab-results"><h2>Live measurements</h2><div class="lab-metrics" id="lab-metrics">${d.metrics(params,0).map(([name],i)=>`<div><span>${name}</span><strong id="metric-${i}"></strong></div>`).join('')}</div><div class="capture-header"><h2>Observations</h2><button id="lab-capture">Record</button></div><p class="lab-small">Record up to 8 snapshots to compare settings.</p><div id="lab-observations" aria-live="polite"><p class="lab-empty">No readings recorded yet.</p></div><details open class="lab-reference"><summary>Understand the model</summary><p>${d.explanation}</p><div class="lab-equations">${d.equations.map(e=>`<p>${e}</p>`).join('')}</div><p class="lab-small">${d.assumptions}</p></details></aside></div>`;
        $('lab-back').onclick=()=>{close();navigateToHome();$(`card-${id}-sim`).focus();};
        d.controls.forEach(([key])=>$(`lab-${key}`).addEventListener('input',e=>{params[key]=Number(e.target.value);restart();}));
        ['topology','direction'].forEach(key=>{if($(`lab-${key}`))$(`lab-${key}`).onchange=e=>{params[key]=e.target.value;restart();};});
        if($('lab-closed'))$('lab-closed').onchange=e=>{params.closed=e.target.checked;restart();};
        view.querySelectorAll('[data-preset]').forEach(btn=>btn.onclick=()=>{params={...d.defaults,...d.presets[Number(btn.dataset.preset)][1]};restart();});
        $('lab-play').onclick=()=>setPlaying(!playing);
        $('lab-step').onclick=()=>{setPlaying(false);time+=.1*d.clock;render();};
        $('lab-reset').onclick=()=>{params={...d.defaults};speed=1;$('lab-playback-speed').value='1';captures=[];renderCaptures();restart();};
        $('lab-playback-speed').onchange=e=>{speed=Number(e.target.value);last=0;};
        $('lab-capture').onclick=()=>{captures.unshift({time,params:{...params},metrics:d.metrics(params,time)});captures=captures.slice(0,8);renderCaptures();};
        positionTransport();restart();window.scrollTo(0,0);$('lab-title').focus({preventScroll:true});
    }
    function positionTransport(){
        const transport=document.querySelector('#extended-lab .lab-transport');
        if(!transport)return;
        if(window.matchMedia('(max-width:700px)').matches) $('lab-scene').after(transport);
        else $('lab-playback-speed').previousElementSibling.before(transport);
    }
    window.addEventListener('resize',positionTransport);
    function restart(){setPlaying(false);time=0;syncControls();render();}
    function syncControls(){
        const d=definitions[active];d.controls.forEach(([key,,min,max,step,unit])=>{$(`lab-${key}`).value=params[key];$(`out-${key}`).textContent=`${controlValue(params[key],step)} ${unit}`;});
        ['topology','direction'].forEach(k=>{if($(`lab-${k}`))$(`lab-${k}`).value=params[k];});if($('lab-closed'))$('lab-closed').checked=params.closed;
        document.querySelectorAll('[data-preset]').forEach(btn=>{const p={...d.defaults,...d.presets[Number(btn.dataset.preset)][1]};btn.setAttribute('aria-pressed',String(Object.keys(p).every(k=>p[k]===params[k])));});
    }
    function setPlaying(value){playing=value;cancelAnimationFrame(frame);frame=0;last=0;$('lab-play').textContent=playing?'Ⅱ Pause':'▶ Play';$('lab-play').setAttribute('aria-pressed',String(playing));updateReadouts();if(playing&&!document.hidden)frame=requestAnimationFrame(tick);}
    function tick(now){if(!active||!playing||document.hidden)return;if(last)time+=Math.min((now-last)/1000,.05)*definitions[active].clock*speed;last=now;if(now-lastDraw>=1000/30){renderScene();lastDraw=now;}if(now-lastReadout>100){updateReadouts();if(active==='waves'||active==='shm')renderChart();lastReadout=now;}frame=requestAnimationFrame(tick);}
    function updateReadouts(){if(!active)return;definitions[active].metrics(params,time).forEach(([,v,u],i)=>{$(`metric-${i}`).textContent=`${fmt(v)} ${u}`;});$('lab-clock').textContent=`t = ${time.toFixed(2)} s · ${playing?'Running':'Paused'}`;}
    function render(){renderScene();renderChart();updateReadouts();}
    function renderCaptures(){const el=$('lab-observations');if(!captures.length){el.innerHTML='<p class="lab-empty">No readings recorded yet.</p>';return;}el.innerHTML=captures.map((r,i)=>`<details class="lab-snapshot"><summary>Reading ${captures.length-i} · ${r.time.toFixed(2)} s</summary><p>${Object.entries(r.params).map(([k,v])=>{const c=definitions[active].controls.find(c=>c[0]===k);return c?`${c[1]}: ${v} ${c[5]}`:k==='closed'?`Switch: ${v?'closed':'open'}`:`${k==='topology'?'Arrangement':'Direction'}: ${v}`;}).join(' · ')}</p><dl>${r.metrics.map(([k,v,u])=>`<div><dt>${k}</dt><dd>${fmt(v)} ${u}</dd></div>`).join('')}</dl></details>`).join('');}
    function renderScene(){
        const p=params;let content=grid(),legend='';
        if(active==='gravity'){
            const q=M.gravity(p,time),cx=345,cy=215,R=155,body=R/p.radius;
            for(let a=0;a<Math.PI*2;a+=Math.PI/6){const x=cx+185*Math.cos(a),y=cy+185*Math.sin(a);content+=arrow(x,y,-22*Math.cos(a),-22*Math.sin(a),'#265271');}
            content+=circle(cx,cy,R,'none','stroke="#37617e" stroke-dasharray="5 6"');
            content+=circle(cx,cy,body,'#123f61','stroke="#38bdf8" stroke-width="2"');
            content+=label(cx,cy+5,'M','#bceaff','text-anchor="middle"');
            const a=q.angle,x=cx+R*Math.cos(a),y=cy-R*Math.sin(a);
            content+=line(cx,cy,x,y,'#527386','stroke-dasharray="4 5"');
            content+=arrow(x,y,-48*Math.cos(a),48*Math.sin(a),'#fb7185');
            content+=arrow(x,y,-42*Math.sin(a),-42*Math.cos(a),'#34d399');
            content+=circle(x,y,7,'#e0f2fe','stroke="#38bdf8" stroke-width="3"');
            content+=label(34,38,`r = ${p.radius.toFixed(1)} R⊕`,'#7dd3fc')+label(34,402,`Altitude: ${fmt((q.r-M.EARTH_RADIUS)/1000)} km`);
            legend='<span style="--key:#fb7185">Gravitational force (inward)</span><span style="--key:#34d399">Velocity (tangent)</span>';
        }else if(active==='circuits'){
            const q=M.circuit(p),wire='#6b829a';
            const resistor=(x,y,r,name,v)=>`${line(x-45,y,x-27,y,wire)}<rect x="${x-27}" y="${y-13}" width="54" height="26" rx="3" fill="#372a12" stroke="#fbbf24" stroke-width="2"/>${line(x+27,y,x+45,y,wire)}${label(x,y-25,`${name}: ${r} Ω`,'#fde68a','text-anchor="middle"')}${label(x,y+38,`${fmt(v)} V`,'#aab9ce','text-anchor="middle"')}`;
            content+=path('M100 186 V105 H245 M295 105 H620 V330 H100 V225',wire,3);
            content+=line(83,188,117,188,'#fde68a')+line(91,201,109,201,'#fde68a')+line(100,201,100,212,wire)+line(83,212,117,212,'#fde68a')+line(91,225,109,225,'#fde68a');
            content+=label(40,178,'+','#fbbf24')+label(40,246,'−','#fbbf24')+label(35,285,`ε = ${fmt(p.voltage)} V`,'#fbbf24');
            content+=circle(245,105,4,'#e2e8f0')+circle(295,105,4,'#e2e8f0')+line(245,105,293,p.closed?105:76,'#e2e8f0');
            content+=label(270,55,p.closed?'SWITCH CLOSED':'SWITCH OPEN','#cbd5e1','text-anchor="middle"');
            if(p.topology==='series'){
                content+=`<rect x="342" y="95" width="90" height="20" fill="#0b1220"/>`+resistor(387,105,p.r1,'R₁',q.v1);
                content+=`<rect x="470" y="95" width="90" height="20" fill="#0b1220"/>`+resistor(515,105,p.r2,'R₂',q.v2);
                content+=label(370,235,`I₁ = I₂ = ${fmt(q.current)} A`,'#fbbf24','text-anchor="middle"');
            }else{
                // Erase the top conductor between nodes and replace it with two branches.
                content+=`<rect x="320" y="94" width="270" height="22" fill="#0b1220"/>`;
                content+=path('M320 105 V175 H415 M505 175 H590 V105 M320 105 V270 H415 M505 270 H590 V105',wire,3);
                content+=resistor(460,175,p.r1,'R₁',q.v1)+resistor(460,270,p.r2,'R₂',q.v2);
                content+=label(328,160,`I₁ ${fmt(q.i1)} A`,'#fbbf24')+label(328,255,`I₂ ${fmt(q.i2)} A`,'#fbbf24');
                [320,590].forEach(x=>content+=circle(x,105,4,'#e2e8f0'));
            }
            // Internal resistance is represented in the return conductor.
            content+=`<rect x="225" y="320" width="92" height="20" fill="#0b1220"/>`+resistor(270,330,p.internal,'r',q.current*p.internal);
            if(q.current>0){
                const phase=(time*Math.min(2,q.current)*.35)%1;
                for(let i=0;i<5;i++){const u=(phase+i/5)%1;content+=circle(105+u*125,105,3,'#fbbf24');content+=circle(615-u*275,330,3,'#fbbf24');}
                content+=arrow(150,88,45,0,'#fbbf24');
            }
            content+=label(38,402,`Vterminal = ${fmt(q.terminal)} V · ${p.closed?'Load connected':'No current; full emf across open circuit'}`);
            legend='<span style="--key:#fbbf24">Conventional current + → − through load</span><span style="--key:#6b829a">Ideal connecting wires</span>';
        }else if(active==='waves'){
            const rows=[{y:95,key:'y1',name:'Wave 1 →',c:'#38bdf8'},{y:205,key:'y2',name:`Wave 2 ${p.direction==='same'?'→':'←'}`,c:'#c084fc'},{y:335,key:'y',name:'Resultant',c:'#2dd4bf'}];
            rows.forEach(({y,key,name,c})=>{
                content+=line(65,y,680,y,'#45536b')+label(25,y-46,name,c);
                content+=path(curve(x=>M.wave(p,x,time)[key],65,680,y,20),c,2.5);
                const px=65+p.probe/12*615,py=y-M.wave(p,p.probe,time)[key]*20;
                content+=line(px,y-44,px,y+44,'#a3b5c9','stroke-dasharray="3 5"')+circle(px,py,4,c);
            });
            for(let x=0;x<=12;x+=2)content+=label(65+x/12*615,413,`${x} m`,'#9bacc3','text-anchor="middle"');
            content+=label(680,28,'All waves use the same displacement scale','#9bacc3','text-anchor="end"');
            legend='<span style="--key:#38bdf8">Wave 1</span><span style="--key:#c084fc">Wave 2</span><span style="--key:#2dd4bf">Algebraic sum</span>';
        }else{
            const q=M.shm(p,time),eq=385,block=eq+q.x*200,y=170;
            content+=line(65,105,65,225,'#aab9ce')+line(65,211,670,211,'#50617a');
            let spring=`M65 ${y} L85 ${y}`;const length=block-32-85;
            for(let i=1;i<=16;i++)spring+=` L${85+length*i/17} ${y+(i%2?15:-15)}`;spring+=` L${block-32} ${y}`;
            content+=path(spring,'#c084fc',3)+line(eq,75,eq,244,'#71829a','stroke-dasharray="5 5"');
            content+=`<rect x="${block-32}" y="138" width="64" height="64" rx="8" fill="#6b21a8" stroke="#d8b4fe" stroke-width="2"/>`+label(block,176,`${fmt(p.mass)} kg`,'#fff','text-anchor="middle"');
            if(Math.abs(q.x)>.001)content+=arrow(block,115,-q.x/p.amplitude*65,0,'#fb7185');
            content+=label(eq,265,'Equilibrium, x = 0','#aab9ce','text-anchor="middle"')+label(34,36,`x = ${fmt(q.x)} m`,'#d8b4fe');
            const total=q.energy;
            [['Kinetic',q.kinetic,'#38bdf8'],['Potential',q.potential,'#c084fc']].forEach(([name,val,c],i)=>{
                const yy=308+i*44;content+=label(35,yy+16,name,c)+`<rect x="150" y="${yy}" width="370" height="20" rx="5" fill="#202c40"/><rect x="150" y="${yy}" width="${370*val/total}" height="20" rx="5" fill="${c}"/>`+label(540,yy+16,`${fmt(val)} J`,c);
            });
            content+=label(35,414,`Total mechanical energy = ${fmt(total)} J (constant)`);
            legend='<span style="--key:#fb7185">Restoring force toward equilibrium</span><span style="--key:#c084fc">Displacement and spring energy</span>';
        }
        $('lab-scene').innerHTML=svg(content);if($('lab-legend').innerHTML!==legend)$('lab-legend').innerHTML=legend;
    }
    function renderChart(){
        const p=params;let s='';
        const wrap=c=>`<svg viewBox="0 0 640 180" role="img" aria-label="${definitions[active].chartTitle}">${c}</svg>`;
        if(active==='circuits'){
            const q=M.circuit(p),scale=Math.max(q.sourcePower,1);
            [['R₁',q.p1,'#fbbf24'],['R₂',q.p2,'#38bdf8'],['Internal',q.loss,'#fb7185']].forEach(([name,value,c],i)=>{const y=20+i*50;s+=label(12,y+17,name,c)+`<rect x="95" y="${y}" width="${380*value/scale}" height="22" rx="4" fill="${c}"/>`+label(495,y+17,`${fmt(value)} W`,c);});
        }else{
            s+=line(55,145,615,145)+line(55,15,55,145);
            if(active==='gravity'){
                const max=M.gravity({...p,radius:1}).g;
                s+=path(curve(x=>M.gravity({...p,radius:x+1}).g,55,615,145,115/max,7),'#38bdf8');
                const q=M.gravity(p);s+=circle(55+(p.radius-1)/7*560,145-q.g*115/max,5,'#fbbf24');
                s+=label(55,172,'1 R⊕')+label(570,172,'8 R⊕')+label(65,22,`${fmt(max)} N/kg`);
            }else if(active==='shm'){
                const q=M.shm(p,time),T=q.period;
                s+=line(55,80,615,80,'#3f4b61')+path(curve(t=>M.shm(p,t).x,55,615,80,55/p.amplitude,2*T),'#c084fc');
                s+=circle(55+(time%(2*T))/(2*T)*560,80-q.x*55/p.amplitude,5,'#e9d5ff');
                s+=label(55,172,'0 s')+label(525,172,`${fmt(2*T)} s (2T)`)+label(65,22,`+${fmt(p.amplitude)} m`);
            }else{
                const T=1/p.frequency,A=Math.max(p.a1+p.a2,.1),q=M.wave(p,p.probe,time);
                s+=line(55,80,615,80,'#3f4b61')+path(curve(t=>M.wave(p,p.probe,t).y,55,615,80,55/A,T),'#2dd4bf');
                s+=circle(55+(time%T)/T*560,80-q.y*55/A,5,'#99f6e4');
                s+=label(55,172,'0 s')+label(540,172,`${fmt(T)} s`)+label(65,22,`±${fmt(A)} m`);
            }
        }
        $('lab-chart').innerHTML=wrap(s);
    }
    window.PhysicsLabs={open,close,definitions,getState:()=>({active,params:{...params},time,playing,speed,captures:captures.length})};
    window.addEventListener('DOMContentLoaded',init);
})();
