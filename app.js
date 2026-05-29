/**
 * MULTI-MASS TENSION VISUALIZER - Core Logic & Physics Engine
 * Built with HTML5 Canvas, SVG, Web Audio API, and vanilla JS.
 */

// --- STATE MANAGEMENT ---
const state = {
    // Physical Parameters
    masses: {
        m1: 1.0, // kg
        m2: 2.0, // kg
        m3: 3.0, // kg
        m4: 4.0  // kg
    },
    appliedForce: 50.0, // N
    frictionEnabled: false,
    frictionCoef: 0.20, // mu_k
    gravity: 9.81, // m/s^2

    // Calculated Variables
    totalMass: 10.0,
    frictionForce: 0.0,
    netForce: 50.0,
    acceleration: 5.0, // m/s^2
    tensions: {
        t1: 5.0,
        t2: 15.0,
        t3: 30.0
    },

    // Simulation Clock
    isPlaying: false,
    simSpeed: 1.0, // multiplier: 0.5, 1.0, 2.0
    position: 0.0, // m (accumulated distance)
    velocity: 0.0, // m/s
    lastFrameTime: 0,

    // Audio Control
    isMuted: true, // Default to muted for better initial UX

    // Dragging state
    isDialDragging: false
};

// --- DOM ELEMENTS ---
const DOM = {
    // Sliders
    m1Slider: document.getElementById('m1-slider'),
    m2Slider: document.getElementById('m2-slider'),
    m3Slider: document.getElementById('m3-slider'),
    m4Slider: document.getElementById('m4-slider'),
    
    // Sliders Readouts
    m1Val: document.getElementById('m1-val'),
    m2Val: document.getElementById('m2-val'),
    m3Val: document.getElementById('m3-val'),
    m4Val: document.getElementById('m4-val'),
    
    // Force Inputs
    forceDial: document.getElementById('force-dial'),
    dialFillCircle: document.getElementById('dial-fill-circle'),
    dialIndicatorLine: document.getElementById('dial-indicator-line'),
    dialText: document.getElementById('dial-text'),
    forceSlider: document.getElementById('force-slider'),
    
    // Toggles
    frictionToggle: document.getElementById('friction-toggle'),
    frictionBadge: document.getElementById('friction-badge'),
    frictionText: document.getElementById('friction-text'),
    
    // Buttons & Speed
    playBtn: document.getElementById('playBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resetBtn: document.getElementById('resetBtn'),
    speedOptions: document.querySelectorAll('.speed-option'),
    soundBtn: document.getElementById('soundBtn'),
    helpBtn: document.getElementById('helpBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    
    // Canvas & Badges
    canvas: document.getElementById('physics-canvas'),
    distanceReadout: document.getElementById('distance-readout'),
    velocityReadout: document.getElementById('velocity-readout'),
    
    // Graph
    graphSvg: document.getElementById('tension-graph'),
    graphLine: document.getElementById('graph-line'),
    graphArea: document.getElementById('graph-area'),
    graphPoints: document.getElementById('graph-points'),
    graphGrid: DOM_getGraphGridElement(),
    
    // Table Cells
    tblM1Val: document.getElementById('tbl-m1-val'),
    tblM1Acc: document.getElementById('tbl-m1-acc'),
    tblM1Ten: document.getElementById('tbl-m1-ten'),
    tblM2Val: document.getElementById('tbl-m2-val'),
    tblM2Acc: document.getElementById('tbl-m2-acc'),
    tblM2Ten: document.getElementById('tbl-m2-ten'),
    tblM3Val: document.getElementById('tbl-m3-val'),
    tblM3Acc: document.getElementById('tbl-m3-acc'),
    tblM3Ten: document.getElementById('tbl-m3-ten'),
    tblM4Val: document.getElementById('tbl-m4-val'),
    tblM4Acc: document.getElementById('tbl-m4-acc'),
    tblM4Ten: document.getElementById('tbl-m4-ten'),
    
    // Accel Display
    systemAccel: document.getElementById('system-accel'),
    lblTotalMass: document.getElementById('lbl-total-mass'),
    lblNetForce: document.getElementById('lbl-net-force'),

    // Modals
    helpModal: document.getElementById('helpModal'),
    closeHelpBtn: document.getElementById('closeHelpBtn'),
    closeHelpBtnOk: document.getElementById('closeHelpBtnOk')
};

// Quick helper to fetch grid group safely
function DOM_getGraphGridElement() {
    const svg = document.getElementById('tension-graph');
    return svg ? svg.querySelector('.graph-grid') : null;
}

// --- WEB AUDIO SYNTHESIZER ---
let audioCtx = null;
let humOscillator = null;
let humGainNode = null;

function initAudio() {
    if (audioCtx) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        
        // Create hum oscillator for moving sound
        humOscillator = audioCtx.createOscillator();
        humGainNode = audioCtx.createGain();
        
        humOscillator.type = 'sawtooth'; // rich sound
        humOscillator.frequency.value = 40; // low frequency hum
        
        // Add a lowpass filter to make it smooth and engine-like
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 180;
        
        humOscillator.connect(filter);
        filter.connect(humGainNode);
        humGainNode.connect(audioCtx.destination);
        
        humGainNode.gain.value = 0; // Start silent
        humOscillator.start(0);
    } catch (e) {
        console.warn("Web Audio API not supported or blocked: ", e);
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
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
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
        // Pitch increases with velocity
        const pitch = Math.min(220, 40 + state.velocity * 6);
        humOscillator.frequency.setTargetAtTime(pitch, audioCtx.currentTime, 0.1);
        
        // Volume depends on velocity and acceleration
        const targetVolume = Math.min(0.15, 0.02 + state.velocity * 0.015);
        humGainNode.gain.setTargetAtTime(targetVolume, audioCtx.currentTime, 0.1);
    } else {
        // Fade out hum
        humGainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.15);
    }
}

