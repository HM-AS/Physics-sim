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
    // Current active view: 'home', 'sim' (Tension), or 'projectile'
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
    isDialDragging: false,

        // Projectile Motion Lab State
    projectile: {
        angle: 45, // degrees
        speed: 20, // m/s
        height: 5, // m
        mass: 1.0, // kg
        airResistanceEnabled: false,
        dragCoeff: 0.20,
        gridEnabled: true,
        zoomMode: 'auto', // 'auto' or 'manual'
        manualScale: 15,  // manual scale (pixels/meter)
        initialUx: 0,     // stored initial vx for SUVAT HUD
        initialUy: 0,     // stored initial vy for SUVAT HUD

        // Live simulation coordinates
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        time: 0,
        isFlying: false,
        isPaused: false,

        // Captured flight stats
        maxHeight: 0,
        flightTime: 0,
        maxRange: 0,

        // Path tracking
        currentPath: [], // Array of {x, y} in meters
        ghostPaths: [],  // Array of arrays containing past runs
        trials: [],      // History of trials logged

        lastFrameTime: 0
    }
};

// --- DOM ELEMENTS BINDING ---
const DOM = {
    // Navigation Views
    homeView: document.getElementById('home-view'),
    simView: document.getElementById('sim-view'),
    projectileView: document.getElementById('projectile-view'),
    cardTensionSim: document.getElementById('card-tension-sim'),
    cardProjectileSim: document.getElementById('card-projectile-sim'),
    homeBtn: document.getElementById('homeBtn'),
    homeBtnProj: document.getElementById('homeBtnProj'),
    soundBtnProj: document.getElementById('soundBtnProj'),
    helpBtnProj: document.getElementById('helpBtnProj'),

    // Dynamic mass controls (Tension)
    btnAddMass: document.getElementById('btn-add-mass'),
    btnRemoveMass: document.getElementById('btn-remove-mass'),
    massSlidersContainer: document.querySelector('.mass-sliders-container'),

    // Force Knob / Slider (Tension)
    forceDial: document.getElementById('force-dial'),
    dialFillCircle: document.getElementById('dial-fill-circle'),
    dialIndicatorLine: document.getElementById('dial-indicator-line'),
    dialText: document.getElementById('dial-text'),
    forceSlider: document.getElementById('force-slider'),

    // Friction Panel elements (Tension)
    frictionToggle: document.getElementById('friction-toggle'),
    frictionControlPanel: document.getElementById('friction-control-panel'),
    sliderMuS: document.getElementById('slider-mu-s'),
    sliderMuK: document.getElementById('slider-mu-k'),
    valMuS: document.getElementById('val-mu-s'),
    valMuK: document.getElementById('val-mu-k'),
    frictionBadge: document.getElementById('friction-badge'),
    frictionText: document.getElementById('friction-text'),

    // Sim Buttons & Selector (Tension)
    playBtn: document.getElementById('playBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resetBtn: document.getElementById('resetBtn'),
    speedOptions: document.querySelectorAll('.speed-option'),
    soundBtn: document.getElementById('soundBtn'),
    helpBtn: document.getElementById('helpBtn'),
    settingsBtn: document.getElementById('settingsBtn'),

    // Canvas (Tension)
    canvas: document.getElementById('physics-canvas'),
    distanceReadout: document.getElementById('distance-readout'),
    velocityReadout: document.getElementById('velocity-readout'),

    // Table Tbody (Tension)
    tableBody: document.querySelector('.data-table tbody'),

    // SVG Graph (Tension)
    graphSvg: document.getElementById('tension-graph'),
    graphLine: document.getElementById('graph-line'),
    graphArea: document.getElementById('graph-area'),
    graphPoints: document.getElementById('graph-points'),
    graphGrid: document.querySelector('.graph-grid'),

    // Readout Widgets (Tension)
    systemAccel: document.getElementById('system-accel'),
    lblTotalMass: document.getElementById('lbl-total-mass'),
    lblNetForce: document.getElementById('lbl-net-force'),

    // Projectile sliders & input controls
    sliderProjAngle: document.getElementById('slider-proj-angle'),
    valProjAngle: document.getElementById('val-proj-angle'),
    sliderProjSpeed: document.getElementById('slider-proj-speed'),
    valProjSpeed: document.getElementById('val-proj-speed'),
    sliderProjHeight: document.getElementById('slider-proj-height'),
    valProjHeight: document.getElementById('val-proj-height'),
    sliderProjMass: document.getElementById('slider-proj-mass'),
    valProjMass: document.getElementById('val-proj-mass'),
    airResToggle: document.getElementById('air-res-toggle'),
    airResPanel: document.getElementById('air-res-panel'),
    sliderProjDrag: document.getElementById('slider-proj-drag'),
    valProjDrag: document.getElementById('val-proj-drag'),
    gridToggle: document.getElementById('grid-toggle'),

    // Projectile action buttons
    launchBtn: document.getElementById('launchBtn'),
    pauseBtnProj: document.getElementById('pauseBtnProj'),
    resetBtnProj: document.getElementById('resetBtnProj'),

    // Projectile Canvas and badge overlays
    canvasProj: document.getElementById('projectile-canvas'),
    rangeReadoutBadge: document.getElementById('range-readout-badge'),
    heightReadoutBadge: document.getElementById('height-readout-badge'),
    airResBadge: document.getElementById('air-res-badge'),
    airResText: document.getElementById('air-res-text'),

    // Projectile Telemetry readouts
    telemetryRange: document.getElementById('telemetry-range'),
    telemetryHeight: document.getElementById('telemetry-height'),
    telemetryTime: document.getElementById('telemetry-time'),
    telemetryVelocity: document.getElementById('telemetry-velocity'),
    trialsTableBody: document.querySelector('#trials-table tbody'),

    // HUD controls and fields
    zoomSlider: document.getElementById('zoom-slider'),
    zoomValueLabel: document.getElementById('zoom-value-label'),
    zoomInBtn: document.getElementById('zoom-in-btn'),
    zoomOutBtn: document.getElementById('zoom-out-btn'),
    suvatS: document.getElementById('suvat-s'),
    suvatU: document.getElementById('suvat-u'),
    suvatV: document.getElementById('suvat-v'),
    suvatA: document.getElementById('suvat-a'),
    suvatT: document.getElementById('suvat-t'),

    // Modals
    helpModal: document.getElementById('helpModal'),
    closeHelpBtn: document.getElementById('closeHelpBtn'),
    closeHelpBtnOk: document.getElementById('closeHelpBtnOk'),
    welcomeModal: document.getElementById('welcomeModal'),
    welcomeEnterBtn: document.getElementById('welcomeEnterBtn'),
    projectileHelpModal: document.getElementById('projectileHelpModal'),
    closeHelpBtnProj: document.getElementById('closeHelpBtnProj'),
    closeHelpBtnOkProj: document.getElementById('closeHelpBtnOkProj')
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

function playLaunchSound() {
    if (state.isMuted) return;
    initAudio();
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, audioCtx.currentTime + 0.25);
    
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
}

function playLandingSound() {
    if (state.isMuted) return;
    initAudio();
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
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
    canvasWidth = Math.max(1, rect.width);
    canvasHeight = Math.max(1, rect.height);
    
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

// --- PROJECTILE MOTION SIMULATOR FUNCTIONS ---
let ctxProj = null;
let canvasWidthProj = 800;
let canvasHeightProj = 400;

function resizeCanvasProj() {
    if (!DOM.canvasProj) return;
    
    const rect = DOM.canvasProj.parentNode.getBoundingClientRect();
    canvasWidthProj = Math.max(1, rect.width);
    canvasHeightProj = Math.max(1, rect.height);
    
    const dpr = window.devicePixelRatio || 1;
    DOM.canvasProj.width = canvasWidthProj * dpr;
    DOM.canvasProj.height = canvasHeightProj * dpr;
    
    ctxProj = DOM.canvasProj.getContext('2d');
    ctxProj.scale(dpr, dpr);
}

function drawProjectileSimulation() {
    if (!ctxProj) return;
    
    // Clear canvas
    ctxProj.clearRect(0, 0, canvasWidthProj, canvasHeightProj);
    
    const proj = state.projectile;
    const yFloor = Math.round(canvasHeightProj * 0.82);
    const xLaunch = 80;
    
    // 1. Solve scale dynamically to fit the flight arc nicely within the canvas borders (or use manual override)
    const angleRad = proj.angle * Math.PI / 180;
    const g = 9.81;
    let currentScale = proj.scale;
    
    if (proj.zoomMode === 'auto') {
        const vx0 = proj.speed * Math.cos(angleRad);
        const vy0 = proj.speed * Math.sin(angleRad);
        
        const tFlightEst = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * proj.height)) / g;
        const rMaxEst = vx0 * tFlightEst;
        const hMaxEst = proj.height + (vy0 * vy0) / (2 * g);
        
        const padX = 160;
        const padY = 100;
        
        const targetScaleX = (canvasWidthProj - padX) / Math.max(5, rMaxEst);
        const targetScaleY = (yFloor - padY) / Math.max(5, hMaxEst);
        
        currentScale = Math.min(targetScaleX, targetScaleY);
        currentScale = Math.max(2.0, Math.min(30.0, currentScale));
        proj.scale = currentScale;
        
        // Update Zoom HUD slider value (maps scale to range 5 to 100)
        if (DOM.zoomSlider) {
            const sliderVal = Math.round(currentScale * 2.5);
            DOM.zoomSlider.value = Math.max(5, Math.min(100, sliderVal));
        }
    } else {
        currentScale = proj.manualScale;
        proj.scale = currentScale;
    }
    
    // Update Zoom HUD percentage readout
    if (DOM.zoomValueLabel) {
        DOM.zoomValueLabel.textContent = `${Math.round((currentScale / 10) * 100)}%`;
    }
    
    // 2. Draw Coordinate Grid if enabled
    if (proj.gridEnabled) {
        ctxProj.strokeStyle = '#f1f5f9';
        ctxProj.lineWidth = 1;
        
        let interval = 10;
        if (currentScale > 18) interval = 2;
        else if (currentScale > 8) interval = 5;
        else if (currentScale > 3) interval = 10;
        else if (currentScale > 1.2) interval = 25;
        else interval = 50;
        
        // Vertical grid lines
        for (let m = 0; m * currentScale < canvasWidthProj; m += interval) {
            const x = xLaunch + m * currentScale;
            ctxProj.beginPath();
            ctxProj.moveTo(x, 0);
            ctxProj.lineTo(x, yFloor);
            ctxProj.stroke();
            
            // X label ticks
            ctxProj.font = '500 10px JetBrains Mono, monospace';
            ctxProj.fillStyle = 'var(--text-muted)';
            ctxProj.textAlign = 'center';
            ctxProj.fillText(`${m}m`, x, yFloor + 18);
        }
        
        // Horizontal grid lines
        for (let m = 0; m * currentScale < yFloor; m += interval) {
            const y = yFloor - m * currentScale;
            ctxProj.beginPath();
            ctxProj.moveTo(xLaunch, y);
            ctxProj.lineTo(canvasWidthProj, y);
            ctxProj.stroke();
            
            // Y label ticks
            ctxProj.font = '500 10px JetBrains Mono, monospace';
            ctxProj.fillStyle = 'var(--text-muted)';
            ctxProj.textAlign = 'right';
            ctxProj.fillText(`${m}m`, xLaunch - 8, y + 4);
        }
    }
    
    // 3. Draw Ground Line
    ctxProj.strokeStyle = '#e2e8f0';
    ctxProj.lineWidth = 3;
    ctxProj.beginPath();
    ctxProj.moveTo(0, yFloor);
    ctxProj.lineTo(canvasWidthProj, yFloor);
    ctxProj.stroke();
    
    // Hatches
    ctxProj.strokeStyle = 'rgba(168, 85, 247, 0.08)';
    ctxProj.lineWidth = 2;
    for (let x = 0; x < canvasWidthProj; x += 16) {
        ctxProj.beginPath();
        ctxProj.moveTo(x, yFloor);
        ctxProj.lineTo(x - 8, yFloor + 10);
        ctxProj.stroke();
    }
    
    // 4. Draw Ghost Trails
    proj.ghostPaths.forEach((path) => {
        ctxProj.strokeStyle = 'rgba(168, 85, 247, 0.15)';
        ctxProj.lineWidth = 1.5;
        ctxProj.setLineDash([4, 4]);
        ctxProj.beginPath();
        path.forEach((pt, idx) => {
            const sx = xLaunch + pt.x * currentScale;
            const sy = yFloor - pt.y * currentScale;
            if (idx === 0) ctxProj.moveTo(sx, sy);
            else ctxProj.lineTo(sx, sy);
        });
        ctxProj.stroke();
        ctxProj.setLineDash([]);
    });
    
    // 5. Draw Active Trajectory
    if (proj.currentPath.length > 0) {
        ctxProj.save();
        ctxProj.strokeStyle = 'var(--m5-color)';
        ctxProj.shadowColor = 'rgba(168, 85, 247, 0.5)';
        ctxProj.shadowBlur = 10;
        ctxProj.lineWidth = 3;
        ctxProj.beginPath();
        proj.currentPath.forEach((pt, idx) => {
            const sx = xLaunch + pt.x * currentScale;
            const sy = yFloor - pt.y * currentScale;
            if (idx === 0) ctxProj.moveTo(sx, sy);
            else ctxProj.lineTo(sx, sy);
        });
        ctxProj.stroke();
        ctxProj.restore();
    }
    
    // 6. Draw Premium Cannon Launcher at (0, launchHeight)
    const cannonY = yFloor - proj.height * currentScale;
    ctxProj.save();
    ctxProj.translate(xLaunch, cannonY);
    
    // Turret base flange
    ctxProj.fillStyle = '#475569';
    ctxProj.beginPath();
    ctxProj.arc(0, 0, 12, 0, 2 * Math.PI);
    ctxProj.fill();
    ctxProj.strokeStyle = '#64748b';
    ctxProj.lineWidth = 1.5;
    ctxProj.stroke();
    
    // Radial bolts on base plate
    ctxProj.fillStyle = '#cbd5e1';
    for (let a = 0; a < 2 * Math.PI; a += Math.PI / 4) {
        ctxProj.beginPath();
        ctxProj.arc(9 * Math.cos(a), 9 * Math.sin(a), 1.2, 0, 2 * Math.PI);
        ctxProj.fill();
    }
    
    // Girder truss structure support (height column)
    if (proj.height > 0) {
        const hPix = proj.height * currentScale;
        ctxProj.fillStyle = '#1e293b';
        ctxProj.fillRect(-5, 0, 10, hPix);
        
        // Steel rails
        ctxProj.fillStyle = '#475569';
        ctxProj.fillRect(-6, 0, 2, hPix);
        ctxProj.fillRect(4, 0, 2, hPix);
        
        // Cross girders
        ctxProj.strokeStyle = 'rgba(168, 85, 247, 0.4)';
        ctxProj.lineWidth = 1.2;
        ctxProj.beginPath();
        const step = 15;
        for (let y = 0; y < hPix; y += step) {
            const nextY = Math.min(hPix, y + step);
            ctxProj.moveTo(-5, y);
            ctxProj.lineTo(5, nextY);
            ctxProj.moveTo(5, y);
            ctxProj.lineTo(-5, nextY);
        }
        ctxProj.stroke();
    }
    
    // Barrel
    ctxProj.save();
    ctxProj.rotate(-angleRad);
    
    // Pivot collar joint
    ctxProj.fillStyle = '#1e293b';
    ctxProj.fillRect(-4, -8, 8, 16);
    ctxProj.strokeStyle = 'var(--m5-color)';
    ctxProj.lineWidth = 1;
    ctxProj.strokeRect(-4, -8, 8, 16);
    
    // Metal barrel gradient
    const barrelGrad = ctxProj.createLinearGradient(0, -6, 0, 6);
    barrelGrad.addColorStop(0, '#334155');
    barrelGrad.addColorStop(0.3, '#64748b');
    barrelGrad.addColorStop(0.7, '#334155');
    barrelGrad.addColorStop(1, '#1e293b');
    
    ctxProj.fillStyle = barrelGrad;
    ctxProj.fillRect(0, -6, 28, 12);
    
    // Glowing laser guide stripe
    ctxProj.fillStyle = '#c084fc';
    ctxProj.fillRect(4, -1.5, 18, 3);
    
    // Heavy muzzle collar at tip
    ctxProj.fillStyle = '#1e293b';
    ctxProj.fillRect(28, -7, 4, 14);
    ctxProj.fillStyle = '#c084fc';
    ctxProj.fillRect(30, -6, 1, 12);
    
    ctxProj.restore();
    
    // Center bolt pin
    ctxProj.fillStyle = '#cbd5e1';
    ctxProj.beginPath();
    ctxProj.arc(0, 0, 4, 0, 2 * Math.PI);
    ctxProj.fill();
    ctxProj.restore();
    
    // 7. Draw Projectile & Vectors
    const px = xLaunch + proj.x * currentScale;
    const py = yFloor - proj.y * currentScale;
    
    ctxProj.save();
    ctxProj.fillStyle = 'var(--m5-color)';
    ctxProj.shadowColor = 'rgba(168, 85, 247, 0.8)';
    ctxProj.shadowBlur = 12;
    ctxProj.beginPath();
    ctxProj.arc(px, py, 6, 0, 2 * Math.PI);
    ctxProj.fill();
    ctxProj.strokeStyle = '#ffffff';
    ctxProj.lineWidth = 1;
    ctxProj.stroke();
    ctxProj.restore();
    
    if (proj.isFlying) {
        const v = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
        
        if (v > 0.1) {
            const vectorScale = 1.5;
            
            // Velocity vector
            ctxProj.save();
            ctxProj.strokeStyle = 'var(--m5-color)';
            ctxProj.lineWidth = 2.5;
            ctxProj.lineCap = 'round';
            ctxProj.beginPath();
            ctxProj.moveTo(px, py);
            ctxProj.lineTo(px + proj.vx * vectorScale, py - proj.vy * vectorScale);
            ctxProj.stroke();
            
            const angleVal = Math.atan2(-proj.vy, proj.vx);
            ctxProj.fillStyle = 'var(--m5-color)';
            ctxProj.beginPath();
            ctxProj.translate(px + proj.vx * vectorScale, py - proj.vy * vectorScale);
            ctxProj.rotate(angleVal);
            ctxProj.moveTo(0, 0);
            ctxProj.lineTo(-8, -4);
            ctxProj.lineTo(-6, 0);
            ctxProj.lineTo(-8, 4);
            ctxProj.closePath();
            ctxProj.fill();
            ctxProj.restore();
            
            // Component vectors
            ctxProj.save();
            ctxProj.strokeStyle = 'var(--accent-cyan)';
            ctxProj.lineWidth = 1.5;
            ctxProj.setLineDash([2, 2]);
            
            ctxProj.beginPath();
            ctxProj.moveTo(px, py);
            ctxProj.lineTo(px + proj.vx * vectorScale, py);
            ctxProj.stroke();
            
            ctxProj.beginPath();
            ctxProj.moveTo(px + proj.vx * vectorScale, py);
            ctxProj.lineTo(px + proj.vx * vectorScale, py - proj.vy * vectorScale);
            ctxProj.stroke();
            
            ctxProj.restore();
            
            // Labels
            ctxProj.font = '600 10px JetBrains Mono, monospace';
            ctxProj.fillStyle = 'var(--accent-cyan)';
            ctxProj.textAlign = 'center';
            ctxProj.fillText(`vx: ${proj.vx.toFixed(1)}m/s`, px + (proj.vx * vectorScale) / 2, py + 12);
            ctxProj.fillText(`vy: ${proj.vy.toFixed(1)}m/s`, px + proj.vx * vectorScale + 25, py - (proj.vy * vectorScale) / 2);
        }
    }
}

