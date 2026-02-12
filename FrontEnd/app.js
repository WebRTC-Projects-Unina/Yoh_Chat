
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
  if(roomFromUrl){
    console.log('room ricevuta da url: ',roomFromUrl);
    //aggiorna il valore di room ed effettua la join in automatico
    currentRoom = roomFromUrl
    joinRoom();
  }

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
  requestDownloadBtn.addEventListener('click',requestDownload); //Da implementare

  // Connessione socket
  connectSocket();
}

// Gestione connessione al server di signaling con Socket.IO
function connectSocket(){
  console.log('Connessione a Socket.IO...');
  connectionStatus.textContent = 'Connessione al server ...';

  try{
    socket.io();
    //Connessione al server
    socket.on(connect, ()=>{
      console.log('Connesso al server con Socket.IO con ID: ', socket.id);
      currentRoom = socket.id;
      roomInput.value = currentRoom;
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
      console.log('Unito alla room: '.data);
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
          const sender = peerList.find(p=>p.role === 'sender')
          if(sender){
            connectToSender(sender.socketId); //Da implementare
          }
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
      if(currentRole === 'sender' && data.role === 'receiver'){
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
  currentRoom = roomInput.value.trim();
  if(!currentRoom){
    alert('Inserisci il nome di una room');
    console.log('campo room vuoto');
  }

  if(!socketConnected){
    alert('Non sei connesso al server, ricarica la pagina');
    console.log('nessuna connessione al server');
  }

  console.log('Invio evento join-room al server:', {currentRoom, clientId});
  
  socket.emit('join-room',{
    room: currentRoom,
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
function showRoomScreen(){
  console.log('mostro schermata room');
  //nascondo la joinscreen
  joinScreen.classList.add('hidden');
  //Mostro la roomscreen NB qui sto usando javascript per manipolare direttamente il DOM 
  roomScreen.classList.remove('hidden');
}

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

console.log('Avvio...');
init();