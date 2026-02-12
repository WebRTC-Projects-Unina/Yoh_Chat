// Elementi DOM
const joinScreen = document.getElementById('joinScreen');
const roomScreen = document.getElementById('roomScreen');
const roomInput = document.getElementById('roomInput');
const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');
const connectionStatus = document.getElementById('connectionStatus');
const roomName = document.getElementById('roomName');
const roleBadge = document.getElementById('roleBadge');
const peersCount = document.getElementById('peersCount');

const shareSection = document.getElementById('shareSection');
const shareUrl = document.getElementById('shareUrl');
const copyBtn = document.getElementById('copyBtn');
const toggleQR = document.getElementById('toggleQR');
const qrCode = document.getElementById('qrCode');

const senderView = document.getElementById('senderView');
const receiverView = document.getElementById('receiverView');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const peersList = document.getElementById('peersList');
const peersContainer = document.getElementById('peersContainer');
const noPeers = document.getElementById('noPeers');

const waiting = document.getElementById('waiting');
const fileReceived = document.getElementById('fileReceived');
const receivedFileInfo = document.getElementById('receivedFileInfo');
const downloadBtn = document.getElementById('downloadBtn');
const fileAvailable = document.getElementById('fileAvailable');
const availableFileInfo = document.getElementById('availableFileInfo');
const requestDownloadBtn = document.getElementById('requestDownloadBtn');

const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const statusMessage = document.getElementById('statusMessage');

// Variabili globali
let socket;
let peerConnection;
let dataChannel;
let currentRoom;
let currentRole;
let clientId;
let selectedFile;
let receivedFileData = [];
let fileMetadata = null;
let receivedFileBlob = null;
let peers = [];
let qrCodeInstance = null;
let socketConnected = false;

// Gestione connessioni WebRTC multiple
let peerConnections = new Map(); // socketId -> RTCPeerConnection
let dataChannels = new Map();     // socketId -> RTCDataChannel
let senderDataChannel = null;     // Data channel verso il sender (per receiver)
let availableFile = null;         // Info file disponibile (per receiver)
// ICE configuration
const iceConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};


//Inizializzazione 
function init(){
  console.log('Inizializzazione app...')
  clientId = 'user-' + Math.random().toString(8);
  //Legge la room dall'URL
  const urlParams = new URLSearchParams(window.location.search);
  const roomFromUrl = urlParams.get('room');


  /*if(roomFromUrl){
    console.log('room ricevuta da url: ',roomFromUrl);
    //aggiorna il valore di room ed effettua la join in automatico
    currentRoom = roomFromUrl
    joinRoom();
  }*/

  //Event listeners sui diversi bottoni
  joinBtn.addEventListener('click',() =>{
    console.log('click sul pulsante join');
    joinRoom();
  });
  //Per questioni di comodità, nel caso venga premuto il tasto enter
  //si effettua il join :D 
  roomInput.addEventListener('keypress',(e)=>{
    if(e.key == 'Enter'){
      console.log('premuto il tasto enter')
      joinRoom(); //Da implementare
    }
  });
  leaveBtn.addEventListener('click',leaveRoom); //Da implementare
  fileInput.addEventListener('change',handleFileSelect); //Da implementare
  copyBtn.addEventListener('click',copyShareUrl); //Da implementare 
  toggleQR.addEventListener('click',toggleQRCode); //Da implementare
  downloadBtn.addEventListener('click',downloadFile); //Da implementare
  requestDownloadBtn.addEventListener('click', requestFileDownload);

  // Connessione socket
  connectSocket(roomFromUrl);
}

