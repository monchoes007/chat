const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express")
const app = express()
const http = require("http")
const server = http.createServer(app)
const {Server} = require("socket.io")
const io = new Server(server)
const puerto=6498

// conectamos con MongoDB
const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri,  {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    }
);
client.connect();

var usuarios=[]

function Usuario(){
    var nombre
    var socket
    var color
}

app.get("/",(req,res)=>{
    res.sendFile(__dirname+"/index.html")
})

io.on("connection",(socket)=>{
    
    var elUsuario = new Usuario()
    elUsuario.nombre="Anónimo"
    elUsuario.socket=socket
    elUsuario.color=getRandomHexColor()
    usuarios.push(elUsuario)

    console.log("Se ha conectado alguien")
    console.log(`Usuarios conectados ${usuarios.length}`)

    // Mando las conversaciones anteriores
    mandoLasConversaciones(socket);
    
    socket.on("cliente nombre",(nombre)=>{
        elUsuario.nombre=nombre.trim()
        socket.broadcast.emit('servidor aviso',`Se ha conectado ${elUsuario.nombre}`)
    })

    socket.on("disconnect",()=>{
        console.log("Se ha desconectado un usuario")
        socket.broadcast.emit("servidor aviso",`Se ha desconectado un usuario ${elUsuario.nombre}`)
        var indice=usuarios.indexOf(elUsuario)
        usuarios.splice(indice,1)
        console.log(`Usuarios conectados ${usuarios.length}`)
    })

    socket.on("mensaje cliente",(mensaje)=>{
        if(mensaje.toLowerCase().trim().indexOf('nick:')==0){
            let nombreAntiguo=elUsuario.nombre
            elUsuario.nombre=mensaje.trim().substr(5).trim()
            socket.broadcast.emit("servidor aviso",`${nombreAntiguo} ha cambiado el nombre a ${elUsuario.nombre}`)
            socket.emit("servidor aviso",`Has cambiado tu nombre a ${elUsuario.nombre}`)
        }else if(mensaje.toLowerCase().trim()=='ver usuarios'){
            enviar=[];
            usuarios.forEach((usuario)=>{
                enviar.push(usuario.nombre)
            })
            socket.emit("lista usuarios",enviar)
            console.log(enviar)
        }else{
            io.emit("mensaje servidor",`${elUsuario.nombre}> <font color='${elUsuario.color}'>${mensaje}</font>`)
            
            guardaMongo(mensaje,elUsuario)
        }

    })

})


function guardaMongo(mensaje,usuario){
    const conversacion = client.db("Chat").collection("Conversaciones");
    // cojo la fecha
    const fecha=new Date();
    const ano=fecha.getFullYear()
    const mes=fecha.getMonth()+1
    const dia=fecha.getDate()
    const hora=fecha.getHours()
    const minuto=fecha.getMinutes()
    const segundo=fecha.getSeconds()

    conversacion.insertOne({
        mensaje: mensaje,
        fecha: `${ano}-${mes}-${dia} ${hora}:${minuto}:${segundo}`,
        usuario: usuario.nombre,
        ipV6: usuario.socket.request.connection.remoteAddress,
        ipV4: usuario.socket.handshake.address,
        color: usuario.color
    })

}



server.listen(puerto,()=>{
    console.log("Escuchando el puerto "+puerto)
})


function getRandomHexColor() {
    // Generar tres componentes de color (rojo, verde y azul)
    var r = Math.floor(Math.random() * 200);
    var g = Math.floor(Math.random() * 200);
    var b = Math.floor(Math.random() * 200);
  
    // Convertir los componentes a formato hexadecimal y asegurarse de que tengan dos dígitos
    var hexR = r.toString(16).padStart(2, '0');
    var hexG = g.toString(16).padStart(2, '0');
    var hexB = b.toString(16).padStart(2, '0');
  
    // Concatenar los componentes para formar el código hexadecimal completo
    var hexColor = '#' + hexR + hexG + hexB;
  
    return hexColor;
  }

  async function mandoLasConversaciones(socket){
    const conversa = client.db("Chat").collection("Conversaciones");

    const conversaciones = await conversa.find({}, { _id: 0, usuario: 1, mensaje: 1 }).sort({ fecha: 1 }).toArray()

    socket.emit("conversaciones anteriores",conversaciones)

   console.log(conversaciones) 
  }