function resetProjectile() {
    const proj = state.projectile;
    proj.isFlying = false;
    proj.isPaused = false;
    proj.x = 0;
    proj.y = proj.height;
    proj.time = 0;
    
    // Reset zoomMode back to auto-scale on reset
    proj.zoomMode = 'auto';
    
    const angleRad = proj.angle * Math.PI / 180;
    proj.vx = proj.speed * Math.cos(angleRad);
    proj.vy = proj.speed * Math.sin(angleRad);
    
    // Store initial velocities for SUVAT HUD
    proj.initialUx = proj.vx;
    proj.initialUy = proj.vy;
    
    proj.maxHeight = proj.height;
    proj.currentPath = [{ x: proj.x, y: proj.y }];
    
    updateProjectileUI();
    drawProjectileSimulation();
    
    DOM.launchBtn.querySelector('span').textContent = 'LAUNCH';
    DOM.launchBtn.style.background = 'rgba(168, 85, 247, 0.1)';
    DOM.launchBtn.style.color = 'var(--m5-color)';
    DOM.pauseBtnProj.classList.add('paused');
    DOM.pauseBtnProj.querySelector('span').textContent = 'PAUSE';
    
    // Reset pause button styling
    DOM.pauseBtnProj.style.color = '#f59e0b';
    DOM.pauseBtnProj.style.borderColor = 'rgba(245, 158, 11, 0.3)';
}

