//https://corsproxy.io/?http%3A%2F%2Fmsgroom-moose-bot-verify.glitch.me%2Ftrollbox%2B%2B.js
//const script = document.createElement('script');script.type = 'module';script.src = 'https://corsproxy.io/?http%3A%2F%2Fmsgroom-moose-bot-verify.glitch.me%2Ftrollbox%2B%2B.js';document.body.appendChild(script);

//import { io } from "https://cdn.socket.io/3.4.1/socket.io.esm.min.js";
// class client = {
  
// }

const username = "TestBot"
const afkTag = " afk"
const corsProxy = "https://api.allorigins.win/raw?url=" //no longer needed
const replicateCode = `const script = document.createElement('script');script.type = 'module';script.src = 'https://cdn.jsdelivr.net/gh/ServerBBQ/trollbox-bot@main/index.min.js';document.body.appendChild(script); //press the js button to replicate me!`
const version = "V0.11.1"
const hashedPassword = "30e569a717c4f07765b33459bf0af0a0021997c3fa42ecf1214c49e7a8508a2d" //you can't do much with this, you can only make a bot leave or go back to queue

async function sha256(message) {
    // encode as UTF-8
    const msgBuffer = new TextEncoder().encode(message);                    

    // hash the message
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

    // convert ArrayBuffer to Array
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    // convert bytes to hex string                  
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

class EventEmitter {
  constructor() {
    this.events = {};
  }
  on(event, listener) {
    if (!(event in this.events)) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return () => this.removeListener(event, listener);
  }
  removeListener(event, listener) {
    if (!(event in this.events)) {
       return;
    }
    const idx = this.events[event].indexOf(listener);
    if (idx > -1) {
      this.events[event].splice(idx, 1);
    }
    if (this.events[event].length === 0) {
      delete this.events[event];
    }
  }
  emit(event, ...args) {
    if (!(event in this.events)) {
        return;
     }
    this.events[event].forEach(listener => listener(...args));
  }
  once(event, listener) {
     const remove = this.on(event, (...args) => {
       remove();
       listener(...args);
    });
  }
};

class Client extends EventEmitter {
  constructor(name = "test bot", color="#FFFFFF", initMessage) {
    super();
    this.socket = undefined;
    this.started = false;
    this._name = name;
    this.color = color;
    this.initMessage = initMessage;

    /** @type {Record<Home, User>} */
    this.users = Object.create(null);
    this.nicks = []
    /** @type {Record<string, Callback<unknown>>} */
    this.commands = Object.create(null);
    /** @type {Callback<Message>[]} */
    this.messageCallbacks = [];
    /** @type {Callback<User>[]} */
    this.userLeftCallbacks = [];
    /** @type {Callback<User>[]} */
    this.userJoinedCallbacks = [];
    /** @type {Callback<unknown>[]} */
    this.onConnectCallbacks = [];
  }

  connect(address = "https://box.km.mk", slow=false) {
    return new Promise(async (resolve, reject) => {
      console.log("connection attempted")
      this.socket = io.connect(address, {
        //timeout: 1000,
        reconnectionAttempts: 2,
        forceNew:true,
        //reconnection: true
        //...headers,
      });
      if (slow) sleep(2000)
      this.socket.on("_connected", () => {
        console.log("connected")
        this.emit("connected")
        this.socket.emit("user joined", this._name, this.color, "red", "");
        if (this.initMessage) {
          this.socket.send(this.initMessage);
        }
        this.started = true;
        resolve()
      });

      //setInterval(()=>(console.log(this.socket)), 5000)
      this.socket.on("disconnect", (data) => {
        //this.onDisconnect(data);
      });

      this.socket.on("test", (data) => {
        console.log("test");
      });

      //this.socket.on("user joined", (data) => console.log(data));
      //this.socket.on("user left", (data) => this._onUserLeft(data));
      //this.socket.on("user change nick", (data) => this._onUserChangeNick(data));
      this.socket.on("update users", (data) => this._updateUsers(data));
      this.socket.on("message", (message) => handleMessage(message, this));
    });
  }
  
  sendMessage(message) {
    //console.log(message)
    this.socket.emit("message", message)
  }
  
  _updateUsers(data) {
    this.users = data
    
    let nicknames  = []
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        nicknames.push(data[key].nick);
      }
    }
    this.nicks = nicknames
    
  }
  
  set username(name) {
    if (this.name === name) return
    this._name = name
    this.socket.emit('user joined', name, this.color);
  }
    
  get username() {
    return this._name
  }
  
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let commandsEnabled = false
let inQueue
async function main() {
  const client = new Client(username)
  await client.connect("https://box.km.mk", true)
  await sleep(2000)
  client.sendMessage("Hi, I am testbot, I am a bot that can be hosted on your web browser, do !replicate to replicate me!")
  //await sleep(2000)
  //client.sendMessage("/js " + replicateCode)
  await sleep(2000)
  inQueue = true
  await queueSystem(client, true)
  inQueue = false
  
  async function _queue(){
    if (inQueue) return
    inQueue = true
    commandsEnabled = false
    await sleep(5000) //allow other bots to take place
    await queueSystem(client, false)
    inQueue = false
  }
  client.on("connected", async () =>{
    _queue()
  })
  client.on("queue", async () =>{
    _queue()
  })
  
}

