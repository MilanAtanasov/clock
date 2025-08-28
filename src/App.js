import React, { useState } from 'react';
import Clock from './Clock';
import './styles.css';

function App() {
  const [pendingNumFrames, setPendingNumFrames] = useState(4);
  const [numFrames, setNumFrames] = useState(4);
  const [pageRefs, setPageRefs] = useState('');
  const [setupComplete, setSetupComplete] = useState(false);
  const [initFrames, setInitFrames] = useState(Array.from({length: 4}, () => ({addr: '', content: ''})));
  const [initRefBits, setInitRefBits] = useState(Array(4).fill(false));
  const [initPointer, setInitPointer] = useState(0);

  // Only update frame arrays when numFrames changes (not pendingNumFrames)
  React.useEffect(() => {
    setInitFrames(f => {
      const arr = [];
      for (let i = 0; i < numFrames; ++i) {
        if (f && f[i] && typeof f[i] === 'object' && f[i].addr !== undefined && f[i].content !== undefined) {
          arr.push(f[i]);
        } else {
          arr.push({addr: '', content: ''});
        }
      }
      return arr;
    });
    setInitRefBits(r => Array(numFrames).fill(false).map((v, i) => r[i] || false));
    setInitPointer(p => Math.min(p, numFrames-1));
  }, [numFrames]);

  const handleSetFrames = (e) => {
    e.preventDefault();
    const newCount = Number(pendingNumFrames);
    setInitFrames(f => {
      const arr = [];
      for (let i = 0; i < newCount; ++i) {
        if (f && f[i] && typeof f[i] === 'object' && f[i].addr !== undefined && f[i].content !== undefined) {
          arr.push(f[i]);
        } else {
          arr.push({addr: '', content: ''});
        }
      }
      return arr;
    });
    setInitRefBits(r => Array(newCount).fill(false).map((v, i) => r[i] || false));
    setNumFrames(newCount);
    setInitPointer(p => Math.min(p, newCount-1));
  };

  const handleStart = (e) => {
    e.preventDefault();
    setSetupComplete(true);
  };

  const handleReset = () => {
    setSetupComplete(false);
  };

  const handleFrameAddrChange = (i, val) => {
    setInitFrames(frames => frames.map((f, idx) => idx === i ? {...f, addr: val} : f));
  };
  const handleFrameContentChange = (i, val) => {
    setInitFrames(frames => frames.map((f, idx) => idx === i ? {...f, content: val} : f));
  };
  const handleRefBitChange = (i, val) => {
    setInitRefBits(bits => bits.map((b, idx) => idx === i ? val : b));
  };

  // Export setup as JSON
  const handleExport = () => {
    const data = {
      numFrames,
      initFrames,
      initRefBits,
      initPointer,
      pageRefs
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clock-setup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import setup from JSON
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (
          typeof data.numFrames === 'number' &&
          Array.isArray(data.initFrames) &&
          Array.isArray(data.initRefBits) &&
          typeof data.initPointer === 'number' &&
          typeof data.pageRefs === 'string'
        ) {
          setNumFrames(data.numFrames);
          setPendingNumFrames(data.numFrames);
          setInitFrames(data.initFrames);
          setInitRefBits(data.initRefBits);
          setInitPointer(data.initPointer);
          setPageRefs(data.pageRefs);
        } else {
          alert('Invalid file format.');
        }
      } catch {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="app-container">
      <h1>CLOCK (Second Chance) Paging Simulator</h1>
      {!setupComplete ? (
        <>
          <div style={{marginBottom: 12}}>
            <button type="button" onClick={handleExport} style={{marginRight: 8}}>Export Setup</button>
            <label style={{cursor: 'pointer'}}>
              <span style={{textDecoration: 'underline', color: '#1976d2'}}>Import Setup</span>
              <input type="file" accept="application/json" style={{display: 'none'}} onChange={handleImport} />
            </label>
          </div>
          <form className="setup-form" onSubmit={handleStart}>
            <label>
              Number of Page Frames:
              <input
                type="number"
                min={3}
                max={12}
                value={pendingNumFrames}
                onChange={e => setPendingNumFrames(e.target.value)}
                required
              />
              <button type="button" style={{marginLeft: 8}} onClick={handleSetFrames}>Set Frames</button>
            </label>
            <div style={{marginTop: 12, marginBottom: 12}}>
              <b>Initial Frame Setup:</b>
              {Array.from({length: numFrames}).map((_, i) => (
                <div key={i} style={{marginTop: 6, display: 'flex', alignItems: 'center', gap: 8}}>
                  <span>Frame {i}:</span>
                  <input
                    type="text"
                    value={initFrames[i].addr}
                    onChange={e => handleFrameAddrChange(i, e.target.value)}
                    placeholder="address (hex)"
                    style={{width: 60}}
                  />
                  <label style={{fontSize: 14}}>
                    R
                    <input
                      type="checkbox"
                      checked={initRefBits[i]}
                      onChange={e => handleRefBitChange(i, e.target.checked)}
                      style={{marginLeft: 2}}
                    />
                  </label>
                </div>
              ))}
              <div style={{marginTop: 8}}>
                <label>
                  Initial Pointer Position:
                  <input
                    type="number"
                    min={0}
                    max={numFrames-1}
                    value={initPointer}
                    onChange={e => setInitPointer(Number(e.target.value))}
                    style={{width: 40, marginLeft: 6}}
                    required
                  />
                </label>
              </div>
            </div>
            <label>
              Page Reference String (space/comma separated, hex allowed):
              <input
                type="text"
                value={pageRefs}
                onChange={e => setPageRefs(e.target.value)}
                placeholder="e.g. 0a 0b 0c 0a 0f"
                required
              />
            </label>
            <button type="submit">Start Simulation</button>
          </form>
        </>
      ) : (
        <>
          <Clock
            numFrames={numFrames}
            pageRefs={pageRefs}
            initFrames={initFrames}
            initRefBits={initRefBits}
            initPointer={initPointer}
          />
          <button style={{marginTop: 24}} onClick={handleReset}>Restart</button>
        </>
      )}
    </div>
  );
}

export default App; 