// --- PHYSICS CALCULATIONS ---
function calculatePhysics() {
    // Total Mass
    state.totalMass = state.masses.m1 + state.masses.m2 + state.masses.m3 + state.masses.m4;
    
    // Friction calculations
    if (state.frictionEnabled) {
        state.frictionForce = state.frictionCoef * state.gravity * state.totalMass;
    } else {
        state.frictionForce = 0.0;
    }
    
    // Net Force and System Acceleration
    state.netForce = Math.max(0.0, state.appliedForce - state.frictionForce);
    
    if (state.totalMass > 0) {
        state.acceleration = state.netForce / state.totalMass;
    } else {
        state.acceleration = 0;
    }
    
    // Individual Tension Calculations
    // Tension on a segment pulling the masses behind it
    // T_i = sum(M_1..i) * a_eff
    // As derived, a_eff is exactly F / M_total under uniform friction
    const tensionAcceleration = state.totalMass > 0 ? (state.appliedForce / state.totalMass) : 0;
    
    state.tensions.t1 = state.masses.m1 * tensionAcceleration;
    state.tensions.t2 = (state.masses.m1 + state.masses.m2) * tensionAcceleration;
    state.tensions.t3 = (state.masses.m1 + state.masses.m2 + state.masses.m3) * tensionAcceleration;
    
    // Safety clamp check (if Force is 0, tensions must be 0)
    if (state.appliedForce === 0) {
        state.tensions.t1 = 0;
        state.tensions.t2 = 0;
        state.tensions.t3 = 0;
    }
    
    // Update displays
    updateUIElements();
}