function launchProjectile() {
    const proj = state.projectile;
    if (proj.isFlying) return;
    
    playLaunchSound();
    
    proj.isFlying = true;
    proj.isPaused = false;
    proj.x = 0;
    proj.y = proj.height;
    proj.time = 0;
    
    const angleRad = proj.angle * Math.PI / 180;
    proj.vx = proj.speed * Math.cos(angleRad);
    proj.vy = proj.speed * Math.sin(angleRad);
    
    // Store initial velocities for SUVAT HUD
    proj.initialUx = proj.vx;
    proj.initialUy = proj.vy;
    
    proj.maxHeight = proj.height;
    proj.currentPath = [{ x: proj.x, y: proj.y }];
    proj.lastFrameTime = 0;
    
    DOM.launchBtn.querySelector('span').textContent = 'FIRING...';
    DOM.launchBtn.style.background = 'rgba(168, 85, 247, 0.25)';
    DOM.pauseBtnProj.classList.remove('paused');
    DOM.pauseBtnProj.querySelector('span').textContent = 'PAUSE';
    
    // Reset pause button styling
    DOM.pauseBtnProj.style.color = '#f59e0b';
    DOM.pauseBtnProj.style.borderColor = 'rgba(245, 158, 11, 0.3)';
    
    updateProjectileUI();
}

