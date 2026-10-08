/* Pure, SI-unit models shared by the laboratories and their regression tests. */
(function (root) {
    'use strict';
    const G = 6.67430e-11, EARTH_MASS = 5.972e24, EARTH_RADIUS = 6.371e6;
    function gravity(p, t = 0, out = {}) {
        const M = p.mass * EARTH_MASS, r = p.radius * EARTH_RADIUS;
        const g = G * M / (r * r), potential = -G * M / r;
        const speed = Math.sqrt(G * M / r), period = 2 * Math.PI * r / speed;
        out.M=M;out.r=r;out.g=g;out.potential=potential;out.speed=speed;out.period=period;out.force=p.satellite*g;out.energy=-G*M*p.satellite/(2*r);out.angle=t*speed/r;return out;
    }
    function circuit(p, out = {}) {
        const resistance = p.topology === 'series' ? p.r1 + p.r2 : 1 / (1 / p.r1 + 1 / p.r2);
        const current = p.closed ? p.voltage / (resistance + p.internal) : 0;
        const terminal = p.voltage - current * p.internal;
        const loadVoltage = p.closed ? terminal : 0;
        const i1 = p.topology === 'series' ? current : loadVoltage / p.r1;
        const i2 = p.topology === 'series' ? current : loadVoltage / p.r2;
        const v1 = i1 * p.r1, v2 = i2 * p.r2;
        out.resistance=resistance;out.current=current;out.terminal=terminal;out.loadVoltage=loadVoltage;out.i1=i1;out.i2=i2;out.v1=v1;out.v2=v2;out.p1=i1*v1;out.p2=i2*v2;out.loss=current*current*p.internal;out.sourcePower=p.voltage*current;return out;
    }
    function wave(p, x, t = 0, out = {}) {
        const wavelength = p.speed / p.frequency, k = 2 * Math.PI / wavelength;
        const omega = 2 * Math.PI * p.frequency, phase = p.phase * Math.PI / 180;
        const y1 = p.a1 * Math.sin(k * x - omega * t);
        const y2 = p.a2 * Math.sin(k * x + (p.direction === 'opposite' ? omega * t : -omega * t) + phase);
        out.y1=y1;out.y2=y2;out.y=y1+y2;out.wavelength=wavelength;out.period=1/p.frequency;return out;
    }
    function shm(p, t = 0, out = {}) {
        const omega = Math.sqrt(p.stiffness / p.mass), period = 2 * Math.PI / omega;
        const x = p.amplitude * Math.cos(omega * t);
        const v = -p.amplitude * omega * Math.sin(omega * t), a = -omega * omega * x;
        out.omega=omega;out.period=period;out.x=x;out.v=v;out.a=a;out.kinetic=.5*p.mass*v*v;out.potential=.5*p.stiffness*x*x;out.energy=.5*p.stiffness*p.amplitude*p.amplitude;return out;
    }
    const models = Object.freeze({ G, EARTH_MASS, EARTH_RADIUS, gravity, circuit, wave, shm });
    if (typeof module !== 'undefined' && module.exports) module.exports = models;
    else root.PhysicsModels = models;
})(typeof globalThis !== 'undefined' ? globalThis : this);
