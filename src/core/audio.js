/**
 * Klang – komplett im Browser erzeugt (Web Audio), keine Audiodateien.
 * Wird erst nach einer Nutzergeste gestartet (Pflicht in Safari/iOS).
 */

const SCALE = [0, 2, 4, 7, 9]; // Pentatonik – klingt immer freundlich
const BASE_HZ = 220;

function noteHz(step) {
  const octave = Math.floor(step / SCALE.length);
  const idx = ((step % SCALE.length) + SCALE.length) % SCALE.length;
  return BASE_HZ * Math.pow(2, (SCALE[idx] + 12 * octave) / 12);
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.enabled = true;
    this.musicOn = true;
    this.volume = 0.7;
    this.noiseBuffer = null;
    this._musicTimer = null;
    this._nextNoteAt = 0;
    this._step = 0;
    this._mood = 'day';
    this._lastStepSound = 0;
    this.ambienceOn = true;
    this._amb = null;
    this._ambTarget = { surf: 0, wind: 0.35, night: 0, rain: 0 };
  }

  /** Nur innerhalb eines Klick-/Tastendruck-Handlers aufrufen. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) {
      this.enabled = false;
      return;
    }
    try {
      this.ctx = new Ctor();
    } catch (err) {
      this.enabled = false;
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? this.volume : 0;
    this.master.connect(ctx.destination);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.85;
    this.sfxBus.connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? 0.32 : 0;
    const musicFilter = ctx.createBiquadFilter();
    musicFilter.type = 'lowpass';
    musicFilter.frequency.value = 2200;
    this.musicBus.connect(musicFilter);
    musicFilter.connect(this.master);

    // Rauschpuffer für Schaufel, Wasser, Blätter
    const len = Math.floor(ctx.sampleRate * 1.2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;

    if (ctx.state === 'suspended') ctx.resume();
    this._startAmbience();
    this._startMusic();
  }

  /**
   * Umgebungsklang: drei Dauerschichten aus gefiltertem Rauschen.
   *
   *   surf  – Brandung, tief und langsam an- und abschwellend
   *   wind  – Wind in den Blättern, höher und gleichmäßiger
   *   night – Grillen, ein schmales Band weit oben
   *
   * Sie laufen durchgehend; das Spiel regelt nur ihre Lautstärke nach Ort
   * und Uhrzeit. Ein Klangbett trägt die Stimmung mehr als jeder Einzelton –
   * und kostet, weil es Rauschen ist, keine einzige Audiodatei.
   */
  _startAmbience() {
    const ctx = this.ctx;
    const bus = ctx.createGain();
    bus.gain.value = this.ambienceOn ? 1 : 0;
    bus.connect(this.master);

    function layer(type, freq, q, gain) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      const filt = ctx.createBiquadFilter();
      filt.type = type;
      filt.frequency.value = freq;
      filt.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(filt);
      filt.connect(g);
      g.connect(bus);
      src.start();
      return { gain: g, peak: gain };
    }

    const mk = layer.bind(this);
    this._amb = {
      bus: bus,
      surf: mk('lowpass', 420, 0.7, 0.16),
      wind: mk('bandpass', 900, 0.5, 0.05),
      night: mk('bandpass', 4600, 8, 0.02),
      rain: mk('highpass', 1400, 0.6, 0.11),
    };

    // Die Brandung atmet. Der Schwinger hängt an einem EIGENEN Regler hinter
    // der Lautstärke, nicht an ihr selbst: sonst addierte er sich auf denselben
    // Parameter, den die Mischung setzt, und zöge ihn ins Negative.
    const breath = ctx.createGain();
    breath.gain.value = 0.75;
    this._amb.surf.gain.disconnect();
    this._amb.surf.gain.connect(breath);
    breath.connect(bus);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.11;
    lfoGain.gain.value = 0.25;
    lfo.connect(lfoGain);
    lfoGain.connect(breath.gain);
    lfo.start();
    this._amb.lfo = lfo;
  }

  setAmbience(on) {
    this.ambienceOn = on;
    if (this._amb) {
      this._amb.bus.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.3);
    }
  }

  /**
   * Wie nah am Wasser, wie viel Blattwerk, wie spät.
   * @param {number} water 0..1 Anteil Wasser in Hörweite
   * @param {number} leaves 0..1 Anteil Bäume in Hörweite
   * @param {number} night 0..1 Nachtanteil
   */
  setAmbienceMix(water, leaves, night, rain) {
    this._ambTarget.surf = water;
    this._ambTarget.wind = leaves;
    this._ambTarget.night = night;
    this._ambTarget.rain = rain || 0;
    if (!this._amb || !this.ctx) return;
    const t = this.ctx.currentTime;
    const a = this._amb;
    // Träge Übergänge, sonst pumpt es beim Laufen
    a.surf.gain.gain.setTargetAtTime(a.surf.peak * water, t, 1.2);
    a.wind.gain.gain.setTargetAtTime(a.wind.peak * (0.35 + leaves * 0.65), t, 1.2);
    a.night.gain.gain.setTargetAtTime(a.night.peak * night, t, 2.0);
    a.rain.gain.gain.setTargetAtTime(a.rain.peak * (rain || 0), t, 1.5);
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? this.volume : 0;
  }

  setMusic(on) {
    this.musicOn = on;
    if (this.musicBus) {
      this.musicBus.gain.setTargetAtTime(on ? 0.32 : 0, this.ctx.currentTime, 0.2);
    }
  }

  setVolume(v) {
    this.volume = v;
    if (this.master && this.enabled) this.master.gain.value = v;
  }

  setMood(mood) {
    this._mood = mood;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }

  _tone(opts) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + (opts.delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.freqTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqTo), t0 + opts.dur);
    const peak = (opts.gain == null ? 0.25 : opts.gain);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.02, opts.dur * 0.3));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(gain);
    gain.connect(opts.bus || this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.05);
  }

  _noise(opts) {
    if (!this.ctx || !this.enabled || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + (opts.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = opts.filter || 'bandpass';
    filt.frequency.setValueAtTime(opts.freq || 800, t0);
    if (opts.freqTo) filt.frequency.exponentialRampToValueAtTime(Math.max(60, opts.freqTo), t0 + opts.dur);
    filt.Q.value = opts.q == null ? 1.2 : opts.q;
    const gain = ctx.createGain();
    const peak = opts.gain == null ? 0.2 : opts.gain;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    src.connect(filt);
    filt.connect(gain);
    gain.connect(this.sfxBus);
    src.start(t0);
    src.stop(t0 + opts.dur + 0.05);
  }

  play(name) {
    if (!this.ctx || !this.enabled) return;
    switch (name) {
      case 'step': {
        const now = this.ctx.currentTime;
        if (now - this._lastStepSound < 0.16) return;
        this._lastStepSound = now;
        this._noise({ freq: 420, freqTo: 240, dur: 0.08, gain: 0.055, q: 0.8 });
        break;
      }
      case 'chop':
        this._noise({ freq: 1100, freqTo: 260, dur: 0.16, gain: 0.22, q: 0.9 });
        this._tone({ type: 'triangle', freq: 150, freqTo: 70, dur: 0.14, gain: 0.16 });
        break;
      case 'mine':
        this._noise({ freq: 2600, freqTo: 900, dur: 0.12, gain: 0.2, q: 2.5 });
        this._tone({ type: 'square', freq: 320, freqTo: 140, dur: 0.09, gain: 0.08 });
        break;
      case 'dig':
        this._noise({ freq: 620, freqTo: 180, dur: 0.24, gain: 0.16, q: 0.6, filter: 'lowpass' });
        break;
      case 'forage':
        this._noise({ freq: 2200, freqTo: 1400, dur: 0.1, gain: 0.1, q: 1.6 });
        break;
      case 'pickup':
        this._tone({ type: 'sine', freq: noteHz(6), dur: 0.1, gain: 0.16 });
        this._tone({ type: 'sine', freq: noteHz(8), dur: 0.12, gain: 0.12, delay: 0.05 });
        break;
      case 'coin':
        this._tone({ type: 'triangle', freq: noteHz(9), dur: 0.08, gain: 0.14 });
        this._tone({ type: 'triangle', freq: noteHz(11), dur: 0.14, gain: 0.12, delay: 0.06 });
        break;
      case 'craft':
        this._tone({ type: 'triangle', freq: noteHz(4), dur: 0.1, gain: 0.14 });
        this._tone({ type: 'triangle', freq: noteHz(7), dur: 0.1, gain: 0.14, delay: 0.08 });
        this._tone({ type: 'triangle', freq: noteHz(10), dur: 0.22, gain: 0.14, delay: 0.16 });
        break;
      case 'questDone':
        for (let i = 0; i < 4; i++) {
          this._tone({ type: 'sine', freq: noteHz(5 + i * 2), dur: 0.34, gain: 0.14, delay: i * 0.1 });
        }
        break;
      case 'colorBurst':
        this._tone({ type: 'sine', freq: noteHz(3), freqTo: noteHz(13), dur: 1.1, gain: 0.12 });
        this._tone({ type: 'sine', freq: noteHz(8), freqTo: noteHz(16), dur: 1.3, gain: 0.07, delay: 0.12 });
        break;
      case 'splash':
        this._noise({ freq: 1500, freqTo: 400, dur: 0.3, gain: 0.14, q: 0.5, filter: 'lowpass' });
        break;
      case 'cast':
        this._noise({ freq: 3000, freqTo: 900, dur: 0.18, gain: 0.09, q: 1.0 });
        break;
      case 'bite':
        this._tone({ type: 'sine', freq: noteHz(11), dur: 0.09, gain: 0.2 });
        this._tone({ type: 'sine', freq: noteHz(11), dur: 0.09, gain: 0.2, delay: 0.13 });
        break;
      case 'fail':
        this._tone({ type: 'sawtooth', freq: 180, freqTo: 90, dur: 0.22, gain: 0.09 });
        break;
      case 'burn':
        this._noise({ freq: 700, freqTo: 2200, dur: 0.5, gain: 0.1, q: 0.5, filter: 'lowpass' });
        this._tone({ type: 'sine', freq: noteHz(2), freqTo: noteHz(9), dur: 0.5, gain: 0.08 });
        break;
      case 'place':
        this._tone({ type: 'triangle', freq: 240, freqTo: 180, dur: 0.08, gain: 0.12 });
        this._noise({ freq: 900, freqTo: 400, dur: 0.07, gain: 0.07 });
        break;
      case 'ui':
        this._tone({ type: 'sine', freq: noteHz(7), dur: 0.05, gain: 0.08 });
        break;
      case 'ghost':
        this._tone({ type: 'sine', freq: noteHz(4), freqTo: noteHz(7), dur: 0.5, gain: 0.07 });
        break;
      case 'sleep':
        this._tone({ type: 'sine', freq: noteHz(8), freqTo: noteHz(1), dur: 1.4, gain: 0.1 });
        break;
      case 'levelup':
        for (let i = 0; i < 3; i++) {
          this._tone({ type: 'triangle', freq: noteHz(6 + i * 3), dur: 0.3, gain: 0.13, delay: i * 0.11 });
        }
        break;
      case 'bird':
        this._tone({ type: 'sine', freq: noteHz(14), freqTo: noteHz(17), dur: 0.09, gain: 0.05 });
        this._tone({ type: 'sine', freq: noteHz(16), freqTo: noteHz(13), dur: 0.11, gain: 0.045, delay: 0.12 });
        break;
      case 'owl':
        this._tone({ type: 'sine', freq: noteHz(-2), dur: 0.32, gain: 0.06 });
        this._tone({ type: 'sine', freq: noteHz(-3), dur: 0.4, gain: 0.05, delay: 0.36 });
        break;
      default:
        break;
    }
  }

  _startMusic() {
    const self = this;
    if (this._musicTimer) clearInterval(this._musicTimer);
    this._nextNoteAt = this.ctx.currentTime + 0.4;
    this._musicTimer = setInterval(function () { self._scheduleMusic(); }, 220);
  }

  _scheduleMusic() {
    if (!this.ctx || !this.musicOn || !this.enabled) return;
    const ctx = this.ctx;
    const lookahead = 0.9;
    const night = this._mood === 'night';
    const beat = night ? 1.35 : 0.92;

    while (this._nextNoteAt < ctx.currentTime + lookahead) {
      const t = this._nextNoteAt;
      const s = this._step;
      // Sanfte Melodie: bewegt sich in kleinen Schritten in der Pentatonik.
      const phrase = [0, 2, 4, 3, 5, 4, 2, 1, 3, 5, 7, 5, 4, 2, 0, 2];
      const deg = phrase[s % phrase.length] + (night ? -3 : 2);
      if (s % 4 !== 3 || Math.random() < 0.6) {
        this._pad(noteHz(deg), t, beat * 1.6, night ? 0.05 : 0.06);
      }
      if (s % 8 === 0) {
        this._pad(noteHz(deg - 7), t, beat * 5.2, 0.045); // Basston
      }
      this._nextNoteAt += beat;
      this._step++;
    }
  }

  _pad(freq, when, dur, gain) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc2.type = 'triangle';
    osc.frequency.value = freq;
    osc2.frequency.value = freq * 1.005;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    osc2.connect(g);
    g.connect(this.musicBus);
    osc.start(when);
    osc2.start(when);
    osc.stop(when + dur + 0.1);
    osc2.stop(when + dur + 0.1);
  }
}

export const audio = new AudioEngine();
