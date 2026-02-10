import React, { useState } from 'react';
import FileSelector from '../FileSelector/FileSelector';
import FilePreview from '../FilePreview/FilePreview';
import QRCodeDisplay from '../QRCodeDisplay/QRCodeDisplay';
import ProgressBar from '../ProgressBar/ProgressBar';
import StatusMessage from '../StatusMessage/StatusMessage';
import { useWebRTC } from '../../hooks/useWebRTC';
import './FileUpload.css';

function FileUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showQR, setShowQR] = useState(false);
  
  const {
    offer,
    progress,
    uploadStatus,
    createConnection,
    setRemoteAnswer,
    closeConnection,
    setUploadStatus
  } = useWebRTC();

  const handleFileChange = (file) => {
    setSelectedFile(file);
    setShowQR(false);
    
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus('Per favore seleziona un file');
      return;
    }

    const success = await createConnection(selectedFile);
    if (success) {
      setShowQR(true);
    }
  };

  const handleReset = () => {
    closeConnection();
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowQR(false);
  };

  const handleAnswerSubmit = async (answer) => {
    await setRemoteAnswer(answer);
  };

  const copyOfferToClipboard = () => {
    if (offer) {
      navigator.clipboard.writeText(offer);
      setUploadStatus('Offer copiata negli appunti! 📋');
    }
  };

  return (
    <div className="file-upload-container">
      <h2>Carica un File via WebRTC</h2>
      
      <div className="upload-box">
        {!showQR && (
          <>
            <FileSelector 
              onFileChange={handleFileChange}
              disabled={showQR}
            />
            
            {selectedFile && (
              <FilePreview 
                file={selectedFile}
                previewUrl={previewUrl}
              />
            )}

            <div className="button-group">
              <button
                onClick={handleUpload}
                disabled={!selectedFile}
                className={`button upload-button ${!selectedFile ? 'button-disabled' : ''}`}
              >
                Inizia Connessione WebRTC
              </button>
              
              <button
                onClick={handleReset}
                className="button reset-button"
              >
                Reset
              </button>
            </div>
          </>
        )}

        {showQR && offer && (
          <QRCodeDisplay
            offer={offer}
            onCopyOffer={copyOfferToClipboard}
            onAnswerSubmit={handleAnswerSubmit}
            onCancel={handleReset}
          />
        )}

        {progress > 0 && progress < 100 && (
          <ProgressBar progress={progress} />
        )}

        {uploadStatus && (
          <StatusMessage message={uploadStatus} />
        )}
      </div>
    </div>
  );
}

export default FileUpload;