// --- UI UPDATER ---
function updateUIElements() {
    // Update Mass labels
    DOM.m1Val.textContent = `${state.masses.m1.toFixed(1)} kg`;
    DOM.m2Val.textContent = `${state.masses.m2.toFixed(1)} kg`;
    DOM.m3Val.textContent = `${state.masses.m3.toFixed(1)} kg`;
    DOM.m4Val.textContent = `${state.masses.m4.toFixed(1)} kg`;
    
    // Update Data Table
    DOM.tblM1Val.textContent = `${state.masses.m1.toFixed(1)} kg`;
    DOM.tblM1Acc.textContent = state.acceleration.toFixed(2);
    DOM.tblM1Ten.textContent = `${state.tensions.t1.toFixed(1)} N`;
    
    DOM.tblM2Val.textContent = `${state.masses.m2.toFixed(1)} kg`;
    DOM.tblM2Acc.textContent = state.acceleration.toFixed(2);
    DOM.tblM2Ten.textContent = `${state.tensions.t2.toFixed(1)} N`;
    
    DOM.tblM3Val.textContent = `${state.masses.m3.toFixed(1)} kg`;
    DOM.tblM3Acc.textContent = state.acceleration.toFixed(2);
    DOM.tblM3Ten.textContent = `${state.tensions.t3.toFixed(1)} N`;
    
    DOM.tblM4Val.textContent = `${state.masses.m4.toFixed(1)} kg`;
    DOM.tblM4Acc.textContent = state.acceleration.toFixed(2);
    // Mass 4 is pulled by the Applied Force F
    DOM.tblM4Ten.textContent = `${state.appliedForce.toFixed(1)} N`;
    
    // Update Accel display
    DOM.systemAccel.innerHTML = `a = ${state.acceleration.toFixed(2)} <span style="font-size: 1rem; font-weight:500;">m/s²</span>`;
    DOM.lblTotalMass.textContent = `${state.totalMass.toFixed(1)} kg`;
    
    const displayNetForce = state.frictionEnabled ? Math.max(0, state.appliedForce - state.frictionForce) : state.appliedForce;
    DOM.lblNetForce.textContent = `${displayNetForce.toFixed(1)} N`;
    
    // Slider values
    DOM.m1Slider.value = state.masses.m1;
    DOM.m2Slider.value = state.masses.m2;
    DOM.m3Slider.value = state.masses.m3;
    DOM.m4Slider.value = state.masses.m4;
    DOM.forceSlider.value = state.appliedForce;
    
    // Update Dial UI
    updateDialUI(state.appliedForce);
    
    // Update Graph
    drawTensionGraph();
    
    // Check if friction limits movement
    const frictionBadge = DOM.frictionBadge;
    if (state.frictionEnabled) {
        frictionBadge.classList.add('active');
        DOM.frictionText.textContent = "ON";
        DOM.frictionToggle.checked = true;
    } else {
        frictionBadge.classList.remove('active');
        DOM.frictionText.textContent = "OFF";
        DOM.frictionToggle.checked = false;
    }
}