// Gestione connessione al server di signaling con Socket.IO
function connectSocket(autoJoinRoom = null){
  console.log('Connessione a Socket.IO...');
  connectionStatus.textContent = 'Connessione al server ...';

  try{
    socket=io();
    //Connessione al server
    socket.on('connect', ()=>{
      console.log('Connesso al server con Socket.IO con ID: ', socket.id);
      if(!autoJoinRoom){
        currentRoom = socket.id;
        roomInput.value = currentRoom;
      }else{
        currentRoom = autoJoinRoom; 
        roomInput.value = currentRoom;
        console.log('Room from url, join automatico');
      }
      socketConnected = true;
      connectionStatus.textContent = 'Connesso al server'
      connectionStatus.style.color = '#28a745';
      joinBtn.disabled = false;
    });
    //Gestione errori di connessione
    socket.on('connect_error', (error)=> {
      console.error('Errore di connessione al server: ',error);
      socketConnected = false;
      connectionStatus.textContent = 'Errore di connessione al server';
      connectionStatus.style.color = '#dc3545';;
    });
    //Rileva quando ci si è disconnessi dal server
    socket.on('disconnect',()=>{
      console.log('Disconnesso dal server');
      connectionStatus.textContent = 'Disconnesso dal server'
      connectionStatus.style.color = '#dc3545';
    });

    //Rileva quando il peer è entrato nella stanza
    socket.on('joined-room', (data) => {
      console.log('Unito alla room: ',data);
      currentRoom = data.room;
      currentRole = data.role;

      //Da Implementare
      showRoomScreen();
      
      //Da implementare
      updateUI();
      
      //Se sono il sender allora genero l'url da condividere
      if(data.role == 'sender'){
        generateShareUrl(); //Da implementare
      }
      //Una volta fatto il join richiedo la lista di eventuali peer connessi
      socket.emit('get-peers',(peerList) => {
        console.log('Peers ricevuti', peerList);
        //Aggiorna la propria lista interna dei peers
        peers = peerList;
        updatePeerList(); //Da implementare
        
        //Se sono il receiver, stabilisco una connessione con il server
        if(currentRole === 'receiver'){
          console.log('Receiver: connessione verso sender');
          showStatus('Connessione al sender...')
        }
      });
    });

    //Rileva quando si connette un peer
    socket.on('peer-joined',(data) => {
      console.log('Peer connesso: ',data);
      //Quando si connette un nuovo peer lo aggiungo alla lista interna dei peer
      peers.push(data);
      updatePeerList();
      //Mostra il peer connesso
      showStatus(`${data.clientId} connesso`); //Da implementare
      //Se sono il sender ed entra un receiver, inizio la connessione WebRTC
      if(currentRole === 'sender'){
        connectToReceiver(data.socketId); //Da implementare
      }
    });
    //Rileva quando un peer si disconnette
    socket.on('peer-left',(data) =>{
      console.log('Un peer si è disconnesso',data);
      peers = peers.filter(p=>p.socketId !== data.socketId);
      updatePeerList();
      showStatus('Peer disconnesso');

      //Chiudi la connessione webrtc con quel peer
      closePeerConnection(data.socketId); //Da implementare
    });
    
    //Gestione Signaling WebRTC
    socket.on('offer',async (data)=>{
      console.log('offer ricevuta da:', data.fromClientId);
      await handleOffer(data.offer, data.from, data.fromClientId);
    });

    socket.on('answer',async (data)=>{
      console.log('answer ricevuta da:', data.fromClientId);
      await handleAnswer(data.answer, data.from);
    });

    socket.on('ice-candidate',async (data)=>{
      console.log('ICE candidate ricevuto da:', data.fromClientId);
      await handleIceCandidate(data.candidate, data.from);
    });
  }catch (error){
    console.error('errore creazione socket: ',error);
    connectionStatus.textContent = 'Errore inzializzazione';
    connectionStatus.style.color = '#dc3545';
  }
}