function updateProjectileUI() {
    const proj = state.projectile;
    
    DOM.sliderProjAngle.value = proj.angle;
    DOM.valProjAngle.innerHTML = `${proj.angle}&deg;`;
    
    DOM.sliderProjSpeed.value = proj.speed;
    DOM.valProjSpeed.textContent = `${proj.speed} m/s`;
    
    DOM.sliderProjHeight.value = proj.height;
    DOM.valProjHeight.textContent = `${proj.height.toFixed(1)} m`;
    
    DOM.sliderProjMass.value = proj.mass;
    DOM.valProjMass.textContent = `${proj.mass.toFixed(1)} kg`;
    
    DOM.sliderProjDrag.value = proj.dragCoeff;
    DOM.valProjDrag.textContent = proj.dragCoeff.toFixed(2);
    
    DOM.airResToggle.checked = proj.airResistanceEnabled;
    DOM.gridToggle.checked = proj.gridEnabled;
    
    if (proj.airResistanceEnabled) {
        DOM.airResPanel.style.display = 'flex';
        DOM.airResBadge.classList.add('active');
        DOM.airResBadge.querySelector('strong').style.color = '#10b981';
        DOM.airResText.textContent = "ON";
    } else {
        DOM.airResPanel.style.display = 'none';
        DOM.airResBadge.classList.remove('active');
        DOM.airResBadge.querySelector('strong').style.color = '#ef4444';
        DOM.airResText.textContent = "OFF";
    }
    
    DOM.rangeReadoutBadge.textContent = `${proj.x.toFixed(1)} m`;
    DOM.heightReadoutBadge.textContent = `${proj.y.toFixed(1)} m`;
    
    DOM.telemetryRange.innerHTML = `R = ${proj.x.toFixed(2)} <span style="font-size: 0.95rem; font-weight:500;">m</span>`;
    DOM.telemetryHeight.textContent = `${proj.maxHeight.toFixed(2)} m`;
    DOM.telemetryTime.textContent = `${proj.time.toFixed(2)} s`;
    DOM.telemetryVelocity.textContent = `(${proj.vx.toFixed(2)}, ${proj.vy.toFixed(2)}) m/s`;
    
    // Sync the HUD overlay fields
    updateSuvatHUD();
}

