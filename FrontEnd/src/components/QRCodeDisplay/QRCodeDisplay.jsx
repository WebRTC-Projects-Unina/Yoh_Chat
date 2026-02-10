import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import AnswerInput from '../AnswerInput/AnswerInput';
import './QRCodeDisplay.css';

function QRCodeDisplay({ offer, onCopyOffer, onAnswerSubmit, onCancel }) {
  return (
    <div className="qr-display">
      <h3>Scansiona questo QR Code</h3>
      <div className="qr-container">
        <QRCodeSVG 
          value={offer} 
          size={300}
          level="M"
          includeMargin={true}
        />
      </div>
      
      <button 
        onClick={onCopyOffer}
        className="button copy-button"
      >
        📋 Copia Offer
      </button>

      <AnswerInput onSubmit={onAnswerSubmit} />

      <button
        onClick={onCancel}
        className="button cancel-button"
      >
        Annulla
      </button>
    </div>
  );
}

export default QRCodeDisplay;