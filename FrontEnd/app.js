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
