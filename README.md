# Ice Breaker 

È una webapp che sfrutta webrtc per la condivisione di file in modalità p2p. 

# Funzionamento
Quando ci si connette al server, viene data la possibilità di creare una stanza con un id personalizzato, di default l'id della stanza è l'id della socket usata per la connessione al server. Il primo peer che entra nella stanza è automaticamente marchiato come **SENDER** ed ha la possibilità di caricare ed un file. Per condividere il file o si condivide il link mostrato a schermo, o si può mostrare un QRCode da scannerizzare. In ogni caso il link contiene una query string con all'interno il nome della stanza su cui sta avvenendo la condivisione. Quando un altro peer si connette alla stanza del viene contrassegnato come **RECEIVER** e gli viene inviato in automatico il file messo a disposizione da SENDER tramite canale dati WebRTC. 

# Struttura 

## FrontEnd
Questa directory contiene i file statici (index.html, style.css) per la costruzione dell'interfaccia, ed il file javascript contenente la logica dell'applicazione client. 
Le funzioni del client oltre la possibilità di trasmettere e ricevere un file sono:
- Visualizzazione ed aggiornamento in tempo reale di una lista di peer connessi 
- Contatore dei peer connessi
- Visualizzazione anteprima del file, nel caso si tratti di un immagine

Il file viene trasmesso sul canale dati WebRTC, sotto forma di stream di "chunks" binari. Prima di procedere alla trasmissione infatti, il file viene suddiviso in diversi pezzi che saranno trasmessi e poi recuperati e ricostruiti dal ricevente. Dato che il server viene usato solo per effettuare il signaling e l'acquisizione di informazioni sulla stanza in uso, i comandi per la trasmissione dei file ed i metadati, sono trasmessi direttamente sul canale dati webrtc
## Server
Il server si occupa solo dell'inoltro dei messaggi che servono al signaling WebRTC, inoltre offre il supporto a stanze con più peer, oltre che la gestione di più stanze. I messaggi supportati dal server sono: 
- join-room: Messaggio inviato da un client che intende fare il join in una stanza
- offer: Offer WebRTC inviata da un client che intende iniziale il signaling
- answer: Answer WebRTC inviata da un client che ha accettato una offer inoltrata da un server
- ice-candidate: Con questi messaggi i client inviano al server gli ice-candidate, per effettuare il trickleice.
- get-peers: Il client invia questo messaggio quando vuole informazioni sui peer connessi alla sua stanza 
Il server in risposta può trasmettere altri due tipi di messaggi oltre a quelli di inoltro: 
- joined-room: Indica che un peer ha effettuato il join
- peer-joined: Indica ai peer connessi ad una stanza che un nuovo peer si è connesso

# Utilizzo
Clonare il repository, entrare nella directory BackEnd ed eseguire il server con node.

# Sviluppi futuri
- Portare tutto su REACT.
- Aggiungere il supporto ad HTTPS.
- Migliorare la gestione delle stanze.
- Funzionalità di login automatico quando è fornito l'id della stanza come querystring.
- Download diretto su disco. 

