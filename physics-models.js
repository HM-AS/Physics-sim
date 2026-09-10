/* Pure, SI-unit models shared by the laboratories and their regression tests. */
(function (root) {
    'use strict';
    const G = 6.67430e-11, EARTH_MASS = 5.972e24, EARTH_RADIUS = 6.371e6;
    function gravity(p, t = 0) {
        const M = p.mass * EARTH_MASS, r = p.radius * EARTH_RADIUS;
        const g = G * M / (r * r), potential = -G * M / r;
        const speed = Math.sqrt(G * M / r), period = 2 * Math.PI * r / speed;
        return { M, r, g, potential, speed, period, force: p.satellite * g,
            energy: -G * M * p.satellite / (2 * r), angle: t * speed / r };
    }
    function circuit(p) {
        const resistance = p.topology === 'series' ? p.r1 + p.r2 : 1 / (1 / p.r1 + 1 / p.r2);
        const current = p.closed ? p.voltage / (resistance + p.internal) : 0;
        const terminal = p.voltage - current * p.internal;
        const loadVoltage = p.closed ? terminal : 0;
        const i1 = p.topology === 'series' ? current : loadVoltage / p.r1;
        const i2 = p.topology === 'series' ? current : loadVoltage / p.r2;
        const v1 = i1 * p.r1, v2 = i2 * p.r2;
        return { resistance, current, terminal, loadVoltage, i1, i2, v1, v2,
            p1: i1 * v1, p2: i2 * v2, loss: current * current * p.internal,
            sourcePower: p.voltage * current };
    }
    function wave(p, x, t = 0) {
        const wavelength = p.speed / p.frequency, k = 2 * Math.PI / wavelength;
        const omega = 2 * Math.PI * p.frequency, phase = p.phase * Math.PI / 180;
        const y1 = p.a1 * Math.sin(k * x - omega * t);
        const y2 = p.a2 * Math.sin(k * x + (p.direction === 'opposite' ? omega * t : -omega * t) + phase);
        return { y1, y2, y: y1 + y2, wavelength, period: 1 / p.frequency };
    }
    function shm(p, t = 0) {
        const omega = Math.sqrt(p.stiffness / p.mass), period = 2 * Math.PI / omega;
        const x = p.amplitude * Math.cos(omega * t);
        const v = -p.amplitude * omega * Math.sin(omega * t), a = -omega * omega * x;
        return { omega, period, x, v, a, kinetic: 0.5 * p.mass * v * v,
            potential: 0.5 * p.stiffness * x * x, energy: 0.5 * p.stiffness * p.amplitude * p.amplitude };
    }
    const models = Object.freeze({ G, EARTH_MASS, EARTH_RADIUS, gravity, circuit, wave, shm });
    if (typeof module !== 'undefined' && module.exports) module.exports = models;
    else root.PhysicsModels = models;
})(typeof globalThis !== 'undefined' ? globalThis : this);
