import React from 'react';
import './ProgressBar.css';

function ProgressBar({ progress }) {
  return (
    <div className="progress-section">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        >
          {progress}%
        </div>
      </div>
    </div>
  );
}

export default ProgressBar;