//Join room
function joinRoom(){
  console.log('accesso alla stanza...');
  const room = currentRoom || roomInput.value.trim();
  if(!room){
    alert('Inserisci il nome di una room');
    console.log('campo room vuoto');
  }

  if(!socketConnected){
    alert('Non sei connesso al server, ricarica la pagina');
    console.log('nessuna connessione al server');
    return;
  }

  console.log('Invio evento join-room al server:', {room, clientId});
  
  socket.emit('join-room',{
    room: room,
    clientId: clientId
  });
}

//Leave room 
function leaveRoom(){
  console.log('Esco dalla room...');
  peerConnections.forEach(pc=>{
    pc.close();
  })
  dataChannels.forEach(dc=>{
    dc.close()
  })
  socket.disconnect();
  peerConnections.clear();
  dataChannels.clear();
  location.reload();
}

//==== Gestione UI ====

//mostra vista stanze
function showRoomScreen(){
  console.log('mostro schermata room');
  //nascondo la joinscreen
  joinScreen.classList.add('hidden');
  //Mostro la roomscreen NB qui sto usando javascript per manipolare direttamente il DOM 
  roomScreen.classList.remove('hidden');
}
//aggiorna la UI in base a se si è il sender o il receiver
function updateUI(){
  console.log('aggiornamento UI...');
  roomName.textContent = currentRoom;
  roleBadge.textContent = currentRole === 'sender' ? 'SENDER' : 'RECEIVER';
  roleBadge.className = 'role-badge' + currentRole;

  //Se sono il sender mostro tutti gli elementi della schermata del sender 
  if(currentRole === 'sender'){
    senderView.classList.remove('hidden');
    receiverView.classList.add('hidden');
    shareSection.classList.remove('hidden');
  }else{
    senderView.classList.add('hidden');
    receiverView.classList.remove('hidden');
    shareSection.classList.add('hidden');
  }
}
//aggiorna la lista dei peer
function updatePeerList(){
  console.log('Aggiorno la lista dei peers: ',peers);
  //aggiorna la vista del contatore dei peers
  peersCount.textContent = peers.length;
  //Se sono il sender 
  if (currentRole === 'sender'){
    //mi prendo tutti i peer della lista che sono segnati come receiver
    const receivers = peers.filter(p=>p.role === 'receiver');
    //se non ce ne sono 
    if(receivers.length===0){
      //Nascondo la lista e mostro la scritta nopeers
      peersList.classList.add('hidden');
      noPeers.classList.remove('hidden');
    }else{
      peersList.classList.remove('hidden');
      noPeers.classList.add('hidden');

      peersContainer.innerHTML = '';
      receivers.forEach (peer=>{
        const channel = dataChannels.get(peer.socketId);
        const status = channel && channel.readyState === 'open' ? 'CONNESSO' : 'CONNESSIONE...';
        const div = document.createElement('div');
        div.className = 'peer-item';
        div.innerHTML = `
          <span> ${peer.clientId}</span>
          <span class="peer-status">${status}</span>
        `;
        peersContainer.appendChild(div);
      });
    }
  }
}

function showFileAvailable(fileInfo) {
  waiting.classList.add('hidden');
  fileAvailable.classList.remove('hidden');
  
  let html = `
    <p><strong>File disponibile:</strong> ${fileInfo.name}</p>
    <p><strong>Dimensione:</strong> ${(fileInfo.size / 1024).toFixed(2)} KB</p>
    <p><strong>Tipo:</strong> ${fileInfo.type || 'Sconosciuto'}</p>
  `;
  
  availableFileInfo.innerHTML = html;
  showStatus('Nuovo file disponibile!');
}

function requestFileDownload() {
  if (!senderDataChannel || senderDataChannel.readyState !== 'open') {
    alert('Non connesso al sender');
    return;
  }
  
  console.log('Invio richiesta download via WebRTC');
  
  senderDataChannel.send(JSON.stringify({
    type: 'download-request'
  }));
  
  fileAvailable.classList.add('hidden');
  showStatus('Download in corso...');
}
//==== GESTIONE URL ====
function generateShareUrl(){
  //Ottieni l'indirizzo IP dalla barra degli inditizzi del browser
  const currentHost = window.location.hostname;
  const currentProt = window.location.port || ' ';
  
  const url = `http://${currentHost}:${currentProt}?room=${encodeURIComponent(currentRoom)}`;
  shareUrl.value = url;
  console.log("Url condivisibile generato");
}

