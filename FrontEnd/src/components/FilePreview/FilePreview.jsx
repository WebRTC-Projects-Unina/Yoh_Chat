import React from 'react';
import './FilePreview.css';

function FilePreview({ file, previewUrl }) {
  return (
    <div className="file-preview">
      <div className="file-info">
        <p><strong>File selezionato:</strong> {file.name}</p>
        <p><strong>Dimensione:</strong> {(file.size / 1024).toFixed(2)} KB</p>
        <p><strong>Tipo:</strong> {file.type || 'Non specificato'}</p>
      </div>

      {previewUrl && (
        <div className="preview">
          <img src={previewUrl} alt="Preview" className="preview-image" />
        </div>
      )}
    </div>
  );
}

export default FilePreview;