function updateSuvatHUD() {
    const proj = state.projectile;
    if (!DOM.suvatS) return;
    
    // S (displacement components)
    DOM.suvatS.textContent = `x: ${proj.x.toFixed(2)}, y: ${proj.y.toFixed(2)} m`;
    
    // U (initial velocity components)
    DOM.suvatU.innerHTML = `u<sub>x</sub>: ${proj.initialUx.toFixed(2)}, u<sub>y</sub>: ${proj.initialUy.toFixed(2)} m/s`;
    
    // V (current velocity components)
    DOM.suvatV.innerHTML = `v<sub>x</sub>: ${proj.vx.toFixed(2)}, v<sub>y</sub>: ${proj.vy.toFixed(2)} m/s`;
    
    // A (acceleration components, resolving gravity + drag forces)
    const g = 9.81;
    let ax = 0;
    let ay = -g;
    
    if (proj.airResistanceEnabled) {
        const v = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
        const dragConst = 0.5 * 1.2 * proj.dragCoeff * 0.05;
        if (v > 0.001) {
            ax = -(dragConst * v * proj.vx) / proj.mass;
            ay = -g - (dragConst * v * proj.vy) / proj.mass;
        }
    }
    
    DOM.suvatA.innerHTML = `a<sub>x</sub>: ${ax.toFixed(2)}, a<sub>y</sub>: ${ay.toFixed(2)} m/s²`;
    
    // T (elapsed flight time)
    DOM.suvatT.textContent = `t: ${proj.time.toFixed(2)} s`;
}

