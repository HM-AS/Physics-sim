/**
 * PhysicSim HD - Core Application Logic & Physics Engine
 * Handles SPA navigation, dual friction calculations, dynamic mass arrays,
 * 3D visual block canvas rendering, live SVG charting, and synth audio.
 */

// --- STORAGE WRAPPER (Prevents SecurityError when localStorage is blocked) ---
const storage = {
    getItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn("Storage access blocked: ", e);
            return null;
        }
    },
    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn("Storage write blocked: ", e);
        }
    }
};

// --- STATE MANAGEMENT ---
const state = {
    // Current active view: 'home' or 'sim'
    activeView: 'home',

    // Masses list (array allows dynamic add/remove, range 2 to 6 blocks)
    masses: [1.0, 2.0, 3.0, 4.0], // default 4 blocks

    // Applied Force (F) pulling the front mass (0 to 100 N)
    appliedForce: 50.0,

    // Dual-Coefficient Ground Friction System
    frictionEnabled: false,
    mu_s: 0.35, // Static friction coefficient
    mu_k: 0.20, // Kinetic/Dynamic friction coefficient
    gravity: 9.81, // m/s^2

    // Calculated Variables
    totalMass: 10.0,
    frictionForce: 0.0,
    netForce: 50.0,
    acceleration: 5.0, // m/s^2
    tensions: [5.0, 15.0, 30.0], // N-1 tensions

    // Simulation Clock & Motion State
    isPlaying: false,
    simSpeed: 1.0, // multiplier: 0.5, 1.0, 2.0
    position: 0.0, // m (accumulated distance)
    velocity: 0.0, // m/s
    lastFrameTime: 0,
    isStaticState: true, // starts static (v = 0)

    // Audio Control
    isMuted: true, // Default to muted for compliance with autoplay policies

    // Dial interaction state
    isDialDragging: false
};

// --- DOM ELEMENTS BINDING ---
const DOM = {
    // Navigation Views
    homeView: document.getElementById('home-view'),
    simView: document.getElementById('sim-view'),
    cardTensionSim: document.getElementById('card-tension-sim'),
    homeBtn: document.getElementById('homeBtn'),

    // Dynamic mass controls
    btnAddMass: document.getElementById('btn-add-mass'),
    btnRemoveMass: document.getElementById('btn-remove-mass'),
    massSlidersContainer: document.querySelector('.mass-sliders-container'),

    // Force Knob / Slider
    forceDial: document.getElementById('force-dial'),
    dialFillCircle: document.getElementById('dial-fill-circle'),
    dialIndicatorLine: document.getElementById('dial-indicator-line'),
    dialText: document.getElementById('dial-text'),
    forceSlider: document.getElementById('force-slider'),

    // Upgraded Friction Panel elements
    frictionToggle: document.getElementById('friction-toggle'),
    frictionControlPanel: document.getElementById('friction-control-panel'),
    sliderMuS: document.getElementById('slider-mu-s'),
    sliderMuK: document.getElementById('slider-mu-k'),
    valMuS: document.getElementById('val-mu-s'),
    valMuK: document.getElementById('val-mu-k'),
    frictionBadge: document.getElementById('friction-badge'),
    frictionText: document.getElementById('friction-text'),

    // Sim Buttons & Selector
    playBtn: document.getElementById('playBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resetBtn: document.getElementById('resetBtn'),
    speedOptions: document.querySelectorAll('.speed-option'),
    soundBtn: document.getElementById('soundBtn'),
    helpBtn: document.getElementById('helpBtn'),
    settingsBtn: document.getElementById('settingsBtn'),

    // Canvas
    canvas: document.getElementById('physics-canvas'),
    distanceReadout: document.getElementById('distance-readout'),
    velocityReadout: document.getElementById('velocity-readout'),

    // Table Tbody
    tableBody: document.querySelector('.data-table tbody'),

    // SVG Graph
    graphSvg: document.getElementById('tension-graph'),
    graphLine: document.getElementById('graph-line'),
    graphArea: document.getElementById('graph-area'),
    graphPoints: document.getElementById('graph-points'),
    graphGrid: document.querySelector('.graph-grid'),

    // Readout Widgets
    systemAccel: document.getElementById('system-accel'),
    lblTotalMass: document.getElementById('lbl-total-mass'),
    lblNetForce: document.getElementById('lbl-net-force'),

    // Modals
    helpModal: document.getElementById('helpModal'),
    closeHelpBtn: document.getElementById('closeHelpBtn'),
    closeHelpBtnOk: document.getElementById('closeHelpBtnOk'),
    welcomeModal: document.getElementById('welcomeModal'),
    welcomeEnterBtn: document.getElementById('welcomeEnterBtn')
};

// --- WEB AUDIO SYNTHESIZER ---
let audioCtx = null;
let humOscillator = null;
let humGainNode = null;

function initAudio() {
    if (audioCtx) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        
        humOscillator = audioCtx.createOscillator();
        humGainNode = audioCtx.createGain();
        
        humOscillator.type = 'sawtooth';
        humOscillator.frequency.value = 40;
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 170;
        
        humOscillator.connect(filter);
        filter.connect(humGainNode);
        humGainNode.connect(audioCtx.destination);
        
        humGainNode.gain.value = 0; // Silent by default
        humOscillator.start(0);
    } catch (e) {
        console.warn("Web Audio Context blocked/unsupported: ", e);
    }
}

