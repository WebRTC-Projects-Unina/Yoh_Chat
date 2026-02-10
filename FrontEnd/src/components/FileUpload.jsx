import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import '../App.css';

function FileUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [offer, setOffer] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [progress, setProgress] = useState(0);
  const [answer, setAnswer] = useState('');

  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);

  // Gestisce la selezione del file
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    
    if (file) {
      setSelectedFile(file);
      setUploadStatus('');
      setOffer(null);
      setShowQR(false);
      setProgress(0);

      // Crea preview per immagini
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  // Invia il file tramite data channel
  const sendFile = (channel, file) => {
    const chunkSize = 16384; // 16KB chunks
    let offset = 0;

    const readSlice = () => {
      const slice = file.slice(offset, offset + chunkSize);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (channel.readyState === 'open') {
          channel.send(e.target.result);
          offset += e.target.result.byteLength;
          
          const percentComplete = Math.round((offset / file.size) * 100);
          setProgress(percentComplete);
          
          if (offset < file.size) {
            readSlice();
          } else {
            channel.send(JSON.stringify({ type: 'end' }));
            setUploadStatus('File inviato con successo! ✅');
          }
        }
      };
      
      reader.readAsArrayBuffer(slice);
    };

    // Invia metadati del file
    channel.send(JSON.stringify({
      type: 'start',
      name: file.name,
      size: file.size,
      fileType: file.type
    }));

    // Inizia l'invio
    readSlice();
  };


  
  // Gestisce l'upload con WebRTC
  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus('Per favore seleziona un file');
      return;
    }

    try {
      setUploadStatus('Creazione connessione WebRTC...');
      
      // Crea peer connection
      const configuration = {'iceServers': [{'urls': 'stun:stun1.l.google.com'}]}
      
      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;

      // Crea data channel
      const dataChannel = pc.createDataChannel('fileTransfer', {
        ordered: true
      });
      dataChannelRef.current = dataChannel;

      dataChannel.onopen = () => {
        console.log('Data channel aperto');
        setUploadStatus('Canale aperto! Invio file...');
        sendFile(dataChannel, selectedFile);
      };

      dataChannel.onclose = () => {
        console.log('Data channel chiuso');
      };

      dataChannel.onerror = (error) => {
        console.error('Errore data channel:', error);
        setUploadStatus('Errore nel data channel');
      };

      // Gestisci ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate === null) {
          // Tutti i candidati ICE sono stati raccolti
          const offerData = pc.localDescription;
          setOffer(JSON.stringify(offerData));
          setShowQR(true);
          setUploadStatus('Scansiona il QR code con il dispositivo ricevente');
        }
      };

      // Crea offer
      const offerDescription = await pc.createOffer();
      await pc.setLocalDescription(offerDescription);

    } catch (error) {
      console.error('Errore:', error);
      setUploadStatus('Errore: ' + error.message);
    }
  };

  // Gestisce la risposta (answer) dal peer remoto
  const handleAnswerSubmit = async () => {
    if (!answer || !peerConnectionRef.current) {
      setUploadStatus('Inserisci una risposta valida');
      return;
    }

    try {
      const answerDescription = JSON.parse(answer);
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(answerDescription)
      );
      setUploadStatus('Connessione stabilita! Attendi apertura canale...');
    } catch (error) {
      console.error('Errore durante il set della risposta:', error);
      setUploadStatus('Errore nella risposta: ' + error.message);
    }
  };


  // Reset
  const handleReset = () => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadStatus('');
    setOffer(null);
    setShowQR(false);
    setProgress(0);
    setAnswer('');
  };


  const copyOfferToClipboard = () => {
    if (offer) {
      navigator.clipboard.writeText(offer);
      setUploadStatus('Offer copiata negli appunti!');
    }
  };


    return (
    <div className="container">
      <h2>Carica un File via WebRTC</h2>
      
      <div className="upload-box">
        <input
          type="file"
          onChange={handleFileChange}
          className="file-input"
          id="file-input"
          disabled={showQR}
        />
        
        <label 
          htmlFor="file-input" 
          className={`file-label ${showQR ? 'disabled' : ''}`}
        >
          📁 Scegli un file
        </label>
        
        {selectedFile && !showQR && (
          <div className="file-info">
            <p><strong>File selezionato:</strong> {selectedFile.name}</p>
            <p><strong>Dimensione:</strong> {(selectedFile.size / 1024).toFixed(2)} KB</p>
            <p><strong>Tipo:</strong> {selectedFile.type || 'Non specificato'}</p>
          </div>
        )}

        {previewUrl && !showQR && (
          <div className="preview">
            <img src={previewUrl} alt="Preview" className="preview-image" />
          </div>
        )}

        {!showQR && (
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
        )}

        {showQR && offer && (
          <div className="qr-section">
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
              onClick={copyOfferToClipboard}
              className="button copy-button"
            >
              📋 Copia Offer
            </button>

            <div className="answer-section">
              <h4>Incolla la risposta (Answer) qui:</h4>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder='Incolla il JSON della risposta qui...'
                className="answer-textarea"
                rows={6}
              />
              <button
                onClick={handleAnswerSubmit}
                className="button submit-button"
              >
                Connetti
              </button>
            </div>

            <button
              onClick={handleReset}
              className="button reset-button"
              style={{ marginTop: '20px' }}
            >
              Annulla
            </button>
          </div>
        )}

        {progress > 0 && progress < 100 && (
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
        )}

        {uploadStatus && (
          <p className="status">{uploadStatus}</p>
        )}
      </div>
    </div>
  );
}


export default FileUpload;