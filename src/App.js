import React, { useState } from 'react';
import Clock from './Clock';
import './styles.css';

function App() {
  const [numFrames, setNumFrames] = useState(4);
  const [pageRefs, setPageRefs] = useState('');
  const [setupComplete, setSetupComplete] = useState(false);

  const handleStart = (e) => {
    e.preventDefault();
    setSetupComplete(true);
  };

  const handleReset = () => {
    setSetupComplete(false);
  };

  return (
    <div className="app-container">
      <h1>CLOCK (Second Chance) Paging Simulator</h1>
      {!setupComplete ? (
        <form className="setup-form" onSubmit={handleStart}>
          <label>
            Number of Page Frames:
            <input
              type="number"
              min={3}
              max={12}
              value={numFrames}
              onChange={e => setNumFrames(Number(e.target.value))}
              required
            />
          </label>
          <label>
            Page Reference String (space/comma separated):
            <input
              type="text"
              value={pageRefs}
              onChange={e => setPageRefs(e.target.value)}
              placeholder="e.g. 1 2 3 2 1 4 5 2 1"
              required
            />
          </label>
          <button type="submit">Start Simulation</button>
        </form>
      ) : (
        <>
          <Clock numFrames={numFrames} pageRefs={pageRefs} />
          <button style={{marginTop: 24}} onClick={handleReset}>Restart</button>
        </>
      )}
    </div>
  );
}

export default App; 