function playClickSound() {
    if (state.isMuted) return;
    initAudio();
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.06);
    
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.06);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.06);
}

function playBeepSound(freq, duration, type = 'sine') {
    if (state.isMuted) return;
    initAudio();
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function updateEngineHum() {
    if (!audioCtx || state.isMuted) return;
    
    if (state.isPlaying && state.velocity > 0.01) {
        const pitch = Math.min(240, 42 + state.velocity * 5);
        humOscillator.frequency.setTargetAtTime(pitch, audioCtx.currentTime, 0.1);
        
        const volume = Math.min(0.12, 0.015 + state.velocity * 0.01);
        humGainNode.gain.setTargetAtTime(volume, audioCtx.currentTime, 0.15);
    } else {
        humGainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
    }
}

// --- DYNAMIC CONTROL BUILDERS ---

// 1. Build Mass Sliders Dynamically
function buildMassSliders() {
    DOM.massSlidersContainer.innerHTML = '';
    
    state.masses.forEach((val, idx) => {
        const id = idx + 1;
        const card = document.createElement('div');
        card.className = 'mass-control-card';
        card.setAttribute('data-mass', `m${id}`);
        card.innerHTML = `
            <div class="mass-label">
                <span class="indicator" style="background-color: var(--m${id}-color); box-shadow: 0 0 6px var(--m${id}-color);"></span>
                <span class="mass-name">M${id}</span>
            </div>
            <div class="vertical-slider-wrapper">
                <input type="range" class="vertical-slider" min="0.5" max="5.0" step="0.1" value="${val}" data-idx="${idx}">
            </div>
            <div class="mass-value-badge">${val.toFixed(1)} kg</div>
        `;
        
        DOM.massSlidersContainer.appendChild(card);
        
        // Bind event listener
        const slider = card.querySelector('.vertical-slider');
        slider.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.idx);
            state.masses[index] = parseFloat(e.target.value);
            
            // Update badge text
            card.querySelector('.mass-value-badge').textContent = `${state.masses[index].toFixed(1)} kg`;
            
            calculatePhysics();
        });
    });
}

// 2. Build Data Table Rows Dynamically
function buildDataTableRows() {
    DOM.tableBody.innerHTML = '';
    
    state.masses.forEach((m, idx) => {
        const id = idx + 1;
        const isLast = idx === state.masses.length - 1;
        
        const tr = document.createElement('tr');
        tr.className = 'row-mass';
        tr.id = `row-m${id}`;
        
        tr.innerHTML = `
            <td><span class="table-dot" style="background-color: var(--m${id}-color);"></span>M${id}</td>
            <td id="tbl-m${id}-val" class="mono">${m.toFixed(1)} kg</td>
            <td id="tbl-m${id}-acc" class="mono">${state.acceleration.toFixed(2)}</td>
            <td id="tbl-m${id}-ten" class="mono highlighted">${(isLast ? state.appliedForce : state.tensions[idx]).toFixed(1)} N</td>
        `;
        
        DOM.tableBody.appendChild(tr);
    });
}

// --- PHYSICS ENGINE CALCULATIONS (With Static & Kinetic Friction) ---
function calculatePhysics() {
    // 1. Calculate total mass
    state.totalMass = state.masses.reduce((sum, m) => sum + m, 0);
    
    // Normal Force
    const normalForce = state.totalMass * state.gravity;
    
    // 2. Solve Friction Forces based on State (Static vs Kinetic)
    if (state.frictionEnabled) {
        const maxStaticFriction = state.mu_s * normalForce;
        const kineticFriction = state.mu_k * normalForce;
        
        if (state.velocity <= 0.001) {
            // System is static
            state.isStaticState = true;
            state.velocity = 0; // Force clamp
            
            if (state.appliedForce > maxStaticFriction) {
                // Break static hold! Transition to kinetic motion
                state.isStaticState = false;
                state.frictionForce = kineticFriction;
                state.netForce = state.appliedForce - kineticFriction;
                state.acceleration = state.netForce / state.totalMass;
            } else {
                // Force fails to break static hold
                state.frictionForce = state.appliedForce; // friction matches pull
                state.netForce = 0.0;
                state.acceleration = 0.0;
            }
        } else {
            // System is currently in motion (Kinetic)
            state.isStaticState = false;
            state.frictionForce = kineticFriction;
            state.netForce = state.appliedForce - kineticFriction; // Net force can be negative (decelerating)
            state.acceleration = state.netForce / state.totalMass;
        }
    } else {
        // Friction disabled
        state.isStaticState = state.velocity <= 0.001;
        state.frictionForce = 0.0;
        state.netForce = state.appliedForce;
        state.acceleration = state.netForce / state.totalMass;
    }
    
    // 3. Tension Solver
    // Under uniform friction, tension remains T_i = sum(M_0..i) * (F / M_total).
    // This scales ropes correctly whether decelerating or accelerating.
    const tensionAcceleration = state.totalMass > 0 ? (state.appliedForce / state.totalMass) : 0;
    
    state.tensions = [];
    for (let i = 0; i < state.masses.length - 1; i++) {
        let cumulativeMass = 0;
        for (let j = 0; j <= i; j++) {
            cumulativeMass += state.masses[j];
        }
        state.tensions.push(cumulativeMass * tensionAcceleration);
    }
    
    // Safety zero force clamp
    if (state.appliedForce === 0) {
        state.tensions = state.tensions.map(() => 0);
    }
    
    // 4. Update UI readouts
    updateUIElements();
}

