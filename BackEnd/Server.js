const express = require ('express');
const {createServer} = require ('http');
const {Server} = require ('socket.io');
const {join} = require('path');
const os = require('os');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
// Dice a node di servire i file statici presenti nella cartella public
app.use(express.static(join(__dirname,'../FrontEnd')));


//questa funzione serve a rilevare l'indirizzo ip del server aggiunta per comodità, se si publica il server
//bisogna cambiarne la logica facendo in modo che restituisca il dominio del server
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Salta indirizzi interni e non-IPv4
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    
    return 'localhost'; // Fallback
}
//gestione delle stanze 
const rooms = new Map();
const LOCAL_IP = getLocalIPAddress();
const PORT = process.env.PORT || 3000;

io.on('connection',(socket)=>{
    console.log("Client connesso: ",socket.id);

    socket.on('join-room', ({room, clientId})=>{
        console.log('${clientId} entrato nella stanza ${room}');
        //entra nella stanza 
        socket.join(room);
        socket.data.room = room;
        socket.data.clientId = clientId;

        let role = 'receiver';
        let isCreator = false;

        //verifica se la stanza non esiste
        if (!rooms.has(room)){
            //crea la prima stanza con i relativi attributi
            rooms.set(room,{
                creator: socket.id,
                members: [],
            });
            //imposta il ruolo come sender in quanto è il creatore della prima stanza
            role = 'sender'
            isCreator = true;
            console.log('il client ${clientId} è SENDER');
        }else{
            console.log("il client ${clientId} è RECEIVER");
        }
        //aggiorna il ruolo 
        socket.data.role = role;
        const roomData = rooms.get(room);
        //aggiunge il peer alla stanza
        roomData.members.push({
            socketId: socket.id,
            clientId: clientId,
            role: role
        });
        //dice che il peer ha effettuato il join 
        socket.emit('joined-room',{
            room,
            clientId,
            socketId: socket.id,
            role: role,
            isCreator: isCreator,
            serverIP: LOCAL_IP,      
            serverPort: PORT   
        });
        //Dice ai peer connessi alla stanza che un nuovo peer è entrato
        socket.to(room).emit('peer-joined',{
            peerId: clientId,
            socketId: socket.id,
            role: role
        });
    });

    //Inoltra una offer quando la riceve 
    socket.on('offer', ({offer, to, from})=>{
        io.to(to).emit('offer',{offer, from: socket.id, fromClientId: from});
    });
    
    //Inoltra la answer quando la riceve
    socket.on('answer', ({answer, to, from})=> {
        io.to(to).emit('answer', {answer, from: socket.id, fromClientId: from});
    });

    //inoltra l'icecandidate
    socket.on('ice-candidate',({candidate, to, from })=>{
        io.to(to).emit('ice-candidate',{candidate, from: socket.id, fromClient: from});
    });

    //Fornisce informazioni sui peer connessi
    socket.on('get-peers',(callback)=>{
        const room = socket.data.room;
        if(room&&rooms.has(room)){
          const roomData = rooms.get(room);
          const peers = roomData.members
          .filter(m=>m.socketId !== socket.id)
          .map(m => ({
              socketId: m.socketId,
              clientId: m.clientId,
              role: m.role
          }));
          callback(peers);
        } else{
            callback([]);
        }
    });

    socket.on('disconnect', ()=>{
        console.log('client disconnesso: ',socket.id);
        const room = socket.data.room;
        if(room&&rooms.has(room)){
            const roomData = rooms.get(room);
            roomData.members = roomData.members.filter(m=>m.socketId !== socket.id);
            socket.to(room).emit('peer-left',{
                socketId: socket.id,
                clientId: socket.data.clientId
            });
            if(roomData.creator === socket.id){
                rooms.delete(room);
            }else if(roomData.members.length === 0){
                rooms.delete(room);
            }
        }
    });
});

httpServer.listen(PORT,()=>{
    console.log(`IP Locale: ${LOCAL_IP}`);
    console.log(`Server in ascolto su http://${LOCAL_IP}:${PORT}`);
});