// --- ROTARY DIAL INTERACTION ---
function updateDialUI(forceValue) {
    DOM.dialText.textContent = `${Math.round(forceValue)} N`;
    
    // The force dial spans from -135deg (SW) to +135deg (SE). That's a 270 degree arc.
    // In terms of degrees clockwise from 12 o'clock, that is from 225 deg to 495 deg (135 deg).
    const pct = forceValue / 100;
    const angle = 225 + pct * 270;
    
    // Rotate indicator line
    DOM.dialIndicatorLine.setAttribute('transform', `rotate(${angle} 50 50)`);
    
    // Draw arc fill
    // Dasharray is 282.7 (perimeter for r=45). 270 deg is 75% of circle -> max fill is 212.0
    const strokeDash = 282.7;
    const maxOffset = 212.0;
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
    
    // Convert angle to standard clockwise relative to 12 o'clock (0 to 360)
    let theta = angleDeg + 90;
    if (theta < 0) theta += 360;
    
    // SW is 225 deg, SE is 135 deg. Dead zone is from 135 to 225 (90 degrees).
    let valAngle = (theta - 225 + 360) % 360;
    let targetForce = 0;
    
    if (valAngle >= 0 && valAngle <= 270) {
        targetForce = (valAngle / 270) * 100;
    } else {
        // In the dead zone at bottom: snap to closest extreme
        if (valAngle > 315) {
            targetForce = 0;
        } else {
            targetForce = 100;
        }
    }
    
    // Clamp
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

// --- SVG GRAPH DRAWING (Tension vs. Position) ---
function drawTensionGraph() {
    const width = 320;
    const height = 200;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;
    
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;
    
    const y0 = height - paddingBottom; // Y coordinate for 0 N (160)
    const x0 = paddingLeft; // X coordinate for left axis (40)
    
    // Generate grid lines once if not present, or clear and redraw
    if (DOM.graphGrid) {
        DOM.graphGrid.innerHTML = '';
        // Horizontal grid lines (25%, 50%, 75%)
        for (let i = 1; i <= 4; i++) {
            const y = y0 - (i / 4) * plotHeight;
            const textVal = i * 25;
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x0);
            line.setAttribute('y1', y);
            line.setAttribute('x2', width - paddingRight);
            line.setAttribute('y2', y);
            DOM.graphGrid.appendChild(line);
            
            // Add vertical axis labels (Tension values)
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x0 - 8);
            text.setAttribute('y', y + 3);
            text.setAttribute('class', 'graph-axis-label text-anchor-end');
            text.textContent = textVal;
            DOM.graphGrid.appendChild(text);
        }
    }
    
    // Map tension points to step graph coordinates
    // We have 5 segments on X-axis:
    // Left of M1 (T=0) -> segment 0
    // M1 to M2 (T=T1) -> segment 1
    // M2 to M3 (T=T2) -> segment 2
    // M3 to M4 (T=T3) -> segment 3
    // Right of M4 (T=F) -> segment 4
    
    const stepCount = 4; // M1, M2, M3, M4
    const segWidth = plotWidth / stepCount; // 260 / 4 = 65px
    
    const positions = [
        { x: x0, y: y0 }, // start at (40, 160)
        { x: x0 + segWidth * 0.7, y: y0, label: "M1" }, // M1 position
        { x: x0 + segWidth * 1.7, y: y0, label: "M2" }, // M2 position
        { x: x0 + segWidth * 2.7, y: y0, label: "M3" }, // M3 position
        { x: x0 + segWidth * 3.7, y: y0, label: "M4" }  // M4 position
    ];
    
    // Tensions: 0, T1, T2, T3, F
    const tensionsList = [0, state.tensions.t1, state.tensions.t2, state.tensions.t3, state.appliedForce];
    
    // Draw step path:
    // We start at (x0, y0)
    // Horizontal to positions[1].x, then jump up to tensionsList[1] (T1)
    // Horizontal to positions[2].x, then jump up to tensionsList[2] (T2)
    // etc.
    let pathD = `M ${x0} ${y0}`;
    let fillD = `M ${x0} ${y0}`;
    
    const screenY = (val) => y0 - (val / 100) * plotHeight;
    
    for (let i = 1; i <= 4; i++) {
        const prevTensionY = screenY(tensionsList[i-1]);
        const currentTensionY = screenY(tensionsList[i]);
        const currentX = positions[i].x;
        
        // Horizontal to current X
        pathD += ` H ${currentX}`;
        fillD += ` H ${currentX}`;
        
        // Vertical step up to new tension
        pathD += ` V ${currentTensionY}`;
        fillD += ` V ${currentTensionY}`;
    }
    
    // Finish step segment right of M4
    const endX = width - paddingRight;
    const finalY = screenY(state.appliedForce);
    pathD += ` H ${endX}`;
    fillD += ` H ${endX}`;
    
    // Close fill area
    fillD += ` V ${y0} H ${x0} Z`;
    
    // Set path attributes
    DOM.graphLine.setAttribute('d', pathD);
    DOM.graphArea.setAttribute('d', fillD);
    
    // Draw Data Point Dots & Labels
    DOM.graphPoints.innerHTML = '';
    
    for (let i = 1; i <= 4; i++) {
        const x = positions[i].x;
        const y = screenY(tensionsList[i]);
        
        // Add vertical lines to show block location
        const guideLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        guideLine.setAttribute('x1', x);
        guideLine.setAttribute('y1', y0);
        guideLine.setAttribute('x2', x);
        guideLine.setAttribute('y2', y0 + 6);
        guideLine.setAttribute('stroke', 'rgba(255, 255, 255, 0.15)');
        guideLine.setAttribute('stroke-width', '1');
        DOM.graphPoints.appendChild(guideLine);
        
        // Add label text for masses on X axis
        const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        xLabel.setAttribute('x', x);
        xLabel.setAttribute('y', y0 + 18);
        xLabel.setAttribute('class', 'graph-axis-label');
        xLabel.setAttribute('text-anchor', 'middle');
        xLabel.textContent = positions[i].label;
        // color the X label to match mass
        let labelColor = 'var(--text-secondary)';
        if (i === 1) labelColor = 'var(--m1-color)';
        if (i === 2) labelColor = 'var(--m2-color)';
        if (i === 3) labelColor = 'var(--m3-color)';
        if (i === 4) labelColor = 'var(--m4-color)';
        xLabel.setAttribute('fill', labelColor);
        xLabel.style.fontWeight = 'bold';
        DOM.graphPoints.appendChild(xLabel);
        
        // Circle Dot representing tension value at the rope attachment point
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '4.5');
        
        // Colors match the tension context
        let dotColor = 'var(--accent-cyan)';
        if (i === 1) dotColor = 'var(--m1-color)';
        if (i === 2) dotColor = 'var(--m2-color)';
        if (i === 3) dotColor = 'var(--m3-color)';
        if (i === 4) dotColor = 'var(--force-color)';
        
        circle.setAttribute('fill', dotColor);
        circle.setAttribute('stroke', '#0d1222');
        circle.setAttribute('stroke-width', '1.5');
        circle.setAttribute('class', 'graph-dot');
        
        // Simple SVG tooltip on hover
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        const tensionVal = tensionsList[i].toFixed(1);
        title.textContent = i === 4 ? `Applied Force = ${tensionVal} N` : `Tension T${i} = ${tensionVal} N`;
        circle.appendChild(title);
        
        DOM.graphPoints.appendChild(circle);
    }
}