// --- UI SYNC UPDATER ---
function updateUIElements() {
    // 1. Data table synchronization
    state.masses.forEach((m, idx) => {
        const id = idx + 1;
        const isLast = idx === state.masses.length - 1;
        const tensionVal = isLast ? state.appliedForce : state.tensions[idx];
        
        const cellVal = document.getElementById(`tbl-m${id}-val`);
        const cellAcc = document.getElementById(`tbl-m${id}-acc`);
        const cellTen = document.getElementById(`tbl-m${id}-ten`);
        
        if (cellVal) cellVal.textContent = `${m.toFixed(1)} kg`;
        if (cellAcc) cellAcc.textContent = state.acceleration.toFixed(2);
        if (cellTen) cellTen.textContent = `${tensionVal.toFixed(1)} N`;
    });
    
    // 2. Numerical Readouts
    DOM.systemAccel.innerHTML = `a = ${state.acceleration.toFixed(2)} <span style="font-size: 1rem; font-weight:500;">m/s²</span>`;
    DOM.lblTotalMass.textContent = `${state.totalMass.toFixed(1)} kg`;
    
    // Net Force widget display
    const forceDisplay = state.frictionEnabled ? state.netForce : state.appliedForce;
    DOM.lblNetForce.textContent = `${Math.max(0, forceDisplay).toFixed(1)} N`;
    
    // Synchronize inputs
    DOM.forceSlider.value = state.appliedForce;
    DOM.sliderMuS.value = state.mu_s;
    DOM.sliderMuK.value = state.mu_k;
    DOM.valMuS.textContent = state.mu_s.toFixed(2);
    DOM.valMuK.textContent = state.mu_k.toFixed(2);
    
    // 3. Dial update
    updateDialUI(state.appliedForce);
    
    // 4. Real-time SVG chart
    drawTensionGraph();
    
    // 5. Friction status badge
    if (state.frictionEnabled) {
        DOM.frictionBadge.classList.add('active');
        DOM.frictionText.textContent = "ON";
        DOM.frictionToggle.checked = true;
        DOM.frictionControlPanel.style.display = 'flex';
    } else {
        DOM.frictionBadge.classList.remove('active');
        DOM.frictionText.textContent = "OFF";
        DOM.frictionToggle.checked = false;
        DOM.frictionControlPanel.style.display = 'none';
    }
}

// --- ROTARY DIAL INTERACTION ---
function updateDialUI(forceValue) {
    DOM.dialText.textContent = `${Math.round(forceValue)} N`;
    
    // Sweeps 270 degrees clockwise, centered: 225 deg (SW) to 135 deg (SE)
    const pct = forceValue / 100;
    const angle = 225 + pct * 270;
    
    DOM.dialIndicatorLine.style.transform = `rotate(${angle}deg)`;
    
    // Radius = 41 -> Perimeter = 257.6 -> Sweep offset = 257.6 - (pct * 193.2)
    const strokeDash = 257.6;
    const maxOffset = 193.2;
    const offset = strokeDash - (pct * maxOffset);
    DOM.dialFillCircle.setAttribute('stroke-dashoffset', offset);
}

function handleDialPointerEvent(e) {
    const rect = DOM.forceDial.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    
    const x = e.clientX - cx;
    const y = e.clientY - cy;
    
    let angleRad = Math.atan2(y, x);
    let angleDeg = angleRad * 180 / Math.PI;
    
    let theta = angleDeg + 90; // offset so 12 o'clock is 0
    if (theta < 0) theta += 360;
    
    let valAngle = (theta - 225 + 360) % 360;
    let targetForce = 0;
    
    if (valAngle >= 0 && valAngle <= 270) {
        targetForce = (valAngle / 270) * 100;
    } else {
        if (valAngle > 315) targetForce = 0;
        else targetForce = 100;
    }
    
    state.appliedForce = Math.max(0, Math.min(100, targetForce));
    calculatePhysics();
}