function updateTrialsTable() {
    const proj = state.projectile;
    if (!DOM.trialsTableBody) return;
    
    DOM.trialsTableBody.innerHTML = '';
    
    if (proj.trials.length === 0) {
        DOM.trialsTableBody.innerHTML = '<tr class="empty-log-row"><td colspan="5" style="text-align: center; color: var(--text-muted); font-style: italic;">No launches yet.</td></tr>';
        return;
    }
    
    const reversedTrials = [...proj.trials].reverse();
    reversedTrials.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'row-mass';
        tr.innerHTML = `
            <td class="mono font-bold" style="color: var(--m5-color);">#${t.num}</td>
            <td class="mono">${t.angle}&deg;</td>
            <td class="mono">${t.speed} m/s</td>
            <td class="mono">${t.height.toFixed(1)} m</td>
            <td class="mono highlighted">${t.range.toFixed(2)} m</td>
        `;
        DOM.trialsTableBody.appendChild(tr);
    });
}

function projTick(timestamp) {
    if (state.activeView !== 'projectile') return;
    
    const proj = state.projectile;
    if (!proj.lastFrameTime) proj.lastFrameTime = timestamp;
    const dtReal = (timestamp - proj.lastFrameTime) / 1000.0;
    proj.lastFrameTime = timestamp;
    
    const dt = Math.min(0.08, dtReal * state.simSpeed);
    
    if (proj.isFlying && !proj.isPaused) {
        const g = 9.81;
        let ax = 0;
        let ay = -g;
        
        if (proj.airResistanceEnabled) {
            const v = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
            const dragConst = 0.5 * 1.2 * proj.dragCoeff * 0.05; // Simplified Cd coefficient scaling
            
            if (v > 0.001) {
                const decelX = -(dragConst * v * proj.vx) / proj.mass;
                const decelY = -(dragConst * v * proj.vy) / proj.mass;
                ax += decelX;
                ay += decelY;
            }
        }
        
        proj.vx += ax * dt;
        proj.vy += ay * dt;
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.time += dt;
        
        proj.currentPath.push({ x: proj.x, y: proj.y });
        
        if (proj.y > proj.maxHeight) {
            proj.maxHeight = proj.y;
        }
        
        if (proj.y <= 0) {
            proj.y = 0;
            proj.isFlying = false;
            
            playLandingSound();
            
            const trialNum = proj.trials.length + 1;
            proj.trials.push({
                num: trialNum,
                angle: proj.angle,
                speed: proj.speed,
                height: proj.height,
                range: proj.x,
                maxH: proj.maxHeight,
                airRes: proj.airResistanceEnabled ? `Cd=${proj.dragCoeff.toFixed(2)}` : 'OFF'
            });
            
            proj.ghostPaths.push([...proj.currentPath]);
            if (proj.ghostPaths.length > 3) {
                proj.ghostPaths.shift();
            }
            
            updateTrialsTable();
            
            DOM.launchBtn.querySelector('span').textContent = 'LAUNCH';
            DOM.launchBtn.style.background = 'rgba(168, 85, 247, 0.1)';
            DOM.launchBtn.style.color = 'var(--m5-color)';
            DOM.pauseBtnProj.classList.add('paused');
            DOM.pauseBtnProj.querySelector('span').textContent = 'PAUSE';
            
            showNotification(`Projectile landed! Range: ${proj.x.toFixed(1)} m`);
        }
        
        updateProjectileUI();
    }
    
    drawProjectileSimulation();
    requestAnimationFrame(projTick);
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
    
    // Pause projectile flight if active
    state.projectile.isFlying = false;
    
    DOM.simView.style.display = 'none';
    DOM.projectileView.style.display = 'none';
    DOM.homeView.style.display = 'flex';
    
    updateEngineHum();
}