function copyShareUrl (){
  shareUrl.select();
  shareUrl.setSelectionRange(0, 99999);

  navigator.clipboard.writeText(shareUrl.value).then(()=>{
    showStatus('Link copiato!');
    console.log('Link copiato negli appunti');
  }).catch(err => {
    console.error('errore di copia: ',err);
  });
}

function toggleQRCode(){
  if(qrCode.classList.contains('hidden')){
    qrCode.classList.remove('hidden');
    toggleQR.textContent = '🔽 Nascondi QR Code';

    if(!qrCodeInstance && typeof QRCode != 'undefined'){
      qrCode.innerHTML = '';
      qrCodeInstance = new QRCode(qrCode,{
        text:shareUrl.value,
        width: 200,
        height: 200
      })
    }
  }else{
    qrCode.classList.add('hidden');
    toggleQR.textContent = 'Mostra QR code'
  }
}


//==== SETUP CONNESSIONE WEBRTC ====
//SENDER: Crea connessione con il receiver
async function connectToReceiver(receiverSocketId) {
  console.log('Sender: connessione verso receiver');

  const pc = new RTCPeerConnection(iceConfig);
  peerConnections.set(receiverSocketId, pc);
  pc.onicecandidate = (event)=>{
    if(event.candidate){
      socket.emit('ice-candidate',{
        candidate: event.candidate,
        to: receiverSocketId,
        from: clientId
      });
    }
  }

  pc.oniceconnectionstatechange = () =>{
    console.log(`ICE state:`,pc.iceConnectionState);
    if (pc.iceConnectionState === 'connected'){
      showStatus('Receiver connesso!');
      updatePeerList();
    }
  };

  //Crea data channel 
  const dc = pc.createDataChannel('fileTransfer');
  dataChannels.set(receiverSocketId, dc);

  //Gestione eventi datachannel
  dc.onopen = () =>{
    console.log(`Data channel aperto con ${receiverSocketId}`);
    updatePeerList();

    if(selectedFile){
      sendFileMetadata(dc);
    }
  };

  dc.onmessage = (e)=>{
    handleDatachannelMessage(e.data, receiverSocketId);
  };

  //Crea ed invia una offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  
  socket.emit('offer',{
    offer: offer,
    to: receiverSocketId,
    from: clientId
  });
}

//Gestione offer 
async function handleOffer(offer, fromSocketId, fromClientId){
  console.log('Gestione offer di: ',fromClientId);
  const pc = new RTCPeerConnection(iceConfig);
  peerConnections.set(fromSocketId, pc);
  //invia gli ice candidate attraverso la socket
  pc.onicecandidate = (event) => {
    if (event.candidate){
      socket.emit('ice-candidate',{
        candidate: event.candidate,
        to: fromSocketId,
        from: clientId
      });
    }
  }

  pc.oniceconnectionstatechange = () => {
    console.log('ICE state: ', pc.iceConnectionState);
    if (pc.iceConnectionState === 'connected') {
      showStatus('Connesso al sender !');
    }
  }

  pc.ondatachannel = (event) => {
    console.log('Datachannel ricevuto');
    const dc = event.channel;
    senderDataChannel = dc;
    dataChannels.set(fromSocketId, dc);

    dc.onopen = () => {
      console.log('Datachannel aperto');
      showStatus('Connesso!');
    }
    dc.onmessage = (e) => {
      handleDatachannelMessage(e.data, fromSocketId);
    }
  }
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit('answer',{
    answer: answer,
    to: fromSocketId,
    from: clientId
  });
}