function setupDialInteractions() {
    const dial = DOM.forceDial;
    
    const onPointerDown = (e) => {
        state.isDialDragging = true;
        dial.style.cursor = 'grabbing';
        document.body.style.cursor = 'grabbing';
        handleDialPointerEvent(e);
        dial.setPointerCapture(e.pointerId);
    };
    
    const onPointerMove = (e) => {
        if (!state.isDialDragging) return;
        handleDialPointerEvent(e);
    };
    
    const onPointerUp = (e) => {
        if (!state.isDialDragging) return;
        state.isDialDragging = false;
        dial.style.cursor = 'grab';
        document.body.style.cursor = 'default';
        dial.releasePointerCapture(e.pointerId);
        playClickSound();
    };
    
    dial.addEventListener('pointerdown', onPointerDown);
    dial.addEventListener('pointermove', onPointerMove);
    dial.addEventListener('pointerup', onPointerUp);
    dial.addEventListener('pointercancel', onPointerUp);
}

// --- SVG GRAPH (Tension vs. Position Step Plotting) ---
function drawTensionGraph() {
    const width = 320;
    const height = 200;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;
    
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;
    
    const y0 = height - paddingBottom; // 160
    const x0 = paddingLeft; // 40
    
    // Re-draw background grid lines
    if (DOM.graphGrid) {
        DOM.graphGrid.innerHTML = '';
        for (let i = 1; i <= 4; i++) {
            const y = y0 - (i / 4) * plotHeight;
            const textVal = i * 25;
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x0);
            line.setAttribute('y1', y);
            line.setAttribute('x2', width - paddingRight);
            line.setAttribute('y2', y);
            DOM.graphGrid.appendChild(line);
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x0 - 8);
            text.setAttribute('y', y + 3);
            text.setAttribute('class', 'graph-axis-label text-anchor-end');
            text.textContent = textVal;
            DOM.graphGrid.appendChild(text);
        }
    }
    
    const N = state.masses.length;
    const segWidth = plotWidth / N;
    
    // Dynamic positions list based on masses size N
    const positions = [{ x: x0, y: y0 }];
    for (let i = 0; i < N; i++) {
        positions.push({
            x: x0 + segWidth * (i + 0.7),
            y: y0,
            label: `M${i+1}`
        });
    }
    
    // Tensions: Segment 0=0, Segment i=Tensions[i-1], Segment N=AppliedForce
    const tensionsList = [0];
    for (let i = 0; i < N - 1; i++) {
        tensionsList.push(state.tensions[i]);
    }
    tensionsList.push(state.appliedForce);
    
    // Draw step paths
    let pathD = `M ${x0} ${y0}`;
    let fillD = `M ${x0} ${y0}`;
    
    const screenY = (val) => y0 - (val / 100) * plotHeight;
    
    for (let i = 1; i <= N; i++) {
        const prevY = screenY(tensionsList[i-1]);
        const currentY = screenY(tensionsList[i]);
        const currentX = positions[i].x;
        
        pathD += ` H ${currentX} V ${currentY}`;
        fillD += ` H ${currentX} V ${currentY}`;
    }
    
    const endX = width - paddingRight;
    const finalY = screenY(state.appliedForce);
    pathD += ` H ${endX}`;
    fillD += ` H ${endX}`;
    
    fillD += ` V ${y0} H ${x0} Z`;
    
    DOM.graphLine.setAttribute('d', pathD);
    DOM.graphArea.setAttribute('d', fillD);
    
    // Clear dynamic point dots & labels
    DOM.graphPoints.innerHTML = '';
    
    const massColors = ['var(--m1-color)', 'var(--m2-color)', 'var(--m3-color)', 'var(--m4-color)', 'var(--m5-color)', 'var(--m6-color)'];
    
    for (let i = 1; i <= N; i++) {
        const x = positions[i].x;
        const y = screenY(tensionsList[i]);
        
        // Vertical guideline ticks
        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tick.setAttribute('x1', x);
        tick.setAttribute('y1', y0);
        tick.setAttribute('x2', x);
        tick.setAttribute('y2', y0 + 6);
        tick.setAttribute('stroke', 'rgba(255,255,255,0.15)');
        DOM.graphPoints.appendChild(tick);
        
        // Block text labels (M1-M6)
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', y0 + 18);
        label.setAttribute('class', 'graph-axis-label');
        label.setAttribute('text-anchor', 'middle');
        label.textContent = positions[i].label;
        label.setAttribute('fill', massColors[i-1]);
        label.style.fontWeight = 'bold';
        DOM.graphPoints.appendChild(label);
        
        // Circular dot marker
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '4.5');
        
        const dotColor = (i === N) ? 'var(--force-color)' : massColors[i-1];
        circle.setAttribute('fill', dotColor);
        circle.setAttribute('stroke', '#0d1222');
        circle.setAttribute('stroke-width', '1.5');
        circle.setAttribute('class', 'graph-dot');
        
        // Tooltip title
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = (i === N) ? `Applied Force = ${tensionsList[i].toFixed(1)} N` : `Tension T${i} = ${tensionsList[i].toFixed(1)} N`;
        circle.appendChild(title);
        
        DOM.graphPoints.appendChild(circle);
    }
}

