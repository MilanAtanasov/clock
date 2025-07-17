import React, { useState, useMemo } from 'react';

function parseRefs(refString) {
  return refString
    .split(/[^0-9]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(Number);
}

function runClockSimulation(pageRefs, numFrames) {
  // Returns an array of states for each step
  const frames = Array(numFrames).fill(null);
  const refBits = Array(numFrames).fill(0);
  let pointer = 0;
  const steps = [];
  let hits = 0, faults = 0;

  for (let step = 0; step < pageRefs.length; ++step) {
    const page = pageRefs[step];
    let hit = false;
    let replaced = null;
    // Check if page is already in frames
    let idx = frames.indexOf(page);
    if (idx !== -1) {
      // Hit: set reference bit
      refBits[idx] = 1;
      hit = true;
      hits++;
    } else {
      // Miss: find a frame to replace using CLOCK
      faults++;
      while (true) {
        if (refBits[pointer] === 0) {
          replaced = frames[pointer];
          frames[pointer] = page;
          refBits[pointer] = 1;
          pointer = (pointer + 1) % numFrames;
          break;
        } else {
          refBits[pointer] = 0;
          pointer = (pointer + 1) % numFrames;
        }
      }
    }
    steps.push({
      frames: [...frames],
      refBits: [...refBits],
      pointer,
      page,
      hit,
      replaced,
      hits,
      faults,
      step: step + 1
    });
  }
  return steps;
}

function Clock({ numFrames, pageRefs }) {
  const refs = useMemo(() => parseRefs(pageRefs), [pageRefs]);
  const steps = useMemo(() => runClockSimulation(refs, numFrames), [refs, numFrames]);
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
    step: 0
  };

  return (
    <div className="clock-container">
      <h2 style={{marginBottom: 8}}>Step {state.step} / {steps.length}</h2>
      <div style={{marginBottom: 12, fontSize: 18, fontWeight: 500}}>
        <span>Current Page: <b>{state.page !== null ? state.page : '-'}</b></span><br/>
        <span>Status: {state.hit ? <span style={{color:'green'}}>Hit</span> : <span style={{color:'red'}}>Fault</span>}
        {state.replaced !== null && !state.hit && (
          <span> (Replaced: {state.replaced !== null ? state.replaced : '-'})</span>
        )}</span>
      </div>
      <div className="center-svg">
        <svg width={340} height={340}>
          <circle cx={170} cy={170} r={120} fill="none" stroke="#bbb" strokeWidth={2} />
          {state.frames.map((frame, i) => {
            const angle = (2 * Math.PI * i) / numFrames - Math.PI / 2;
            const x = 170 + 120 * Math.cos(angle);
            const y = 170 + 120 * Math.sin(angle);
            const isPointer = state.pointer === i;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={32} fill={isPointer ? '#ffe082' : '#f0f0f0'} stroke="#333" strokeWidth={2} />
                <text x={x} y={y-8} textAnchor="middle" fontSize={20} fill="#333">{frame !== null ? frame : '-'}</text>
                <text x={x} y={y+18} textAnchor="middle" fontSize={14} fill={state.refBits[i] ? '#1976d2' : '#888'}>R: {state.refBits[i]}</text>
                {isPointer && (
                  <text x={x} y={y+40} textAnchor="middle" fontSize={16} fill="#d32f2f">&#8595; Pointer</text>
                )}
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
        <b>Page Reference String:</b> {refs.join(', ')}
      </div>
    </div>
  );
}

export default Clock; 