//Gestione answer
async function handleAnswer(answer, fromSocketId) {
  const pc = peerConnections.get(fromSocketId);
  if(pc){
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    console.log('Answer processata')
  }
}

//Gestione ice-candidates
async function handleIceCandidate(candidate, fromSocketId) {
  if(!candidate){
    console.log('Fine raccolta ice candidates');
    return;
  }

  const pc = peerConnections.get(fromSocketId);
  if(pc){
    try{
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('Ice candidate aggiunto');
    }catch (error){
      console.error('errore ice',error)
    }
  }
}

function closePeerConnection(socketId){
  const pc = peerConnections.get(socketId);
  const dc = dataChannels.get(socketId);

  if(pc){
    pc.close();
    peerConnections.delete(socketId);
  }
  
  if(dc){
    dc.close();
    dataChannels.delete(socketId);
  }
  console.log(`Connessione con ${socketId} chiusa`);
}

//==== DATA CHANNEL MESSAGING ====
function handleDatachannelMessage(data, fromSocketId){
  
  //La gestione della comunicazione per la trasmissione del file, 
  //avviene sul data channel webrtc e non attraverso il server 
  //Bisogna gestire sia file di tipo testuale: i messaggi di controllo per la trasmissione
  //Sia messaggi binari: i pezzi di file
  if(typeof data === 'string'){
    try{
      const message = JSON.parse(data);
      switch (message.type){
        case 'file-metadata':
          handleFileMetadata(message);
          break;
        case 'download-request':
          handleDownloadRequest(fromSocketId);
          break;
        case 'file-start':
          handleFileStart(message);
          break;
        case 'file-end':
          handleFileEnd();
          break;
      }
    }catch (e){
      console.error('Errore col parsing del messaggio');
    }
  } else {
    //Dati binari -> chunk del file
    handleFileChunk(data);
  }
}

//==== SELEZIONE FILE E METADATI ====
function handleFileSelect(e){
  //Rileva quando il file è stato caricato dal sender
  selectedFile = e.target.files[0];
  if(!selectedFile) return;
  console.log('file selezionato: ',selectedFile.name, selectedFile.size, 'bytes');
  let html = `
    <p><strong>File:</strong> ${selectedFile.name}</p>
    <p><strong>Dimensione:</strong> ${(selectedFile.size / 1024).toFixed(2)} KB</p>
    <p style="color: #28a745; font-weight: 600;">File pronto per il download!</p>
  `;
  
  //Se ho caricato un'immagine, ne mostro l'anteprima
  if(selectedFile.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      html += `<img src="${e.target.result}" alt="Preview">`;
      fileInfo.innerHTML = html;
    };
    reader.readAsDataURL(selectedFile);
  }else {
    fileInfo.innerHTML = html;
  }
  fileInfo.classList.remove('hidden');

  //Invia metadata a tutti i receiver connessi via WebRTC
  broadcastFileMetadata();
}

function sendFileMetadata(dataChannel){
  if (!selectedFile || dataChannel.readyState !== 'open') return;

  const metadata = {
    type: 'file-metadata',
    name: selectedFile.name,
    size: selectedFile.size,
    fileType: selectedFile.type
  };

  dataChannel.send(JSON.stringify(metadata));
  console.log('metadati inviati', metadata);
}

function broadcastFileMetadata(){
  console.log('Broadcasting metadati a tutti i receiver...');
  dataChannels.forEach((dc)=>{
    if(dc.readyState === 'open'){
      sendFileMetadata(dc);
    }
  });
  showStatus('File disponibile');
}

function handleFileMetadata(message){
  console.log('Metadati ricevuti');

  availableFile = {
    name: message.name,
    size: message.size,
    type: message.type
  };
  showFileAvailable(availableFile);
}