// Set up SVG chart linear gradients
function setupGraphGradients() {
    if (DOM.graphSvg.querySelector('defs')) return;
    
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    grad.setAttribute('id', 'graph-gradient');
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0');
    grad.setAttribute('y2', '1');
    
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', 'var(--accent-cyan)');
    stop1.setAttribute('stop-opacity', '0.45');
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', 'var(--accent-cyan)');
    stop2.setAttribute('stop-opacity', '0.0');
    
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);
    DOM.graphSvg.insertBefore(defs, DOM.graphSvg.firstChild);
}

// --- CANVAS 2D SIMULATOR (3D Bevel Block Rendering) ---
let ctx = null;
let canvasWidth = 800;
let canvasHeight = 400;
let gridOffset = 0;
let forceArrowOffset = 0;

function resizeCanvas() {
    if (!DOM.canvas) return;
    
    const rect = DOM.canvas.parentNode.getBoundingClientRect();
    canvasWidth = rect.width;
    canvasHeight = rect.height;
    
    const dpr = window.devicePixelRatio || 1;
    DOM.canvas.width = canvasWidth * dpr;
    DOM.canvas.height = canvasHeight * dpr;
    
    ctx = DOM.canvas.getContext('2d');
    ctx.scale(dpr, dpr);
}

function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke, strokeWidth = 1) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
    }
}