// Add SVG Gradient Definitions once
function setupGraphGradients() {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // Gradient for filled area under graph line
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

// --- CANVAS 2D PHYSICS SIMULATION ---
let ctx = null;
let canvasWidth = 800;
let canvasHeight = 400;
let gridOffset = 0;
let forceArrowOffset = 0; // For dash animation of the applied force vector arrow

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

// Helper to draw rounded rectangles on canvas
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

// Color interpolation for ropes
function interpolateColor(color1, color2, factor) {
    const r = Math.round(color1[0] + factor * (color2[0] - color1[0]));
    const g = Math.round(color1[1] + factor * (color2[1] - color1[1]));
    const b = Math.round(color1[2] + factor * (color2[2] - color1[2]));
    return `rgb(${r}, ${g}, ${b})`;
}

function drawSimulation() {
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // 1. Draw Grid Background (light blue/gray)
    const gridSize = 40;
    const floorY = Math.round(canvasHeight * 0.72); // Rest on floor (72% height)
    
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    
    // Vertical grid lines scrolling
    const scrollOffset = gridOffset % gridSize;
    for (let x = scrollOffset; x < canvasWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, floorY);
        ctx.stroke();
    }
    
    // Horizontal grid lines (static)
    for (let y = 0; y < floorY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
    }
    
    // 2. Draw Ground / Floor
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(canvasWidth, floorY);
    ctx.stroke();
    
    // Ground friction hatch markings if enabled
    if (state.frictionEnabled) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.08)';
        ctx.lineWidth = 2;
        const hatchSpacing = 16;
        const hatchOffset = (gridOffset * 1.2) % hatchSpacing; // scroll hatches too
        for (let x = hatchOffset - 20; x < canvasWidth + 20; x += hatchSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, floorY);
            ctx.lineTo(x - 8, floorY + 12);
            ctx.stroke();
        }
    }
    
    // 3. Define Block Sizes & Relative Positions
    // Blocks rest horizontally. They are drawn relative to center of screen.
    // Width and height of blocks depend on their mass: size = base + mass * factor
    const baseBlockSize = 50;
    const massFactor = 8;
    
    const sizes = [
        baseBlockSize + state.masses.m1 * massFactor,
        baseBlockSize + state.masses.m2 * massFactor,
        baseBlockSize + state.masses.m3 * massFactor,
        baseBlockSize + state.masses.m4 * massFactor
    ];
    
    // Distance between block centers or rope lengths
    const ropeLength = 100; 
    
    // Calculate layout coordinates centered horizontally
    // Center point of chain is W/2
    const totalChainWidth = sizes[0] + ropeLength + sizes[1] + ropeLength + sizes[2] + ropeLength + sizes[3];
    const chainStart = (canvasWidth - totalChainWidth) / 2;
    
    const blockX = [];
    let currentX = chainStart;
    for (let i = 0; i < 4; i++) {
        blockX.push(currentX);
        currentX += sizes[i] + ropeLength;
    }
    
    // 4. Draw Ropes / Connected Strings with Tension visual feedback
    const baseRopeRGB = [200, 206, 218]; // Neutral gray/blue
    const activeRopeRGB = [249, 115, 22]; // Vivid Orange/Red
    
    const maxTensionVal = 100;
    const tensionsList = [state.tensions.t1, state.tensions.t2, state.tensions.t3];
    
    for (let i = 0; i < 3; i++) {
        const tension = tensionsList[i];
        const tensionRatio = Math.min(1.0, tension / maxTensionVal);
        
        // Coordinate points: Right of block i, to left of block i+1
        const xStart = blockX[i] + sizes[i];
        const yStart = floorY - sizes[i] / 2;
        const xEnd = blockX[i+1];
        const yEnd = floorY - sizes[i+1] / 2;
        
        // Visual variables based on tension
        const ropeColor = interpolateColor(baseRopeRGB, activeRopeRGB, tensionRatio);
        const thickness = 2 + tensionRatio * 7; // range from 2px to 9px thickness
        
        ctx.save();
        
        // Rope Shadow Glow for tension
        if (tensionRatio > 0.05) {
            ctx.shadowColor = `rgba(249, 115, 22, ${tensionRatio * 0.7})`;
            ctx.shadowBlur = tensionRatio * 12;
        }
        
        ctx.strokeStyle = ropeColor;
        ctx.lineWidth = thickness;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(xStart, yStart);
        ctx.lineTo(xEnd, yEnd);
        ctx.stroke();
        
        ctx.restore();
        
        // 5. Draw Rope Tension Labels (T1, T2, T3 overlay)
        ctx.font = '700 11px var(--font-mono)';
        ctx.fillStyle = tensionRatio > 0.3 ? 'var(--accent-cyan)' : '#475569';
        ctx.textAlign = 'center';
        const labelX = (xStart + xEnd) / 2;
        const labelY = (yStart + yEnd) / 2 - 10;
        ctx.fillText(`T${i+1}: ${tension.toFixed(1)}N`, labelX, labelY);
    }
    
    // 6. Draw the Four Mass Blocks
    const massColors = ['var(--m1-color)', 'var(--m2-color)', 'var(--m3-color)', 'var(--m4-color)'];
    
    for (let i = 0; i < 4; i++) {
        const x = blockX[i];
        const size = sizes[i];
        const y = floorY - size;
        const radius = 8;
        
        // Glassmorphic / clean filled box style
        const boxColor = massColors[i];
        
        ctx.save();
        // Shadow for premium volumetric feel
        ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        
        // Solid colored base
        drawRoundedRect(ctx, x, y, size, size, radius, boxColor, 'rgba(0, 0, 0, 0.15)', 1.5);
        
        // Inner gradient shimmer for premium sheen
        const shimmer = ctx.createLinearGradient(x, y, x + size, y + size);
        shimmer.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        shimmer.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)');
        shimmer.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
        drawRoundedRect(ctx, x, y, size, size, radius, shimmer, null);
        
        ctx.restore();
        
        // Inside block text: Name (e.g. M1) and Mass Value
        ctx.textAlign = 'center';
        
        // Bold name
        ctx.fillStyle = '#ffffff';
        ctx.font = `800 ${size > 60 ? '14px' : '12px'} var(--font-sans)`;
        ctx.fillText(`M${i+1}`, x + size / 2, y + size / 2 - 4);
        
        // Value text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = `700 ${size > 60 ? '11px' : '9.5px'} var(--font-mono)`;
        ctx.fillText(`${state.masses[`m${i+1}`].toFixed(1)}kg`, x + size / 2, y + size / 2 + 10);
    }
    
    // 7. Draw Applied Force Vector Arrow (from M4 pointing right)
    const m4Idx = 3;
    const forceRatio = state.appliedForce / maxTensionVal;
    
    if (state.appliedForce > 0.1) {
        const xStart = blockX[m4Idx] + sizes[m4Idx];
        const yStart = floorY - sizes[m4Idx] / 2;
        
        // Arrow scales with force
        const arrowLength = 50 + forceRatio * 80;
        const xEnd = xStart + arrowLength;
        const yEnd = yStart;
        
        ctx.save();
        
        // Glowing red vector line
        ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        // Dashed crawl animation when simulation is running
        ctx.beginPath();
        ctx.moveTo(xStart, yStart);
        ctx.lineTo(xEnd, yEnd);
        
        // Crawl speed depends on force magnitude
        if (state.isPlaying) {
            ctx.setLineDash([8, 6]);
            ctx.lineDashOffset = -forceArrowOffset;
        }
        ctx.stroke();
        
        ctx.restore();
        
        // Draw Arrowhead
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(xEnd, yEnd);
        ctx.lineTo(xEnd - 12, yEnd - 7);
        ctx.lineTo(xEnd - 10, yEnd);
        ctx.lineTo(xEnd - 12, yEnd + 7);
        ctx.closePath();
        ctx.fill();
        
        // Text vector label: "F = 50.0 N"
        ctx.font = '800 12px var(--font-sans)';
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'left';
        ctx.fillText(`F: ${state.appliedForce.toFixed(1)} N`, xEnd + 8, yEnd + 4);
    }
}

