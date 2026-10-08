/* Analytical motion at display cadence. Static diagrams/charts are rasterized on
   edits, resize, or theme changes; propagation reuses fixed typed buffers. */
(() => {
    'use strict';
    const C = Theme.palette, M = PhysicsModels;
    const samples = 616, wave1 = new Float32Array(samples), wave2 = new Float32Array(samples), phases = new Float32Array(samples);
    const sceneBase = document.createElement('canvas'), chartBase = document.createElement('canvas');
    let scene, chart, ctx, cc, bg, cb, active, p, observer, ratio = 1, currentTime = 0;
    let omega = 0, period = 1, radius = 0, totalEnergy = 1, wavePhase = 0, probeX = 0, massLabel = '', positionLabel = '', kineticLabel = '', potentialLabel = '';
    const sceneLabels = document.createElement('div'); sceneLabels.className = 'sr-only';
    function line(c,x,y,ex,ey,color,width=1) { c.beginPath();c.moveTo(x,y);c.lineTo(ex,ey);c.strokeStyle=color;c.lineWidth=width;c.stroke(); }
    function dot(c,x,y,r,color) { c.beginPath();c.arc(x,y,r,0,2*Math.PI);c.fillStyle=color;c.fill(); }
    function text(c,x,y,value,color=C.muted,align='left') { c.fillStyle=color;c.textAlign=align;c.font='14px Outfit, system-ui, sans-serif';c.fillText(value,x,y); }
    function arrow(c,x,y,dx,dy,color) {
        const a=Math.atan2(dy,dx),ex=x+dx,ey=y+dy;
        c.beginPath();c.moveTo(x,y);c.lineTo(ex,ey);c.moveTo(ex-8*Math.cos(a-.45),ey-8*Math.sin(a-.45));c.lineTo(ex,ey);c.lineTo(ex-8*Math.cos(a+.45),ey-8*Math.sin(a+.45));c.strokeStyle=color;c.lineWidth=2;c.stroke();
    }
    function size() {
        if(!scene || !scene.isConnected)return;
        ratio=Math.min(devicePixelRatio||1,2);
        const w=Math.max(1,scene.clientWidth),h=w*430/720,cw=Math.max(1,chart.clientWidth),ch=cw*180/640;
        scene.width=sceneBase.width=Math.max(1,Math.round(w*ratio));scene.height=sceneBase.height=Math.max(1,Math.round(h*ratio));
        chart.width=chartBase.width=Math.max(1,Math.round(cw*ratio));chart.height=chartBase.height=Math.max(1,Math.round(ch*ratio));
        ctx=scene.getContext('2d');cc=chart.getContext('2d');bg=sceneBase.getContext('2d');cb=chartBase.getContext('2d');
        ctx.setTransform(scene.width/720,0,0,scene.height/430,0,0);bg.setTransform(scene.width/720,0,0,scene.height/430,0,0);
        cc.setTransform(chart.width/640,0,0,chart.height/180,0,0);cb.setTransform(chart.width/640,0,0,chart.height/180,0,0);
        build();draw(currentTime);
    }
    function configure(id,params) {
        active=id;p=params;
        if(!scene || !scene.isConnected) {
            const host=document.getElementById('lab-scene');
            host.innerHTML='<canvas class="lab-render-canvas" aria-hidden="true"></canvas><svg class="sr-only" role="img" aria-label="Simulation diagram"><title>Simulation diagram; measurements and legends follow.</title></svg>';
            scene=host.querySelector('canvas');host.append(sceneLabels);
            const chartHost=document.getElementById('lab-chart');
            chartHost.innerHTML='<canvas class="lab-chart-canvas" role="img"></canvas>';chart=chartHost.firstChild;
            chart.setAttribute('aria-label',PhysicsLabs.definitions[id].chartTitle);
            observer?.disconnect();observer=new ResizeObserver(size);observer.observe(scene);observer.observe(chart);
        }
        scene.parentElement.querySelector('svg').setAttribute('aria-label',PhysicsLabs.definitions[id].title+' diagram. See live measurements and model equations.');
        if(id==='gravity') {
            const q=M.gravity(p);omega=q.speed/q.r;radius=q.r;
            sceneLabels.textContent='Satellite follows a circular orbit. The red force arrow points toward the central mass and the green velocity arrow is tangent to the orbit.';
        } else if(id==='waves') {
            omega=2*Math.PI*p.frequency;period=1/p.frequency;wavePhase=p.phase*Math.PI/180;probeX=65+p.probe/12*615;
            for(let i=0;i<samples;i++)phases[i]=2*Math.PI*p.frequency/p.speed*12*i/(samples-1);
            sceneLabels.textContent='Three plots show wave 1, wave 2, and their algebraic sum at the same displacement scale. A dashed vertical line marks the probe.';
        } else {
            massLabel=p.mass+' kg';omega=Math.sqrt(p.stiffness/p.mass);period=2*Math.PI/omega;totalEnergy=.5*p.stiffness*p.amplitude*p.amplitude;
            sceneLabels.textContent='A mass oscillates horizontally about equilibrium on a spring. The restoring force points to equilibrium. Bars show kinetic and potential energy.';
        }
        size();
    }
    function build() {
        bg.fillStyle=C.scene;bg.fillRect(0,0,720,430);
        bg.beginPath();for(let x=30;x<720;x+=30){bg.moveTo(x,20);bg.lineTo(x,410);}for(let y=20;y<430;y+=30){bg.moveTo(20,y);bg.lineTo(700,y);}bg.strokeStyle=C.grid;bg.lineWidth=1;bg.stroke();
        let legend='';
        if(active==='gravity') {
            for(let a=0;a<2*Math.PI;a+=Math.PI/6)arrow(bg,345+185*Math.cos(a),215+185*Math.sin(a),-22*Math.cos(a),-22*Math.sin(a),C.axis);
            bg.setLineDash(dash);bg.beginPath();bg.arc(345,215,155,0,2*Math.PI);bg.strokeStyle=C.axis;bg.stroke();bg.setLineDash(empty);
            dot(bg,345,215,155/p.radius,C.body);bg.beginPath();bg.arc(345,215,155/p.radius,0,2*Math.PI);bg.strokeStyle=C.blue;bg.lineWidth=2;bg.stroke();
            text(bg,345,220,'M',C.ink,'center');text(bg,34,38,'r = '+p.radius.toFixed(1)+' R⊕',C.blue);text(bg,34,402,'Altitude: '+((radius-M.EARTH_RADIUS)/1000).toFixed(0)+' km');
            legend='<span style="--key:var(--sim-red)">Gravitational force (inward)</span><span style="--key:var(--sim-teal)">Velocity (tangent)</span>';
        } else if(active==='waves') {
            for(let row=0;row<3;row++) {
                const y=row===0?95:row===1?205:335,color=row===0?C.blue:row===1?C.purple:C.teal;
                line(bg,65,y,680,y,C.axis);text(bg,25,y-46,row===0?'Wave 1 →':row===1?'Wave 2 '+(p.direction==='same'?'→':'←'):'Resultant',color);
                bg.setLineDash(dash);line(bg,probeX,y-44,probeX,y+44,C.axis);bg.setLineDash(empty);
            }
            for(let x=0;x<=12;x+=2)text(bg,65+x/12*615,413,x+' m',C.muted,'center');
            text(bg,680,28,'Same displacement scale',C.muted,'right');
            legend='<span style="--key:var(--sim-blue)">Wave 1</span><span style="--key:var(--sim-purple)">Wave 2</span><span style="--key:var(--sim-teal)">Algebraic sum</span>';
        } else {
            line(bg,65,105,65,225,C.axis,2);line(bg,65,211,670,211,C.axis,2);
            bg.setLineDash(dash);line(bg,385,75,385,244,C.axis);bg.setLineDash(empty);
            text(bg,385,265,'Equilibrium, x = 0',C.muted,'center');
            text(bg,35,324,'Kinetic',C.blue);text(bg,35,368,'Potential',C.purple);
            bg.fillStyle=C.track;bg.fillRect(150,308,370,20);bg.fillRect(150,352,370,20);
            text(bg,35,414,'Total mechanical energy = '+totalEnergy.toFixed(3)+' J (constant)');
            legend='<span style="--key:var(--sim-red)">Restoring force toward equilibrium</span><span style="--key:var(--sim-purple)">Displacement and spring energy</span>';
        }
        document.getElementById('lab-legend').innerHTML=legend;
        cb.fillStyle=C.scene;cb.fillRect(0,0,640,180);line(cb,55,145,615,145,C.axis);line(cb,55,15,55,145,C.axis);
        if(active!=='gravity')line(cb,55,80,615,80,C.grid);
        cb.beginPath();const amplitude=Math.max(p.a1+p.a2,.1);
        for(let i=0;i<=280;i++) {
            const u=i/280;
            let y;
            if(active==='gravity')y=145-115/((1+7*u)*(1+7*u));
            else if(active==='shm')y=80-55*Math.cos(4*Math.PI*u);
            else {
                const k=2*Math.PI*p.frequency/p.speed,x=k*p.probe,t=2*Math.PI*u;
                y=80-55/amplitude*(p.a1*Math.sin(x-t)+p.a2*Math.sin(x+(p.direction==='opposite'?t:-t)+wavePhase));
            }
            if(i===0)cb.moveTo(55+560*u,y);else cb.lineTo(55+560*u,y);
        }
        cb.strokeStyle=active==='gravity'?C.blue:active==='shm'?C.purple:C.teal;cb.lineWidth=2;cb.stroke();
        text(cb,55,172,active==='gravity'?'1 R⊕':'0 s');text(cb,615,172,active==='gravity'?'8 R⊕':(period*(active==='shm'?2:1)).toFixed(3)+' s',C.muted,'right');
        text(cb,65,22,active==='gravity'?(M.G*p.mass*M.EARTH_MASS/(M.EARTH_RADIUS*M.EARTH_RADIUS)).toFixed(3)+' N/kg':active==='shm'?'±'+p.amplitude+' m':'±'+amplitude.toFixed(1)+' m');
    }
    const dash=new Float32Array([4,5]),empty=new Float32Array(0);
    function draw(t) {
        if(!ctx || !active)return;currentTime=t;
        // Copy cached layers using logical coordinates; no DOM replacement on frames.
        ctx.drawImage(sceneBase,0,0,720,430);cc.drawImage(chartBase,0,0,640,180);
        if(active==='gravity') {
            const a=omega*t,cos=Math.cos(a),sin=Math.sin(a),x=345+155*cos,y=215-155*sin;
            ctx.setLineDash(dash);line(ctx,345,215,x,y,C.axis);ctx.setLineDash(empty);
            arrow(ctx,x,y,-48*cos,48*sin,C.red);arrow(ctx,x,y,-42*sin,-42*cos,C.teal);dot(ctx,x,y,7,C.blue);dot(ctx,x,y,3,C.scene);
            dot(cc,55+(p.radius-1)/7*560,145-115/(p.radius*p.radius),5,C.amber);
        } else if(active==='waves') {
            const phase=omega*t;
            for(let i=0;i<samples;i++) {wave1[i]=p.a1*Math.sin(phases[i]-phase);wave2[i]=p.a2*Math.sin(phases[i]+(p.direction==='opposite'?phase:-phase)+wavePhase);}
            const k=2*Math.PI*p.frequency/p.speed*p.probe,y1=p.a1*Math.sin(k-phase),y2=p.a2*Math.sin(k+(p.direction==='opposite'?phase:-phase)+wavePhase);
            for(let row=0;row<3;row++) {
                const y=row===0?95:row===1?205:335,color=row===0?C.blue:row===1?C.purple:C.teal;
                ctx.beginPath();
                for(let i=0;i<samples;i++) {const value=row===0?wave1[i]:row===1?wave2[i]:wave1[i]+wave2[i],x=65+i,yy=y-value*20;if(i===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);}
                ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.stroke();dot(ctx,probeX,y-(row===0?y1:row===1?y2:y1+y2)*20,4,color);
            }
            dot(cc,55+(t%period)/period*560,80-(y1+y2)*55/Math.max(p.a1+p.a2,.1),5,C.teal);
        } else {
            const cos=Math.cos(omega*t),x=p.amplitude*cos,block=385+x*200,potential=totalEnergy*cos*cos,kinetic=totalEnergy-potential;
            ctx.beginPath();ctx.moveTo(65,170);ctx.lineTo(85,170);
            for(let i=1;i<=16;i++)ctx.lineTo(85+(block-117)*i/17,170+(i%2?15:-15));ctx.lineTo(block-32,170);ctx.strokeStyle=C.purple;ctx.lineWidth=3;ctx.stroke();
            ctx.fillStyle=C.purple;ctx.fillRect(block-32,138,64,64);text(ctx,block,176,massLabel,C.scene,'center');
            if(Math.abs(x)>.001)arrow(ctx,block,115,-cos*65,0,C.red);
            ctx.fillStyle=C.blue;ctx.fillRect(150,308,370*kinetic/totalEnergy,20);ctx.fillStyle=C.purple;ctx.fillRect(150,352,370*potential/totalEnergy,20);
            text(ctx,34,36,positionLabel,C.purple);text(ctx,540,324,kineticLabel,C.blue);text(ctx,540,368,potentialLabel,C.purple);
            dot(cc,55+(t%(2*period))/(2*period)*560,80-55*cos,5,C.purple);
        }
    }
    function setReadouts(q){if(active==='shm'){positionLabel='x = '+q.x.toFixed(3)+' m';kineticLabel=q.kinetic.toFixed(3)+' J';potentialLabel=q.potential.toFixed(3)+' J';}}
    function close(){observer?.disconnect();observer=null;scene=null;chart=null;ctx=null;active=null;currentTime=0;}
    window.LabRenderer={configure,draw,close,setReadouts};
})();
