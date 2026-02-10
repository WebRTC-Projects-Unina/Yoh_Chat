import React from 'react';
import './FileSelector.css';

function FileSelector({ onFileChange, disabled }) {
  const handleChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      onFileChange(file);
    }
  };

  return (
    <div className="file-selector">
      <input
        type="file"
        onChange={handleChange}
        className="file-input"
        id="file-input"
        disabled={disabled}
      />
      
      <label 
        htmlFor="file-input" 
        className={`file-label ${disabled ? 'disabled' : ''}`}
      >
        Scegli un file
      </label>
    </div>
  );
}

export default FileSelector;