// --- SIMULATION TICK LOOP ---
function simTick(timestamp) {
    if (!state.lastFrameTime) {
        state.lastFrameTime = timestamp;
    }
    
    const dtReal = (timestamp - state.lastFrameTime) / 1000.0; // in seconds
    state.lastFrameTime = timestamp;
    
    // Apply speed multiplier, limit dt spike if tab was inactive
    const dt = Math.min(0.1, dtReal * state.simSpeed);
    
    if (state.isPlaying) {
        // Integrate Physics
        if (state.acceleration > 0) {
            // Update velocity and distance
            state.velocity += state.acceleration * dt;
        } else {
            // Friction is slowing us down or system is static
            if (state.frictionEnabled && state.velocity > 0) {
                // Apply sliding deceleration if force is small
                const frictionDecel = state.frictionCoef * state.gravity;
                state.velocity = Math.max(0, state.velocity - frictionDecel * dt);
            } else {
                state.velocity = 0;
            }
        }
        
        state.position += state.velocity * dt;
        
        // Move visual grid & floor hatching to the left
        const scale = 50; // pixels per meter
        gridOffset -= state.velocity * dt * scale;
        
        // Dash animation offset for Force Vector
        forceArrowOffset += (state.appliedForce * 0.15 + 5.0) * dt * 4;
        
        // Update Canvas labels
        DOM.distanceReadout.textContent = `${state.position.toFixed(1)} m`;
        DOM.velocityReadout.textContent = `${state.velocity.toFixed(1)} m/s`;
        
        // Audio synthesis update
        updateEngineHum();
    }
    
    // Draw
    drawSimulation();
    
    // Loop
    requestAnimationFrame(simTick);
}

