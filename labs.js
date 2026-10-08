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
            description: 'Build your own circuits from a blank canvas. Connect components, measure electricity, and explore magnetic fields in 3D.',
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
    const numberFormat=new Intl.NumberFormat('en-US',{maximumFractionDigits:3});
    const fmt=n=>numberFormat.format(Math.abs(n)<.0005?0:n);
    const metricValues=new Float64Array(6),metricUnits=new Array(6),metricNodes=new Array(6),sample={};
    let clockNode;
    const controlValue = (n,step) => n.toFixed(step<.1 ? 2 : step<1 ? 1 : 0);
    const $ = id => document.getElementById(id);
    let active=null, params={}, time=0, playing=false, speed=1, frame=0, last=0, lastReadout=0, captures=[];
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
            const card=document.createElement('button');card.type='button';card.dataset.lab=id;card.className='sim-card active-sim new-sim-card';card.id=`card-${id}-sim`;card.style.setProperty('--lab-accent',colors[id]);
            card.innerHTML=`<span class="card-preview"><svg viewBox="0 0 200 100" class="preview-svg" aria-hidden="true">${preview(id)}</svg><span class="status-badge badge-active">ENTER LAB</span></span><span class="card-info"><span class="syllabus-tag">${d.topic}</span><span class="sim-title">${d.title}</span><span class="sim-desc">${d.description}</span></span>`;
            card.addEventListener('click',()=>id==='circuits'?window.CircuitLab.open():open(id));gridEl.append(card);
        });
        document.querySelector('.hero-subtitle').textContent='Six interactive laboratories. Explore forces, fields, circuits, waves, and oscillations with live measurements and guided experiments.';
        const note=document.createElement('p');note.className='curriculum-note';note.innerHTML='Selected concepts from IB DP Physics · Independent learning resource, not endorsed by the IB. <a href="https://www.ibo.org/globalassets/new-structure/university-admission/pdfs/subject-guides/physics-guide.pdf" target="_blank" rel="noopener">Curriculum reference ↗</a>';gridEl.after(note);
        const view=document.createElement('section');view.id='extended-lab';view.hidden=true;document.body.append(view);
        document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);last=0;if(!document.hidden&&active&&playing)frame=requestAnimationFrame(tick);});
    }
    function close(){window.CircuitLab?.close();cancelAnimationFrame(frame);frame=0;playing=false;active=null;LabRenderer.close();const el=$('extended-lab');if(el)el.hidden=true;}
    function open(id){
        close();cancelAnimationFrame(animationFrameId);state.activeView='extended';state.isPlaying=false;state.projectile.isFlying=false;updateEngineHum();
        DOM.homeView.style.display='none';DOM.simView.style.display='none';DOM.projectileView.style.display='none';
        active=id;params={...definitions[id].defaults};time=0;speed=1;captures=[];
        const d=definitions[id],view=$('extended-lab');view.hidden=false;view.dataset.lab=id;view.style.setProperty('--lab-accent',colors[id]);
        view.innerHTML=`<header class="lab-header"><button class="lab-back" id="lab-back">← All labs</button><div><p class="lab-eyebrow">${d.topic}</p><h1 tabindex="-1" id="lab-title">${d.title}</h1></div><span class="lab-brand" data-theme-brand><span class="brand-name">PhysicsSim <b>HD</b></span></span></header>
        <div class="lab-layout"><aside class="lab-controls"><h2>Configure experiment</h2><div class="lab-presets" aria-label="Experiment presets">${d.presets.map((p,i)=>`<button data-preset="${i}">${p[0]}</button>`).join('')}</div>
        ${id==='circuits'?`<label class="lab-select-label" for="lab-topology">Circuit arrangement</label><select id="lab-topology"><option value="series">Series</option><option value="parallel">Parallel</option></select><label class="lab-check"><input id="lab-closed" type="checkbox" checked> Close switch</label>`:''}
        ${id==='waves'?`<label class="lab-select-label" for="lab-direction">Wave 2 direction</label><select id="lab-direction"><option value="same">Right → (same direction)</option><option value="opposite">Left ← (opposite direction)</option></select>`:''}
        ${d.controls.map(([key,text,min,max,step,unit])=>`<div class="lab-control"><div><label for="lab-${key}">${text}</label><output id="out-${key}" for="lab-${key}"></output></div><input id="lab-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${params[key]}" aria-describedby="unit-${key}"><span class="range-extents" id="unit-${key}">${min}–${max} ${unit}</span></div>`).join('')}
        <div class="lab-transport"><button id="lab-play" class="primary-action">▶ Play</button><button id="lab-step">Step</button><button id="lab-reset">Reset</button></div><label class="lab-select-label" for="lab-playback-speed">Playback speed</label><select id="lab-playback-speed"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select><p class="lab-small">${id==='gravity'?'At 1×, one second represents 180 seconds in orbit.':'At 1×, one second represents one simulated second.'} Changing a variable pauses and resets time. Step advances ${id==='gravity'?'18':'0.1'} s.</p></aside>
        <main class="lab-workspace"><div class="scene-heading"><span>${d.kicker}</span><span id="lab-clock">t = 0.00 s · Paused</span></div><div class="lab-scene" id="lab-scene"></div><div class="lab-legend" id="lab-legend"></div><section class="lab-chart-panel"><h2>${d.chartTitle}</h2><div id="lab-chart"></div><p>${d.chartNote}</p></section><section class="lab-investigate"><span class="lab-eyebrow">TRY AN EXPERIMENT</span><p>${d.experiment}</p></section></main>
        <aside class="lab-results"><h2>Live measurements</h2><div class="lab-metrics" id="lab-metrics">${d.metrics(params,0).map(([name],i)=>`<div><span>${name}</span><strong id="metric-${i}"></strong></div>`).join('')}</div><div class="capture-header"><h2>Observations</h2><button id="lab-capture">Record</button><button id="lab-export">Export CSV</button></div><p class="lab-small">Record up to 8 snapshots to compare settings.</p><div id="lab-observations" aria-live="polite"><p class="lab-empty">No readings recorded yet.</p></div><details open class="lab-reference"><summary>Understand the model</summary><p>${d.explanation}</p><div class="lab-equations">${d.equations.map(e=>`<p>${e}</p>`).join('')}</div><p class="lab-small">${d.assumptions}</p></details></aside></div>`;
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
        $('lab-export').onclick=()=>{
            if(!captures.length){$('lab-observations').innerHTML='<p class="lab-empty">Record a reading first, then export.</p>';return;}
            const rows=[['Time (s)',...captures[0].metrics.map(([n,,u])=>`${n} (${u})`)],...captures.map(c=>[c.time,...c.metrics.map(([,v])=>v)])];
            const blob=new Blob([rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n')],{type:'text/csv'});
            const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${active}-observations.csv`;a.click();requestAnimationFrame(()=>URL.revokeObjectURL(url));
        };
        const metrics=d.metrics(params,0);
        for(let i=0;i<6;i++){metricNodes[i]=$('metric-'+i);metricUnits[i]=metrics[i][2];}clockNode=$('lab-clock');
        Theme.mount(view);positionTransport();restart();window.scrollTo(0,0);$('lab-title').focus({preventScroll:true});
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
    function tick(now){if(!active||!playing||document.hidden)return;if(last)time+=Math.min((now-last)/1000,.05)*definitions[active].clock*speed;last=now;renderScene();if(now-lastReadout>100){updateReadouts();lastReadout=now;}frame=requestAnimationFrame(tick);}
    function updateReadouts(){
        if(!active)return;
        const v=metricValues,q=sample;
        if(active==='gravity'){M.gravity(params,time,q);v[0]=q.g;v[1]=q.speed/1000;v[2]=q.period/60;v[3]=q.potential/1e6;v[4]=q.force;v[5]=q.energy/1e9;}
        else if(active==='waves'){M.wave(params,params.probe,time,q);v[0]=q.wavelength;v[1]=q.period;v[2]=q.y1;v[3]=q.y2;v[4]=q.y;v[5]=params.probe;}
        else if(active==='shm'){M.shm(params,time,q);v[0]=q.period;v[1]=q.x;v[2]=q.v;v[3]=q.a;v[4]=q.kinetic;v[5]=q.potential;}
        else {M.circuit(params,q);v[0]=q.current;v[1]=q.resistance;v[2]=q.terminal;v[3]=q.i1;v[4]=q.i2;v[5]=q.sourcePower;}
        LabRenderer.setReadouts(q);
        for(let i=0;i<6;i++)metricNodes[i].textContent=fmt(v[i])+' '+metricUnits[i];
        clockNode.textContent='t = '+time.toFixed(2)+' s · '+(playing?'Running':'Paused');
    }
    function render(){LabRenderer.configure(active,params);updateReadouts();renderScene();}
    function renderCaptures(){const el=$('lab-observations');if(!captures.length){el.innerHTML='<p class="lab-empty">No readings recorded yet.</p>';return;}el.innerHTML=captures.map((r,i)=>`<details class="lab-snapshot"><summary>Reading ${captures.length-i} · ${r.time.toFixed(2)} s</summary><p>${Object.entries(r.params).map(([k,v])=>{const c=definitions[active].controls.find(c=>c[0]===k);return c?`${c[1]}: ${v} ${c[5]}`:k==='closed'?`Switch: ${v?'closed':'open'}`:`${k==='topology'?'Arrangement':'Direction'}: ${v}`;}).join(' · ')}</p><dl>${r.metrics.map(([k,v,u])=>`<div><dt>${k}</dt><dd>${fmt(v)} ${u}</dd></div>`).join('')}</dl></details>`).join('');}
    function renderScene(){LabRenderer.draw(time);}
    document.addEventListener('themechange',()=>{if(active)render();});
    window.PhysicsLabs={open,close,definitions,getState:()=>({active,params:{...params},time,playing,speed,captures:captures.length})};
    window.addEventListener('DOMContentLoaded',init);
})();
