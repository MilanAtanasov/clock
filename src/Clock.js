import React, { useState, useMemo } from 'react';

function parseRefs(refString) {
  // Accepts hex (0a, 0x0a, etc) and decimal
  return refString
    .split(/[^a-zA-Z0-9]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => parseInt(s, 16));
}

function formatHex(val) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return '0x' + val.toString(16).padStart(2, '0');
}

function formatHexContent(val) {
  if (!val) return '';
  const num = parseInt(val, 16);
  if (isNaN(num)) return val;
  return '0x' + num.toString(16);
}

function runClockSimulation(pageRefs, numFrames, initFrames, initRefBits, initPointer) {
  // Returns an array of states for each step
  const frames = Array(numFrames).fill(null).map((_, i) => {
    const f = initFrames && initFrames[i] && typeof initFrames[i] === 'object' ? initFrames[i] : {addr: '', content: ''};
    const addr = f.addr ? parseInt(f.addr, 16) : null;
    return addr !== null && !isNaN(addr) ? { addr: addr } : null;
  });
  const refBits = Array(numFrames).fill(0).map((_, i) => initRefBits && initRefBits[i] ? 1 : 0);
  let pointer = typeof initPointer === 'number' ? initPointer : 0;
  const steps = [];
  let hits = 0, faults = 0;

  // Add initial state before any accesses
  steps.push({
    frames: frames.map(f => f ? { ...f } : null),
    refBits: [...refBits],
    pointer,
    page: null,
    hit: false,
    replaced: null,
    hits,
    faults,
    step: 0,
    microStep: 0,
    action: 'init',
    activeFrame: pointer
  });

  let stepCount = 1;
  for (let refIdx = 0; refIdx < pageRefs.length; ++refIdx) {
    const page = pageRefs[refIdx];
    let hit = false;
    let replaced = null;
    let microStep = 0;
    // Check if page is already in frames
    let idx = frames.findIndex(f => f && f.addr === page);
    if (idx !== -1) {
      // Hit: set reference bit
      refBits[idx] = 1;
      hit = true;
      hits++;
      steps.push({
        frames: frames.map(f => f ? { ...f } : null),
        refBits: [...refBits],
        pointer,
        page,
        hit,
        replaced: null,
        hits,
        faults,
        step: stepCount++,
        microStep,
        action: 'hit',
        activeFrame: idx
      });
    } else {
      // Miss: step through pointer movements
      faults++;
      let searching = true;
      while (searching) {
        if (refBits[pointer] === 0) {
          // Replace here
          replaced = frames[pointer] ? frames[pointer].addr : null;
          frames[pointer] = { addr: page };
          refBits[pointer] = 1;
          steps.push({
            frames: frames.map(f => f ? { ...f } : null),
            refBits: [...refBits],
            pointer,
            page,
            hit: false,
            replaced,
            hits,
            faults,
            step: stepCount++,
            microStep,
            action: 'replace',
            activeFrame: pointer
          });
          pointer = (pointer + 1) % numFrames;
          searching = false;
        } else {
          // Set ref bit to 0 and move pointer, show as a step
          refBits[pointer] = 0;
          steps.push({
            frames: frames.map(f => f ? { ...f } : null),
            refBits: [...refBits],
            pointer,
            page,
            hit: false,
            replaced: null,
            hits,
            faults,
            step: stepCount++,
            microStep,
            action: 'clear',
            activeFrame: pointer
          });
          pointer = (pointer + 1) % numFrames;
        }
        microStep++;
      }
    }
  }
  return steps;
}

function Clock({ numFrames, pageRefs, initFrames, initRefBits, initPointer }) {
  const refs = useMemo(() => parseRefs(pageRefs), [pageRefs]);
  const steps = useMemo(() => runClockSimulation(refs, numFrames, initFrames, initRefBits, initPointer), [refs, numFrames, initFrames, initRefBits, initPointer]);
  const [current, setCurrent] = useState(0);

  if (!refs.length) return <div>Please enter a valid page reference string.</div>;

  const state = steps[current] || {
    frames: Array(numFrames).fill(null),
    refBits: Array(numFrames).fill(0),
    pointer: 0,
    page: null,
    hit: false,
    replaced: null,
    hits: 0,
    faults: 0,
    step: 0,
    microStep: 0,
    action: 'init'
  };

  // Arrow calculation
  const center = 170;
  const radius = 120;
  // Use activeFrame for pointer/arrow and highlight
  const activeFrame = state.activeFrame;
  const pointerAngle = (2 * Math.PI * activeFrame) / numFrames - Math.PI / 2;
  const arrowX = center + radius * Math.cos(pointerAngle);
  const arrowY = center + radius * Math.sin(pointerAngle);

  return (
    <div className="clock-container">
      <h2 style={{marginBottom: 8}}>Step {state.step} / {steps.length-1}</h2>
      <div style={{marginBottom: 12, fontSize: 18, fontWeight: 500}}>
        {state.step === 0 ? <span>Initial State</span> :
          state.action === 'hit' ? <span>Current Page: <b>{formatHex(state.page)}</b> <span style={{color:'green'}}>Hit</span></span> :
          state.action === 'replace' ? <span>Current Page: <b>{formatHex(state.page)}</b> <span style={{color:'red'}}>Fault</span> (Replaced: {formatHex(state.replaced)})</span> :
          state.action === 'clear' ? <span>Pointer cleared ref bit and moved</span> : null
        }
      </div>
      <div className="center-svg">
        <svg width={340} height={340}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke="#bbb" strokeWidth={2} />
          {/* Draw arrow from center to pointer frame */}
          <line x1={center} y1={center} x2={arrowX} y2={arrowY} stroke="#d32f2f" strokeWidth={4} markerEnd="url(#arrowhead)" />
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L8,4 L0,8 L2,4 Z" fill="#d32f2f" />
            </marker>
          </defs>
          {state.frames.map((frame, i) => {
            const angle = (2 * Math.PI * i) / numFrames - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            const isPointer = activeFrame === i;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={32} fill={isPointer ? '#ffe082' : '#f0f0f0'} stroke="#333" strokeWidth={2} />
                <text x={x} y={y-8} textAnchor="middle" fontSize={18} fill="#333">{frame ? formatHex(frame.addr) : '-'}</text>
                <text x={x} y={y+12} textAnchor="middle" fontSize={13} fill="#555">{frame && frame.content ? formatHexContent(frame.content) : ''}</text>
                <text x={x} y={y+28} textAnchor="middle" fontSize={14} fill={state.refBits[i] ? '#1976d2' : '#888'}>R: {state.refBits[i]}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{marginTop: 18}}>
        <button onClick={() => setCurrent(c => Math.max(0, c-1))} disabled={current === 0}>Previous</button>
        <button onClick={() => setCurrent(c => Math.min(steps.length-1, c+1))} disabled={current === steps.length-1} style={{marginLeft: 16}}>Next</button>
      </div>
      <div style={{marginTop: 18, fontSize: 17}}>
        <b>Hits:</b> {state.hits} &nbsp; <b>Faults:</b> {state.faults}
      </div>
      <div style={{marginTop: 8, fontSize: 13, color: '#888'}}>
        <b>Page Reference String:</b> {refs.map(formatHex).join(', ')}
      </div>
    </div>
  );
}

export default Clock; 