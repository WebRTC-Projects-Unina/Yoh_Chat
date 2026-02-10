import { useRef, useState } from 'react';

export const useWebRTC = () => {
  const [offer, setOffer] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);

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
            setUploadStatus('File inviato con successo!');
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

  const createConnection = async (file) => {
    try {
      setUploadStatus('Creazione connessione WebRTC...');
      
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };
      
      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;

      const dataChannel = pc.createDataChannel('fileTransfer', {
        ordered: true
      });
      dataChannelRef.current = dataChannel;

      dataChannel.onopen = () => {
        console.log('Data channel aperto');
        setUploadStatus('Canale aperto! Invio file...');
        sendFile(dataChannel, file);
      };

      dataChannel.onclose = () => {
        console.log('Data channel chiuso');
      };

      dataChannel.onerror = (error) => {
        console.error('Errore data channel:', error);
        setUploadStatus('Errore nel data channel');
      };



      const offerDescription = await pc.createOffer();
      await pc.setLocalDescription(offerDescription);
      
      pc.onicecandidate = (event) => {
        if (event.candidate === null) {
          const offerData = pc.localDescription;
          setOffer(JSON.stringify(offerData));
          setUploadStatus('Scansiona il QR code con il dispositivo ricevente');
        }
      };
      return true;
    } catch (error) {
      console.error('Errore:', error);
      setUploadStatus('Errore: ' + error.message);
      return false;
    }
  };

  const setRemoteAnswer = async (answerString) => {
    if (!answerString || !peerConnectionRef.current) {
      setUploadStatus('Inserisci una risposta valida');
      return false;
    }

    try {
      const answerDescription = JSON.parse(answerString);
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(answerDescription)
      );
      setUploadStatus('Connessione stabilita! Attendi apertura canale...');
      return true;
    } catch (error) {
      console.error('Errore durante il set della risposta:', error);
      setUploadStatus('Errore nella risposta: ' + error.message);
      return false;
    }
  };

  const closeConnection = () => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    setOffer(null);
    setProgress(0);
    setUploadStatus('');
  };

  return {
    offer,
    progress,
    uploadStatus,
    createConnection,
    setRemoteAnswer,
    closeConnection,
    setUploadStatus
  };
};