// Draw a shaded 3D Block with bevel depth
function draw3DBlock(ctx, x, y, size, massId, massValue) {
    const radius = 6;
    const depth = 8; // Bevel depth
    
    // Front face primary color (matching mass theme color)
    const colors = {
        m1: { front: '#f43f5e', top: '#fb7185', side: '#be123c' },
        m2: { front: '#0ea5e9', top: '#38bdf8', side: '#0369a1' },
        m3: { front: '#10b981', top: '#34d399', side: '#047857' },
        m4: { front: '#f59e0b', top: '#fbbf24', side: '#b45309' },
        m5: { front: '#a855f7', top: '#c084fc', side: '#7e22ce' },
        m6: { front: '#ec4899', top: '#f472b6', side: '#be185d' }
    };
    
    const theme = colors[`m${massId}`] || colors.m1;
    
    // 1. Draw soft Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.beginPath();
    ctx.ellipse(x + size/2 + depth/2, y + size + 2, size/2 + depth/2, 4, 0, 0, 2*Math.PI);
    ctx.fill();
    
    // 2. Draw Top Bevel Face
    ctx.fillStyle = theme.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + depth, y - depth);
    ctx.lineTo(x + size + depth, y - depth);
    ctx.lineTo(x + size, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.stroke();
    
    // 3. Draw Side Bevel Face (Darker Shade)
    ctx.fillStyle = theme.side;
    ctx.beginPath();
    ctx.moveTo(x + size, y);
    ctx.lineTo(x + size + depth, y - depth);
    ctx.lineTo(x + size + depth, y + size - depth);
    ctx.lineTo(x + size, y + size);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // 4. Draw Front Face (Rounded Rect)
    drawRoundedRect(ctx, x, y, size, size, radius, theme.front, 'rgba(0,0,0,0.15)', 1.5);
    
    // 5. Draw hooks on the edges (wire loops)
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    
    // Left Hook
    ctx.beginPath();
    ctx.arc(x, y + size/2, 5, Math.PI/2, 1.5 * Math.PI);
    ctx.stroke();
    
    // Right Hook
    ctx.beginPath();
    ctx.arc(x + size, y + size/2, 5, -Math.PI/2, Math.PI/2);
    ctx.stroke();
    
    // 6. Draw Text Label details (e.g. M1, 2.5 kg)
    ctx.textAlign = 'center';
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${size > 60 ? '14px' : '12px'} Outfit, -apple-system, sans-serif`;
    ctx.fillText(`M${massId}`, x + size/2, y + size/2 - 3);
    
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `700 ${size > 60 ? '11px' : '9.5px'} JetBrains Mono, monospace`;
    ctx.fillText(`${massValue.toFixed(1)}kg`, x + size/2, y + size/2 + 10);
}

function interpolateColor(color1, color2, factor) {
    const r = Math.round(color1[0] + factor * (color2[0] - color1[0]));
    const g = Math.round(color1[1] + factor * (color2[1] - color1[1]));
    const b = Math.round(color1[2] + factor * (color2[2] - color1[2]));
    return `rgb(${r}, ${g}, ${b})`;
}

function drawSimulation() {
    if (!ctx) return;
    
    // Clear
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Grid alignment parameters
    const gridSize = 40;
    const floorY = Math.round(canvasHeight * 0.72);
    
    // 1. Grid Background
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    const scrollOffset = gridOffset % gridSize;
    for (let x = scrollOffset; x < canvasWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, floorY);
        ctx.stroke();
    }
    for (let y = 0; y < floorY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
    }
    
    // 2. Draw Floor
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(canvasWidth, floorY);
    ctx.stroke();
    
    // Draw friction hatches if active
    if (state.frictionEnabled) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.08)';
        ctx.lineWidth = 2.5;
        const hatchSpacing = 16;
        const hatchOffset = (gridOffset * 1.25) % hatchSpacing;
        for (let x = hatchOffset - 20; x < canvasWidth + 20; x += hatchSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, floorY);
            ctx.lineTo(x - 8, floorY + 12);
            ctx.stroke();
        }
    }
    
    // 3. Size and Position calculations
    const N = state.masses.length;
    const baseBlockSize = 50;
    const massFactor = 8;
    const ropeLength = 100;
    const hookR = 5; // radius of hook
    
    const sizes = state.masses.map(m => baseBlockSize + m * massFactor);
    
    // Solve chain width & centering
    let totalChainWidth = 0;
    sizes.forEach((s, idx) => {
        totalChainWidth += s;
        if (idx < N - 1) totalChainWidth += ropeLength;
    });
    
    const chainStart = (canvasWidth - totalChainWidth) / 2;
    
    const blockX = [];
    let currentX = chainStart;
    for (let i = 0; i < N; i++) {
        blockX.push(currentX);
        currentX += sizes[i] + ropeLength;
    }
    
    // 4. Draw Connected Ropes / Tensions
    const baseRGB = [200, 206, 218];
    const activeRGB = [249, 115, 22]; // Orange glow
    const maxTensionVal = 100;
    
    for (let i = 0; i < N - 1; i++) {
        const tension = state.tensions[i];
        const ratio = Math.min(1.0, tension / maxTensionVal);
        
        // Hooks attachments offset
        const xStart = blockX[i] + sizes[i] + hookR;
        const yStart = floorY - sizes[i]/2;
        const xEnd = blockX[i+1] - hookR;
        const yEnd = floorY - sizes[i+1]/2;
        
        ctx.save();
        if (ratio > 0.05) {
            ctx.shadowColor = `rgba(249, 115, 22, ${ratio * 0.7})`;
            ctx.shadowBlur = ratio * 12;
        }
        
        ctx.strokeStyle = interpolateColor(baseRGB, activeRGB, ratio);
        ctx.lineWidth = 2 + ratio * 7;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(xStart, yStart);
        ctx.lineTo(xEnd, yEnd);
        ctx.stroke();
        ctx.restore();
        
        // Tension text overlay
        ctx.font = '700 11px JetBrains Mono, monospace';
        ctx.fillStyle = ratio > 0.3 ? 'var(--accent-cyan)' : '#475569';
        ctx.textAlign = 'center';
        ctx.fillText(`T${i+1}: ${tension.toFixed(1)}N`, (xStart + xEnd)/2, (yStart + yEnd)/2 - 10);
    }
    
    // 5. Draw 3D masses
    state.masses.forEach((m, i) => {
        draw3DBlock(ctx, blockX[i], floorY - sizes[i], sizes[i], i + 1, m);
    });
    
    // 6. Draw Applied Force Vector Arrow from last mass (pointing right)
    const forceRatio = state.appliedForce / maxTensionVal;
    
    if (state.appliedForce > 0.1) {
        const lastIdx = N - 1;
        const xStart = blockX[lastIdx] + sizes[lastIdx] + hookR;
        const yStart = floorY - sizes[lastIdx]/2;
        
        const arrowLen = 50 + forceRatio * 80;
        const xEnd = xStart + arrowLen;
        const yEnd = yStart;
        
        ctx.save();
        ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(xStart, yStart);
        ctx.lineTo(xEnd, yEnd);
        
        if (state.isPlaying) {
            ctx.setLineDash([8, 6]);
            ctx.lineDashOffset = -forceArrowOffset;
        }
        ctx.stroke();
        ctx.restore();
        
        // Arrowhead
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(xEnd, yEnd);
        ctx.lineTo(xEnd - 12, yEnd - 7);
        ctx.lineTo(xEnd - 10, yEnd);
        ctx.lineTo(xEnd - 12, yEnd + 7);
        ctx.closePath();
        ctx.fill();
        
        // Arrow Text
        ctx.font = '800 12px Outfit, -apple-system, sans-serif';
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'left';
        ctx.fillText(`F: ${state.appliedForce.toFixed(1)} N`, xEnd + 8, yEnd + 4);
    }
}

// --- SIMULATION PHYSICS INTEGRATOR ---
function simTick(timestamp) {
    if (!state.lastFrameTime) state.lastFrameTime = timestamp;
    const dtReal = (timestamp - state.lastFrameTime) / 1000.0;
    state.lastFrameTime = timestamp;
    
    const dt = Math.min(0.08, dtReal * state.simSpeed);
    
    if (state.isPlaying) {
        // Integrate motion using solved acceleration
        // Under Newton's First Law, if acceleration = 0, velocity remains constant!
        state.velocity += state.acceleration * dt;
        
        // Limit velocity if it falls negative (decelerated to stop)
        if (state.velocity < 0) {
            state.velocity = 0;
        }
        
        // Integrate position
        state.position += state.velocity * dt;
        
        // Canvas visuals offsets scrolling
        const scale = 50; // visual speed scale pixels per meter
        gridOffset -= state.velocity * dt * scale;
        forceArrowOffset += (state.appliedForce * 0.15 + 5.0) * dt * 4;
        
        // Sync badge indicators
        DOM.distanceReadout.textContent = `${state.position.toFixed(1)} m`;
        DOM.velocityReadout.textContent = `${state.velocity.toFixed(1)} m/s`;
        
        // Check if velocity dropped to 0 to recalibrate physics static hold
        if (state.velocity === 0 && !state.isStaticState) {
            calculatePhysics();
        }
        
        // Synthesizer update
        updateEngineHum();
    }
    
    // Draw canvas visualizer frame
    drawSimulation();
    
    // Frame loop
    if (state.activeView === 'sim') {
        requestAnimationFrame(simTick);
    }
}

// --- SPA VIEW ROUTING ---
function navigateToHome() {
    playClickSound();
    state.activeView = 'home';
    state.isPlaying = false;
    
    DOM.simView.style.display = 'none';
    DOM.homeView.style.display = 'flex';
    
    updateEngineHum();
}

function navigateToSim() {
    playClickSound();
    state.activeView = 'sim';
    
    DOM.homeView.style.display = 'none';
    DOM.simView.style.display = 'grid';
    
    // Unmute prompt for sound on navigation gesture
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    // Re-size and render UI
    resizeCanvas();
    calculatePhysics();
    
    // Start animation frames loop
    state.lastFrameTime = 0;
    requestAnimationFrame(simTick);
}

// --- SYSTEM EVENT LISTENERS AND BINDINGS ---
function setupEventListeners() {
    // 1. SPA Navigation Triggers
    DOM.cardTensionSim.addEventListener('click', navigateToSim);
    DOM.homeBtn.addEventListener('click', navigateToHome);

    // 2. Add / Remove mass block manager
    DOM.btnAddMass.addEventListener('click', () => {
        if (state.masses.length >= 6) {
            showNotification("Simulation limit reached: Maximum 6 mass blocks");
            playBeepSound(180, 0.12, 'sawtooth');
            return;
        }
        
        // Add a 2.0 kg mass block as a reasonable standard size
        const defaultVal = 2.0;
        state.masses.push(defaultVal);
        playBeepSound(520, 0.15, 'sine');
        showNotification(`Mass block M${state.masses.length} added`);
        
        // Re-construct dynamic elements
        calculatePhysics();
        buildMassSliders();
        buildDataTableRows();
    });
    
    DOM.btnRemoveMass.addEventListener('click', () => {
        if (state.masses.length <= 2) {
            showNotification("Simulation limit reached: Minimum 2 connected masses required");
            playBeepSound(180, 0.12, 'sawtooth');
            return;
        }
        
        const removedNum = state.masses.length;
        state.masses.pop();
        playBeepSound(320, 0.15, 'sine');
        showNotification(`Mass block M${removedNum} removed`);
        
        // Re-construct dynamic elements
        calculatePhysics();
        buildMassSliders();
        buildDataTableRows();
    });

    // 3. Fallback Force Slider
    DOM.forceSlider.addEventListener('input', (e) => {
        state.appliedForce = parseFloat(e.target.value);
        calculatePhysics();
    });

    // 4. Ground Friction Toggle and Upgraded Dual Sliders
    DOM.frictionToggle.addEventListener('change', (e) => {
        state.frictionEnabled = e.target.checked;
        playBeepSound(state.frictionEnabled ? 440 : 220, 0.12, 'sine');
        calculatePhysics();
    });
    
    DOM.sliderMuS.addEventListener('input', (e) => {
        state.mu_s = parseFloat(e.target.value);
        DOM.valMuS.textContent = state.mu_s.toFixed(2);
        calculatePhysics();
    });
    
    DOM.sliderMuK.addEventListener('input', (e) => {
        state.mu_k = parseFloat(e.target.value);
        DOM.valMuK.textContent = state.mu_k.toFixed(2);
        calculatePhysics();
    });

    // 5. Play / Pause / Reset Buttons
    DOM.playBtn.addEventListener('click', () => {
        playClickSound();
        if (!state.isPlaying) {
            state.isPlaying = true;
            state.lastFrameTime = 0;
            DOM.playBtn.style.background = 'rgba(16, 185, 129, 0.25)';
            DOM.pauseBtn.classList.remove('paused');
        }
    });
    
    DOM.pauseBtn.addEventListener('click', () => {
        if (state.isPlaying) {
            playClickSound();
            state.isPlaying = false;
            DOM.playBtn.style.background = 'rgba(16, 185, 129, 0.1)';
            DOM.pauseBtn.classList.add('paused');
            updateEngineHum();
        }
    });
    
    DOM.resetBtn.addEventListener('click', () => {
        playBeepSound(150, 0.15, 'sawtooth');
        state.isPlaying = false;
        state.position = 0.0;
        state.velocity = 0.0;
        gridOffset = 0;
        forceArrowOffset = 0;
        state.isStaticState = true;
        
        DOM.playBtn.style.background = 'rgba(16, 185, 129, 0.1)';
        DOM.pauseBtn.classList.add('paused');
        
        DOM.distanceReadout.textContent = "0.0 m";
        DOM.velocityReadout.textContent = "0.0 m/s";
        
        updateEngineHum();
        calculatePhysics();
        drawSimulation();
    });

    // 6. Simulation speed options selector
    DOM.speedOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            playClickSound();
            DOM.speedOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            state.simSpeed = parseFloat(opt.dataset.speed);
        });
    });

    // 7. Sound settings mute header button
    DOM.soundBtn.addEventListener('click', () => {
        state.isMuted = !state.isMuted;
        
        const path = DOM.soundBtn.querySelector('path');
        if (state.isMuted) {
            // Mute Icon Path
            path.setAttribute('d', 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z');
            DOM.soundBtn.style.borderColor = 'var(--border-color)';
            DOM.soundBtn.style.color = 'var(--text-secondary)';
            if (humGainNode) humGainNode.gain.value = 0;
        } else {
            // Sound Icon Path
            path.setAttribute('d', 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z');
            DOM.soundBtn.style.borderColor = 'var(--accent-cyan)';
            DOM.soundBtn.style.color = 'var(--text-primary)';
            initAudio();
            updateEngineHum();
        }
    });

    // 8. Help / Welcome Modals
    DOM.helpBtn.addEventListener('click', () => {
        playClickSound();
        DOM.helpModal.classList.add('active');
    });
    
    const closeHelp = () => {
        playClickSound();
        DOM.helpModal.classList.remove('active');
    };
    DOM.closeHelpBtn.addEventListener('click', closeHelp);
    DOM.closeHelpBtnOk.addEventListener('click', closeHelp);
    
    DOM.helpModal.addEventListener('click', (e) => {
        if (e.target === DOM.helpModal) closeHelp();
    });

    // Onboarding welcome modal logic
    DOM.welcomeEnterBtn.addEventListener('click', () => {
        playClickSound();
        DOM.welcomeModal.classList.remove('active');
        storage.setItem('physics_sim_onboarded', 'true');
        // transition directly to simulator from onboarding
        navigateToSim();
    });

    // Friction presets settings button fun
    DOM.settingsBtn.addEventListener('click', () => {
        playClickSound();
        // Cycle coefficients presets
        if (state.mu_s === 0.35) {
            state.mu_s = 0.65;
            state.mu_k = 0.45;
            playBeepSound(400, 0.15, 'triangle');
            showNotification("Friction Preset: Heavy Rubber (μs=0.65, μk=0.45)");
        } else if (state.mu_s === 0.65) {
            state.mu_s = 0.10;
            state.mu_k = 0.05;
            playBeepSound(600, 0.15, 'triangle');
            showNotification("Friction Preset: Solid Ice (μs=0.10, μk=0.05)");
        } else {
            state.mu_s = 0.35;
            state.mu_k = 0.20;
            playBeepSound(500, 0.15, 'triangle');
            showNotification("Friction Preset: Standard Ground (μs=0.35, μk=0.20)");
        }
        calculatePhysics();
    });

    // Window resizing canvas handler
    window.addEventListener('resize', () => {
        if (state.activeView === 'sim') {
            resizeCanvas();
            drawSimulation();
        }
    });
}

// Visual toast alerts
function showNotification(text) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    toast.style.background = 'rgba(10, 14, 26, 0.9)';
    toast.style.border = '1px solid var(--accent-cyan)';
    toast.style.boxShadow = 'var(--accent-glow)';
    toast.style.color = '#ffffff';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '20px';
    toast.style.fontSize = '0.8rem';
    toast.style.fontWeight = '600';
    toast.style.fontFamily = 'var(--font-sans)';
    toast.style.zIndex = '9999';
    toast.style.opacity = '0';
    toast.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    
    document.body.appendChild(toast);
    toast.textContent = text;
    
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 2200);
}

// --- INITIALIZATION ---
function init() {
    setupGraphGradients();
    setupDialInteractions();
    setupEventListeners();

    // Trigger onboarding welcome modal if first time
    const onboarded = storage.getItem('physics_sim_onboarded');
    if (onboarded !== 'true') {
        DOM.welcomeModal.classList.add('active');
    }

    // Set initial dynamic builds
    calculatePhysics();
    buildMassSliders();
    buildDataTableRows();

    // Initialize layout sync (initially in home view)
    navigateToHome();

    // Muted icon sync
    const path = DOM.soundBtn.querySelector('path');
    if (state.isMuted && path) {
        path.setAttribute('d', 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z');
        DOM.soundBtn.style.borderColor = 'var(--border-color)';
        DOM.soundBtn.style.color = 'var(--text-secondary)';
    }
}

// Trigger initialization
window.addEventListener('DOMContentLoaded', init);