//==== TRASFERIMENTO FILE ====
//Gestione richiesta di trasferimento
function handleDownloadRequest(receiverSocketId){
  console.log('Richiesta download da: ',receiverSocketId);

  if(!selectedFile){
    console.error('nessun file selezionato');
    return;
  }

  const dc = dataChannels.get(receiverSocketId);
  if(!dc || dc.readyState !== 'open'){
    console.error('Data channel non disponibile');
    return;
  }

  showStatus('Invio file...');
  sendFile(dc);
}

//questa è la funzione che divide il file in diversi chunk e li invia 
function sendFile(dataChannel){
  console.log('Invio file...');
  const chunkSize = 16384;
  let offset = 0;
  //Invia segnale di inizio 
  dataChannel.send(JSON.stringify({
    type: 'file-start',
    name: selectedFile.name,
    size: selectedFile.size,
    fileType: selectedFile.type
  }));

  progressContainer.classList.remove('hidden');
  const readSlice = () =>{
    const slice = selectedFile.slice(offset, offset + chunkSize);
    const reader = new FileReader();

    reader.onload = (e) => {
      if (dataChannel.readyState === 'open'){
        dataChannel.send(e.target.result);
        offset += e.target.result.byteLength;
        const percent = Math.round((offset/selectedFile.size)*100);
        updateProgress(percent);
        if(offset < selectedFile.size){
          readSlice();
        }else{
          dataChannel.send(JSON.stringify({type: 'file-end'}));
          console.log('File inviato completamente');
          showStatus('File inviato!');
          setTimeout(()=>{
            progressContainer.classList.add('hidden');
          },2000);
        }
      }
    }
    reader.readAsArrayBuffer(slice);
  }
  readSlice();
}

function handleFileStart(message){
  console.log('Inizio ricezione',message.name);
  fileMetadata = message;
  receivedFileData = [];
  progressContainer.classList.remove('hidden');
  showStatus(`Ricezione ${message.name}...`);
}

//QUesta funzione aggiunge i chunk ricevuti nell buffer ed aggiorna la progress bar
//Update futuri, evitare di salvare l'intero file in un buffer in ram, ma fare il download progressivo direttamente su disco 
function handleFileChunk(chunk){
  receivedFileData.push(chunk);
  if(fileMetadata){
    const received = receivedFileData.reduce((acc,chunk)=>acc+chunk.byteLength,0);
    const percent = Math.round((received/fileMetadata.size)*100);
    updateProgress(percent);
  }
}

function handleFileEnd(){
  console.log('Ricezione completata');
  const blob = new Blob(receivedFileData,{type: fileMetadata.fileType});
  receivedFileBlob = blob;
  waiting.classList.add('hidden');
  fileAvailable.classList.add('hidden');
  fileReceived.classList.remove('hidden');
  progressContainer.classList.add('hidden');
  let html = `
    <p><strong>Nome:</strong> ${fileMetadata.name}</p>
    <p><strong>Dimensione:</strong> ${(fileMetadata.size / 1024).toFixed(2)} KB</p>
  `;
  //anche in questo caso se il file ricevuto è un immagine 
  //mostrane l'anteprima
  if (fileMetadata.fileType.startsWith('image/')) {
    const url = URL.createObjectURL(blob);
    html += `<img src="${url}" alt="Preview">`;
  }

  receivedFileInfo.innerHTML = html;
  showStatus('File ricevuto!');
}

function downloadFile(){
  if(!receivedFileBlob) return;
  console.log('Download file: ', fileMetadata.name);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(receivedFileBlob);
  a.download = fileMetadata.name
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

//==== UTILITY FUNCTIONS ====
function updateProgress(percent) {
  progressFill.style.width = percent + '%';
  progressFill.textContent = percent + '%';
}

function showStatus(message) {
  statusMessage.textContent = message;
  console.log('Status:', message);
  setTimeout(() => {
    statusMessage.textContent = '';
  }, 5000);
}

console.log('Avvio...');
init();1