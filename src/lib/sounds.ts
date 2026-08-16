'use client';

let audioCtx: AudioContext | null = null;

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

// WhatsApp-style outgoing call tone: two short pulses, pause, repeat
export function playOutgoingTone() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();

  let playing = true;

  function playPulse() {
    if (!playing) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.value = 440;
    osc2.type = 'sine';
    osc2.frequency.value = 480;

    const mixed = ctx.createGain();
    mixed.gain.value = 0.15;

    osc1.connect(mixed);
    osc2.connect(mixed);
    mixed.connect(gain);
    gain.connect(ctx.destination);

    // First pulse
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);

    // Second pulse after short gap
    const t2 = now + 0.45;
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.3, t2);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.35);
    gain2.connect(ctx.destination);

    const osc3 = ctx.createOscillator();
    const osc4 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = 440;
    osc4.type = 'sine';
    osc4.frequency.value = 480;

    const mixed2 = ctx.createGain();
    mixed2.gain.value = 0.15;

    osc3.connect(mixed2);
    osc4.connect(mixed2);
    mixed2.connect(gain2);

    osc3.start(t2);
    osc4.start(t2);
    osc3.stop(t2 + 0.35);
    osc4.stop(t2 + 0.35);

    timeout = window.setTimeout(playPulse, 2600);
  }

  let timeout: number | undefined;
  playPulse();

  return () => {
    playing = false;
    if (timeout !== undefined) window.clearTimeout(timeout);
  };
}

// WhatsApp-style incoming ringtone: single longer pulse, pause, repeat
export function playIncomingRingtone() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();

  let playing = true;

  function playPulse() {
    if (!playing) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 430;

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.7);

    timeout = window.setTimeout(playPulse, 2200);
  }

  let timeout: number | undefined;
  playPulse();

  return () => {
    playing = false;
    if (timeout !== undefined) window.clearTimeout(timeout);
  };
}