// --- EVENT LISTENERS AND BINDINGS ---
function setupEventListeners() {
    // 1. Mass Sliders
    DOM.m1Slider.addEventListener('input', (e) => {
        state.masses.m1 = parseFloat(e.target.value);
        calculatePhysics();
    });
    DOM.m2Slider.addEventListener('input', (e) => {
        state.masses.m2 = parseFloat(e.target.value);
        calculatePhysics();
    });
    DOM.m3Slider.addEventListener('input', (e) => {
        state.masses.m3 = parseFloat(e.target.value);
        calculatePhysics();
    });
    DOM.m4Slider.addEventListener('input', (e) => {
        state.masses.m4 = parseFloat(e.target.value);
        calculatePhysics();
    });
    
    // 2. Horizontal Force Range Input fallback
    DOM.forceSlider.addEventListener('input', (e) => {
        state.appliedForce = parseFloat(e.target.value);
        calculatePhysics();
    });
    
    // 3. Friction Toggle
    DOM.frictionToggle.addEventListener('change', (e) => {
        state.frictionEnabled = e.target.checked;
        playBeepSound(state.frictionEnabled ? 440 : 220, 0.12, 'sine');
        calculatePhysics();
    });
    
    // 4. Play / Pause / Reset Buttons
    DOM.playBtn.addEventListener('click', () => {
        playClickSound();
        if (!state.isPlaying) {
            state.isPlaying = true;
            state.lastFrameTime = 0; // reset delta tracker
            DOM.playBtn.style.background = 'rgba(16, 185, 129, 0.25)';
            DOM.pauseBtn.classList.remove('paused');
            
            // Web Audio unlock on user gesture
            initAudio();
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
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
        
        DOM.playBtn.style.background = 'rgba(16, 185, 129, 0.1)';
        DOM.pauseBtn.classList.add('paused');
        
        DOM.distanceReadout.textContent = "0.0 m";
        DOM.velocityReadout.textContent = "0.0 m/s";
        
        updateEngineHum();
        drawSimulation();
    });
    
    // 5. Speed Options
    DOM.speedOptions.forEach(opt => {
        opt.addEventListener('click', (e) => {
            playClickSound();
            DOM.speedOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            state.simSpeed = parseFloat(opt.dataset.speed);
        });
    });
    
    // 6. Sound Action Header Button
    DOM.soundBtn.addEventListener('click', () => {
        state.isMuted = !state.isMuted;
        
        const path = DOM.soundBtn.querySelector('path');
        if (state.isMuted) {
            // Mute Icon
            path.setAttribute('d', 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z');
            DOM.soundBtn.style.borderColor = 'var(--border-color)';
            DOM.soundBtn.style.color = 'var(--text-secondary)';
            
            // Silence hum
            if (humGainNode) humGainNode.gain.value = 0;
        } else {
            // Volume Up Icon
            path.setAttribute('d', 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z');
            DOM.soundBtn.style.borderColor = 'var(--accent-cyan)';
            DOM.soundBtn.style.color = 'var(--text-primary)';
            
            // Activate audio
            initAudio();
            updateEngineHum();
        }
    });
    
    // 7. Modal Events
    DOM.helpBtn.addEventListener('click', () => {
        playClickSound();
        DOM.helpModal.classList.add('active');
    });
    
    const closeModal = () => {
        playClickSound();
        DOM.helpModal.classList.remove('active');
    };
    DOM.closeHelpBtn.addEventListener('click', closeModal);
    DOM.closeHelpBtnOk.addEventListener('click', closeModal);
    
    DOM.helpModal.addEventListener('click', (e) => {
        if (e.target === DOM.helpModal) {
            closeModal();
        }
    });
    
    DOM.settingsBtn.addEventListener('click', () => {
        playClickSound();
        // Cycle ground friction coefficient for settings fun!
        if (state.frictionCoef === 0.20) {
            state.frictionCoef = 0.40;
            playBeepSound(400, 0.15, 'triangle');
            showNotification("Friction Coefficient set to High (μ = 0.40)");
        } else if (state.frictionCoef === 0.40) {
            state.frictionCoef = 0.05;
            playBeepSound(600, 0.15, 'triangle');
            showNotification("Friction Coefficient set to Ice (μ = 0.05)");
        } else {
            state.frictionCoef = 0.20;
            playBeepSound(500, 0.15, 'triangle');
            showNotification("Friction Coefficient set to Standard (μ = 0.20)");
        }
        calculatePhysics();
    });
    
    // Window Resize handling
    window.addEventListener('resize', () => {
        resizeCanvas();
        drawSimulation();
    });
}

// Clean notification toast creator
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
    
    // animate in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    // remove after 3s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 2500);
}

// --- SYSTEM INITIALIZATION ---
function init() {
    setupGraphGradients();
    setupDialInteractions();
    setupEventListeners();
    
    // Sync sound button icon with state.isMuted on init
    const path = DOM.soundBtn.querySelector('path');
    if (state.isMuted && path) {
        path.setAttribute('d', 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z');
        DOM.soundBtn.style.borderColor = 'var(--border-color)';
        DOM.soundBtn.style.color = 'var(--text-secondary)';
    }
    
    resizeCanvas();
    calculatePhysics(); // First computation
    
    // Kickstart canvas animation rendering loop
    requestAnimationFrame(simTick);
    
    // Play a welcoming sound
    setTimeout(() => {
        // Subtle hint sound
        playBeepSound(440, 0.25, 'sine');
    }, 1000);
}

// Boot up system when DOM is fully loaded
window.addEventListener('DOMContentLoaded', init);