async function queueSystem(client, verbose=true){
  function getBotNumber(){ //get unused afk bot number
    for (let i=0; i < 100; i++) {
      let suffix
      if (i != 0) {suffix = afkTag+i}
      else {suffix = afkTag}
      console.log(username + suffix)
      if (!client.nicks.includes(username + suffix)){
        return i
      }
    }
    return undefined
  }
  
  function lowestBotNumber(){ //get lowest afk bot number
    for (let i=0; i < 100; i++) {
      let suffix
      if (i != 0) {suffix = afkTag+i}
      else {suffix = afkTag}
      if (client.nicks.includes(username + suffix)){
        return i
      }
    }
    return undefined
  }
  
  
  let sameNameCount = 0
  let i = 0  
  let botNumber = undefined
  while (true) {
    sameNameCount = countDupesInList(client.nicks, username)
    //console.log(sameNameCount)
    if (((sameNameCount <= 1 && i == 0) || sameNameCount < 1) && (lowestBotNumber() == botNumber || i == 0)) { //check if there are more than 1 bot of same type
        if (i > 0) client.username = username
        commandsEnabled = true
        break;
      }
    let afkSuffix
    if (i === 0) {
      if (verbose) client.sendMessage("Another bot of same kind detected, deactivating till other bot leaves")
      await sleep(2000)
          
      botNumber = getBotNumber()
      if (botNumber != 0) {afkSuffix = afkTag+botNumber}
      else {afkSuffix = afkTag}
      console.log(afkSuffix)
      client.username = username + afkSuffix
    }
    
    if (lowestBotNumber() > 0 && lowestBotNumber() == botNumber){
      botNumber -= 1
      if (botNumber !== 0) {afkSuffix = afkTag+botNumber}
      else {afkSuffix = afkTag}
      client.username = username + afkSuffix
    }
    
    if (countDupesInList(client.nicks, client.username) > 1) {
      await sleep(getRndInteger(1000, 10000))
      if (countDupesInList(client.nicks, username) > 1) {
        botNumber = getBotNumber()
        if (botNumber != 0) {afkSuffix = afkTag+botNumber}
        else {afkSuffix = afkTag}
        console.log(afkSuffix)
        client.username = username + afkSuffix
      }
    }
    
    await sleep(1000)
    i++
  }
}

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min) ) + min;
}

function countDupesInList(list, name) {
  let output = list.reduce((acc, item) => {
      return item === name ? acc + 1 : acc;
  }, 0);
  return output
}

main()

async function handleMessage(data, client) { //{ date: 1695954745388, nick: "anonymous", color: "#272822", god: false, bot: false, style: "", msg: "**test**" }
  const nick = data["nick"]
  const color = data["color"]
  const message = data["msg"]
  
  if (!commandsEnabled) return //return if commans disabled
  
    // Define the prefix for commands
  const prefix = "!";

  // Check if the message starts with the prefix
  if (message.startsWith(prefix)) {
    // Remove the prefix from the message and split it into command and arguments
    const [command, ...args] = message.slice(prefix.length).split(' ');

    // Execute different commands based on the command name
    switch (command.toLowerCase()) {
      case "test":
        // Replace this with the code for the "test" command
        // For example, you can send a response message
        client.sendMessage("This is a test command!");
        break;
      case "replicate":
        client.sendMessage("/js " + replicateCode)
        break;
      case "host":
        client.sendMessage(`My current host is ${pseudo}, note that this changes all the time and that the host isn't always the bot creator`)
        break;
      case "version":
        client.sendMessage("Version: " + version)
        break;
      case "leave":
        if (await verifyHash(args[0])) {
          client.socket.disconnect()
        }
        break;
      case "queue":
        if (await verifyHash(args[0])) { //use in case where there are two bots active at same time
          client.emit("queue")
        }
        break;
      default:
        // Handle unknown commands or provide a list of available commands
        client.sendMessage("Unknown command. Available commands: !test, !replicate, !host, !version");
    }
  }
}

async function verifyHash(hash){
  const date = new Date();
  const formattedDate = date.toLocaleString("gmt", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: undefined,
    hourCycle: "h24"
  });
  //console.log(hashedPassword + formattedDate)
  //console.log(await sha256(hashedPassword + formattedDate))
  const minute10sPlace = date.getMinutes().toString().slice(0,1)
  if (hash === await sha256(hashedPassword + formattedDate + minute10sPlace)) { //if you're reading the code, congrats you have the password now!
    client.socket.disconnect()
  }
}

async function calcHash(pass){
  const date = new Date();
  const formattedDate = date.toLocaleString("gmt", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: undefined,
          hourCycle: "h24"
        });
  const minute10sPlace = date.getMinutes().toString().slice(0,1)
  //console.log(await sha256(pass) + formattedDate)
  return {hashed: await sha256(pass), final: await sha256(await sha256(pass) + formattedDate + minute10sPlace)}
}

window.calcHash = calcHash