function navigateToSim() {
    playClickSound();
    state.activeView = 'sim';
    state.projectile.isFlying = false;
    
    DOM.homeView.style.display = 'none';
    DOM.projectileView.style.display = 'none';
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

function navigateToProjectileSim() {
    playClickSound();
    state.activeView = 'projectile';
    state.isPlaying = false;
    
    DOM.homeView.style.display = 'none';
    DOM.simView.style.display = 'none';
    DOM.projectileView.style.display = 'grid';
    
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    resizeCanvasProj();
    resetProjectile();
    
    state.projectile.lastFrameTime = 0;
    requestAnimationFrame(projTick);
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

    // Setup ResizeObservers for canvas parent containers to handle responsive resizing seamlessly
    if (DOM.canvas && DOM.canvas.parentNode) {
        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(() => {
                resizeCanvas();
                if (state.activeView === 'sim') {
                    drawSimulation();
                }
            });
        });
        resizeObserver.observe(DOM.canvas.parentNode);
    }

    if (DOM.canvasProj && DOM.canvasProj.parentNode) {
        const resizeObserverProj = new ResizeObserver(() => {
            requestAnimationFrame(() => {
                resizeCanvasProj();
                if (state.activeView === 'projectile') {
                    drawProjectileSimulation();
                }
            });
        });
        resizeObserverProj.observe(DOM.canvasProj.parentNode);
    }

    // === PROJECTILE MOTION EVENT LISTENERS ===
    // Navigation
    DOM.cardProjectileSim.addEventListener('click', navigateToProjectileSim);
    DOM.homeBtnProj.addEventListener('click', navigateToHome);
    
    // Sliders
    DOM.sliderProjAngle.addEventListener('input', (e) => {
        state.projectile.angle = parseInt(e.target.value);
        resetProjectile();
    });
    DOM.sliderProjSpeed.addEventListener('input', (e) => {
        state.projectile.speed = parseFloat(e.target.value);
        resetProjectile();
    });
    DOM.sliderProjHeight.addEventListener('input', (e) => {
        state.projectile.height = parseFloat(e.target.value);
        resetProjectile();
    });
    DOM.sliderProjMass.addEventListener('input', (e) => {
        state.projectile.mass = parseFloat(e.target.value);
        updateProjectileUI();
    });
    DOM.sliderProjDrag.addEventListener('input', (e) => {
        state.projectile.dragCoeff = parseFloat(e.target.value);
        updateProjectileUI();
    });
    
    // Zoom Slider HUD listeners
    if (DOM.zoomSlider) {
        DOM.zoomSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            state.projectile.zoomMode = 'manual';
            state.projectile.manualScale = val / 2.5;
            drawProjectileSimulation();
        });
    }
    
    if (DOM.zoomInBtn) {
        DOM.zoomInBtn.addEventListener('click', () => {
            playClickSound();
            const proj = state.projectile;
            proj.zoomMode = 'manual';
            proj.manualScale = Math.min(40.0, proj.scale * 1.15);
            if (DOM.zoomSlider) {
                DOM.zoomSlider.value = Math.round(proj.manualScale * 2.5);
            }
            drawProjectileSimulation();
        });
    }
    
    if (DOM.zoomOutBtn) {
        DOM.zoomOutBtn.addEventListener('click', () => {
            playClickSound();
            const proj = state.projectile;
            proj.zoomMode = 'manual';
            proj.manualScale = Math.max(1.0, proj.scale * 0.85);
            if (DOM.zoomSlider) {
                DOM.zoomSlider.value = Math.round(proj.manualScale * 2.5);
            }
            drawProjectileSimulation();
        });
    }
    
    // Toggles
    DOM.airResToggle.addEventListener('change', (e) => {
        state.projectile.airResistanceEnabled = e.target.checked;
        playBeepSound(state.projectile.airResistanceEnabled ? 440 : 220, 0.12, 'sine');
        updateProjectileUI();
        drawProjectileSimulation();
    });
    DOM.gridToggle.addEventListener('change', (e) => {
        state.projectile.gridEnabled = e.target.checked;
        drawProjectileSimulation();
    });
    
    // Simulation controls
    DOM.launchBtn.addEventListener('click', () => {
        const proj = state.projectile;
        if (!proj.isFlying) {
            launchProjectile();
        } else {
            resetProjectile();
            setTimeout(launchProjectile, 50);
        }
    });
    
    DOM.pauseBtnProj.addEventListener('click', () => {
        const proj = state.projectile;
        if (proj.isFlying) {
            playClickSound();
            proj.isPaused = !proj.isPaused;
            DOM.pauseBtnProj.querySelector('span').textContent = proj.isPaused ? 'RESUME' : 'PAUSE';
            if (proj.isPaused) {
                DOM.pauseBtnProj.style.color = '#10b981';
                DOM.pauseBtnProj.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            } else {
                DOM.pauseBtnProj.style.color = '#f59e0b';
                DOM.pauseBtnProj.style.borderColor = 'rgba(245, 158, 11, 0.3)';
            }
        }
    });
    
    DOM.resetBtnProj.addEventListener('click', () => {
        playBeepSound(150, 0.15, 'sawtooth');
        resetProjectile();
        state.projectile.ghostPaths = [];
        state.projectile.trials = [];
        updateTrialsTable();
        drawProjectileSimulation();
        showNotification("Simulation reset: trails cleared");
    });
    
    // Header actions
    DOM.soundBtnProj.addEventListener('click', () => {
        state.isMuted = !state.isMuted;
        playClickSound();
        
        const paths = [DOM.soundBtn.querySelector('path'), DOM.soundBtnProj.querySelector('path')];
        const buttons = [DOM.soundBtn, DOM.soundBtnProj];
        
        paths.forEach((path, idx) => {
            if (!path) return;
            const btn = buttons[idx];
            if (state.isMuted) {
                path.setAttribute('d', 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z');
                btn.style.borderColor = 'var(--border-color)';
                btn.style.color = 'var(--text-secondary)';
                if (humGainNode) humGainNode.gain.value = 0;
            } else {
                path.setAttribute('d', 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z');
                btn.style.borderColor = 'var(--accent-cyan)';
                btn.style.color = 'var(--text-primary)';
                initAudio();
                updateEngineHum();
            }
        });
    });
    
    DOM.helpBtnProj.addEventListener('click', () => {
        playClickSound();
        DOM.projectileHelpModal.classList.add('active');
    });
    
    const closeHelpProj = () => {
        playClickSound();
        DOM.projectileHelpModal.classList.remove('active');
    };
    DOM.closeHelpBtnProj.addEventListener('click', closeHelpProj);
    DOM.closeHelpBtnOkProj.addEventListener('click', closeHelpProj);
    
    DOM.projectileHelpModal.addEventListener('click', (e) => {
        if (e.target === DOM.projectileHelpModal) closeHelpProj();
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
    if (state.isMuted) {
        const path = DOM.soundBtn.querySelector('path');
        const pathProj = DOM.soundBtnProj.querySelector('path');
        const mutePath = 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z';
        if (path) {
            path.setAttribute('d', mutePath);
            DOM.soundBtn.style.borderColor = 'var(--border-color)';
            DOM.soundBtn.style.color = 'var(--text-secondary)';
        }
        if (pathProj) {
            pathProj.setAttribute('d', mutePath);
            DOM.soundBtnProj.style.borderColor = 'var(--border-color)';
            DOM.soundBtnProj.style.color = 'var(--text-secondary)';
        }
    }
}

// Trigger initialization
window.addEventListener('DOMContentLoaded', init);
