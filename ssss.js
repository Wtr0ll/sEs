const fetch = require("node-fetch-commonjs");
const ByteBuffer = require("bytebuffer");
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 }, () => {
    console.log('session saver started');
});

let counts = 0;
const connections = new Map();
const sessions = {};
const sessionsNames = {};
const sessions_1 = {};
const records = {};
const verifyRecords = {};
const leaderboardData = {};
const serversSessions = {};

function encode(e) {
    return new Uint8Array(codec.encode(9, {name: "message", msg: e}));
}
function decode(e) {
    return codec.decode(new Uint8Array(e)).response.msg;
}
const sendSessions = () => {
    try {
        connections.forEach(e => {
            if (e.type == "user") {
                e && e.send(encode(`sessions,  ;${JSON.stringify(sessionsNames)}`));
            }
        });
    } catch(e) {
        console.log(e);
    }
}

const cipher = salt => {
    const textToChars = text => text.split('').map(c => c.charCodeAt(0));
    const byteHex = n => ("0" + Number(n).toString(16)).substr(-2);
    const applySaltToChar = code => textToChars(salt).reduce((a,b) => a ^ b, code);
    return text => text.split('').map(textToChars).map(applySaltToChar).map(byteHex).join('');
}

let salt = "thisisblaack";
let adminsalt = "thisisntblaaack.";

wss.on('connection', ws => {
    ws.id = counts++;
    ws.type = null;
    ws.sessionConnectedToId = null;
    ws.isVerified = null;
    let hasAccess = false;
    let isAdmin = false;
    const key = (Math.random() * 99999).toString(16);
    const encodedKey = cipher(salt)(key);
    const encodedKey2 = cipher(adminsalt)(key);
    console.log(`${ws.id} joined.`);
    const sendMessage = m => {
        try {
            ws && ws.readyState == 1 && ws.send(encode(m));
        } catch(e) {
            console.log(e);
        }
    }
    ws.on('message', m => {
        try {
            let x = new Uint8Array(m);
            if (hasAccess && x[0] == 1 && ws.isVerified && sessions_1[ws.sessionConnectedToId]) {
                x = x.slice(1);
                const opcode = x[0];
                if (opcode == 9) {
                    const data = sessions_1[ws.sessionConnectedToId].codec.decode(x);
                    if (data.name == "BuyItem" && data.response.tier == 1) {
                        if (data.response.itemName == "PetCARL" || data.response.itemName == "PetMiner") return;
                        if (data.response.itemName == "Pickaxe" && sessions_1[ws.sessionConnectedToId].inventory.Pickaxe) return;
                        if (data.response.itemName == "Spear" && sessions_1[ws.sessionConnectedToId].inventory.Spear) return;
                        if (data.response.itemName == "Bow" && sessions_1[ws.sessionConnectedToId].inventory.Bow) return;
                        if (data.response.itemName == "Bomb" && sessions_1[ws.sessionConnectedToId].inventory.Bomb) return;
                    }
                    if (data.name == "SetPartyName" && !(new TextEncoder().encode(data.response.partyName).length <= 49)) return;
                    if (data.name == "SendChatMessage" && !(new TextEncoder().encode(data.response.message).length <= 249)) return;
                }
                sessions_1[ws.sessionConnectedToId].ws.send(x);
                return;
            }
            if (hasAccess && x[0] == 2 && ws.isVerified) {
                sessions_1[ws.sessionConnectedToId] && sessions_1[ws.sessionConnectedToId].ws && sessions_1[ws.sessionConnectedToId].ws.readyState == 1 && sessions_1[ws.sessionConnectedToId].ws.send(x.slice(1));
                return;
            }
            let msg = decode(m);
            if (!hasAccess) {
                if (msg.startsWith("plsverify")) {
                    sendMessage(`encodeyounoob,  ;${key}`);
                }
                if (msg.startsWith("decodednoob")) {
                    let args = msg.split(",  ;");
                    if (args[1] == encodedKey || args[1] == encodedKey2) {
                        hasAccess = true;
                        sendMessage("accesssuccess");
                        if (args[1] == encodedKey2) isAdmin = true;
                    }
                }
            }
            if (isAdmin) {
                if (msg.startsWith("changehasaccess")) {
                    let args = msg.split(",  ;");
                    salt = args[1];
                }
            }
            if (msg == "getleaderboarddata") {
                sendMessage(`leaderboarddata,  ;${JSON.stringify(leaderboardData)}`);
            }
            if (!hasAccess) return;
            if (msg == "user") {
                sendMessage(`id,  ;${ws.id}`);
                sendMessage(`sessions,  ;${JSON.stringify(sessionsNames)}`);
                ws.type = "user";
            }
            if (msg == "getsessions") {
                sendMessage(`sessions,  ;${JSON.stringify(sessionsNames)}`);
            }
            if (msg == "getrecords") {
                sendMessage(`records,  ;${JSON.stringify(records)}`);
            }
            if (msg == "getverifiedrecords") {
                sendMessage(`verifiedrecords,  ;${JSON.stringify(verifyRecords)}`);
            }
            if (ws.type == "user") {
                if (msg.startsWith("verify")) {
                    let sid = parseInt(msg.split(",  ;")[1]);
                    if (sessions[sid]) {
                        if(sessions[ws.sessionConnectedToId] && sessions[ws.sessionConnectedToId][ws.id]) delete sessions[ws.sessionConnectedToId][ws.id];
                        ws.sessionConnectedToId = sid;
                        ws.isVerified = false;
                        sessions[sid][ws.id] = ws.id;
                        sendSessions();
                        sessions[sid] && Object.values(sessions[sid]).forEach(e => {
                            let ws = connections.get(e);
                            ws && !ws.isVerified && (ws.send(encode(`verifydata,  ;${JSON.stringify(sessions_1[sid].getSyncNeeds())}`)), ws.isVerified = true);
                        });
                    }
                }
                if (msg.startsWith("packet") && ws.isVerified && sessions_1[ws.sessionConnectedToId]) {
                    let args = msg.split(",  ;");
                    const opcode = parseInt(args[1]);
                    const data = JSON.parse(args.slice(2).join(",  ;"));
                    if (opcode == 9) {
                        if (data.name == "BuyItem" && data.tier == 1) {
                            if (data.itemName == "PetCARL" || data.itemName == "PetMiner") return;
                            if (data.itemName == "Pickaxe" && sessions_1[ws.sessionConnectedToId].inventory.Pickaxe) return;
                            if (data.itemName == "Spear" && sessions_1[ws.sessionConnectedToId].inventory.Spear) return;
                            if (data.itemName == "Bow" && sessions_1[ws.sessionConnectedToId].inventory.Bow) return;
                            if (data.itemName == "Bomb" && sessions_1[ws.sessionConnectedToId].inventory.Bomb) return;
                        }
                        if (data.name == "SetPartyName" && !(new TextEncoder().encode(data.partyName).length <= 49)) return;
                        if (data.name == "SendChatMessage" && !(new TextEncoder().encode(data.message).length <= 249)) return;
                    }
                    sessions_1[ws.sessionConnectedToId].sendPacket(opcode, data);
                }
                if (msg.startsWith("buffer") && ws.isVerified) {
                    let args = msg.split(",  ;");
                    sessions_1[ws.sessionConnectedToId] && sessions_1[ws.sessionConnectedToId].ws && sessions_1[ws.sessionConnectedToId].ws.readyState == 1 && sessions_1[ws.sessionConnectedToId].ws.send(new Uint8Array(JSON.parse(args[1])));
                }
                if (msg.startsWith("createsession")) {
                    let args = msg.split(",  ;");
                    let sessionName;
                    args[1] ? (sessionName = args[1].slice(0, 25)) : null;
                    let name = args[2] || "";
                    let sid = args[3];
                    let psk = args[4];
                    new Bot(sessionName, name, sid, psk);
                }
                if (msg.startsWith("ear")) {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.autorespawn = true);
                }
                if (msg.startsWith("dar")) {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.autorespawn = false);
                }
                if (msg.startsWith("eah")) {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.autoheal = true);
                }
                if (msg.startsWith("dah")) {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.autoheal = false);
                }
                if (msg.startsWith("eab")) {
                    if (!sessions_1[ws.sessionConnectedToId] || !sessions_1[ws.sessionConnectedToId].gs) return;
                    const _this = sessions_1[ws.sessionConnectedToId];
                    _this.scripts.autobuild = true;
                    _this.inactiveRebuilder.forEach((e, t) => _this.inactiveRebuilder.delete(t));
                    _this.rebuilder.forEach((e, t) => _this.rebuilder.delete(t));
                    Object.values(_this.buildings).forEach(e => {
                        _this.rebuilder.set((e.x - _this.gs.x) / 24 + (e.y - _this.gs.y) / 24 * 1000, [(e.x - _this.gs.x) / 24, (e.y - _this.gs.y) / 24, e.type]);
                    })
                }
                if (msg.startsWith("dab")) {
                    if (!sessions_1[ws.sessionConnectedToId]) return;
                    const _this = sessions_1[ws.sessionConnectedToId];
                    _this.scripts.autobuild = false;
                    _this.inactiveRebuilder.forEach((e, t) => _this.inactiveRebuilder.delete(t));
                    _this.rebuilder.forEach((e, t) => _this.rebuilder.delete(t));
                }
                if (msg.startsWith("eau")) {
                    if (!sessions_1[ws.sessionConnectedToId] || !sessions_1[ws.sessionConnectedToId].gs) return;
                    const _this = sessions_1[ws.sessionConnectedToId];
                    _this.scripts.autoupgrade  = true;
                    _this.inactiveReupgrader.forEach((e, t) => _this.inactiveReupgrader.delete(t));
                    _this.reupgrader.forEach((e, t) => _this.reupgrader.delete(t));
                    Object.values(_this.buildings).forEach(e => {
                        _this.reupgrader.set((e.x - _this.gs.x) / 24 + (e.y - _this.gs.y) / 24 * 1000, [(e.x - _this.gs.x) / 24, (e.y - _this.gs.y) / 24, e.tier]);
                    })
                }
                if (msg.startsWith("dau")) {
                    if (!sessions_1[ws.sessionConnectedToId]) return;
                    const _this = sessions_1[ws.sessionConnectedToId];
                    _this.scripts.autoupgrade = false;
                    _this.inactiveReupgrader.forEach((e, t) => _this.inactiveReupgrader.delete(t));
                    _this.reupgrader.forEach((e, t) => _this.reupgrader.delete(t));
                }
                if (msg == "eaa") {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.autoaim = true);
                }
                if (msg == "daa") {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.autoaim = false);
                }
                if (msg.startsWith("eatb")) {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.autobow = true);
                }
                if (msg.startsWith("datb")) {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.autobow = false);
                }
                if (msg.startsWith("eapr")) {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.autopetrevive = true);
                }
                if (msg.startsWith("dapr")) {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.autopetrevive = false);
                }
                if (msg.startsWith("eaph")) {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.autopetheal = true);
                }
                if (msg.startsWith("daph")) {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.autopetheal = false);
                }
                if (msg == "ept") {
                    if (!sessions_1[ws.sessionConnectedToId]) return;
                    const _this = sessions_1[ws.sessionConnectedToId];
                    const args = msg.split(",  ;");
                    _this.scripts.playertrick = true;
                    _this.playerTrickPsk = (!args[1] || args[1].length != 20) ? _this.partyShareKey : args[1];
                }
                if (msg == "dpt") {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.playertrick = false);
                }
                if (msg == "erpt") {
                    if (!sessions_1[ws.sessionConnectedToId]) return;
                    const _this = sessions_1[ws.sessionConnectedToId];
                    const args = msg.split(",  ;");
                    _this.scripts.reverseplayertrick = true;
                    _this.playerTrickPsk = (!args[1] || args[1].length != 20) ? _this.partyShareKey : args[1];
                }
                if (msg == "drpt") {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.reverseplayertrick = false);
                }
                if (msg == "eaaz") {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.autoaimonzombies = true);
                }
                if (msg == "daaz") {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.autoaimonzombies = false);
                }
                if (msg == "eahrc") {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.ahrc = true);
                }
                if (msg == "dahrc") {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.ahrc = false);
                }
                if (msg == "earf") {
                    sessions_1[ws.sessionConnectedToId] && (serverMap.get(sessions_1[ws.sessionConnectedToId].serverId).filler = true);
                }
                if (msg == "darf") {
                    sessions_1[ws.sessionConnectedToId] && (serverMap.get(sessions_1[ws.sessionConnectedToId].serverId).filler = false);
                }
                if (msg == "epl") {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.positionlock = true);
                }
                if (msg == "dpl") {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.positionlock = false);
                }
                if (msg == "eape") {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.autopetevolve = true);
                }
                if (msg == "dape") {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.autopetevolve = false);
                }
                if (msg == "earc") {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.autoreconnect = true);
                }
                if (msg == "darc") {
                    sessions_1[ws.sessionConnectedToId] && (sessions_1[ws.sessionConnectedToId].scripts.autoreconnect = false);
                }
                if (msg.startsWith("lock")) {
                    if (!sessions_1[ws.sessionConnectedToId]) return;
                    const _this = sessions_1[ws.sessionConnectedToId];
                    const args = msg.split(",  ;");
                    if (args[1]) {
                        let pos = args[1].split(" ");
                        let x = parseInt(pos[0]);
                        let y = parseInt(pos[1]);
                        _this.lockPos = {x: x || _this.myPlayer.position.x, y: y || _this.myPlayer.position.y};
                    } else {
                        _this.lockPos = {x: _this.myPlayer.position.x, y: _this.myPlayer.position.y};
                    }
                }
                if (msg.startsWith("closesession")) {
                    let args = msg.split(",  ;");
                    if (sessions_1[args[1]]) {
                        sessions_1[args[1]].scripts.autoreconnect = false;
                        sessions_1[args[1]].disconnect();
                    }
                }
                if (msg.startsWith("changesessionname")) {
                    let args = msg.split(",  ;");
                    sessionsNames[args[1]] && (sessionsNames[args[1]].sessionName = (args[2] && args[2].slice(0, 25)) || "Session");
                    sendSessions();
                }
                if (msg.startsWith("changesessionid")) {
                    let args = msg.split(",  ;");
                    sessionsNames[args[1]] && (sessionsNames[args[1]].sessionUserId = parseInt(args[2]));
                    sendSessions();
                }
            }
        } catch(e) {
            console.log(e);
        }
    })
    ws.on("error", () => console.log("error"));
    ws.on("close", () => {
        try {
            console.log(`${ws.id} disconnected.`);
            connections.delete(ws.id);
            if (sessions[ws.sessionConnectedToId] && sessions[ws.sessionConnectedToId][ws.id]) {
                delete sessions[ws.sessionConnectedToId][ws.id];
            }
            sendSessions();
        } catch(e) {
            console.log(e);
        }
    });
    connections.set(ws.id, ws);
});
wss.on("error", () => console.log("error"));
wss.on('listening', () => console.log('listening on 8080'));

class Scripts {
    constructor() {
        this.autoheal = true;
        this.healset = 15;
        this.pethealset = 30;
        this.autorespawn = true;
        this.autobuild = false;
        this.autoupgrade = false;
        this.autoaim = false;
        this.autobow = false;
        this.autopetrevive = false;
        this.autopetheal = false;
        this.playertrick = false;
        this.reverseplayertrick = false;
        this.autoaimonzombies = false;
        this.ahrc = false;
        this.positionlock = false;
        this.autopetevolve = false;
        this.autoreconnect = true;
    }
}

class Bot {
    constructor(sessionName = null, name = " ", sid = "", psk = "") {
        if (!sid || !serverMap.get(sid)) return;
        if (serversSessions[sid]) {
            let count = 0;
            serversSessions[sid].forEach(ws => {
                if (ws.readyState == 0 || ws.readyState == 1) {
                    count++;
                }
                if (ws.readyState == 2 || ws.readyState == 3) {
                    ws.close();
                    serversSessions[sid].delete(ws);
                }
            })
            if (count >= 8) return;
        }
        this.sessionName = sessionName;
        this.name = name;
        this.serverId = sid;
        this.host = serverMap.get(sid).host;
        this.hostname = serverMap.get(sid).hostname;
        this.psk = psk;
        this.ws = new WebSocket(`wss://${this.host}:443/`, {headers: {"Origin": "","User-Agent": ""}});
        this.ws.binaryType = "arraybuffer";
        this.codec = new BinCodec();
        this.ws.onmessage = this.onMessage.bind(this);
        this.ws.onclose = () => {
            this.userId && sessions[this.userId] && (delete sessions[this.userId], delete sessions_1[this.userId], delete sessionsNames[this.userId], sendSessions());
            setTimeout(() => {
                this.scripts.autoreconnect && this.hasVerified && new Bot(this.sessionName, this.name, this.serverId, this.psk);
            }, 1500);
        }
        this.ws.onerror = () => {};
        if (!serversSessions[this.serverId]) serversSessions[this.serverId] = new Set();
        serversSessions[this.serverId].add(this.ws);
        this.entities = new Map();
        this.buildings = {};
        this.inventory = {};
        this.partyInfo = [];
        this.partyShareKey = psk;
        this.dayCycle = {cycleStartTick: 100, nightEndTick: 0, dayEndTick: 1300, isDay: 1};
        this.leaderboard = [];
        this.messages = [];
        this.parties = {};
        this.castSpellResponse = {};
        this.buildingUids_1 = {};
        this.uid = 0;
        this.tick = 100;
        this.hasVerified = false;
        this.scripts = new Scripts();
        this.petActivated = false;
        this.gs = null;
        this.rebuilder = new Map();
        this.inactiveRebuilder = new Map();
        this.reupgrader = new Map();
        this.inactiveReupgrader = new Map();
        this.nearestPlayer = null;
        this.nearestZombie = null;
        this.nearestPlayerDistance = Infinity;
        this.nearestZombieDistance = Infinity;
        this.playerTrickPsk = null;
        this.leaveOnce = null;
        this.joinOnce = null;
        this.harvesters = new Map();
        this.harvesterTicks = [
            {tick: 0, resetTick: 31, deposit: 0.4, tier: 1},
            {tick: 0, resetTick: 29, deposit: 0.6, tier: 2},
            {tick: 0, resetTick: 27, deposit: 0.7, tier: 3},
            {tick: 0, resetTick: 24, deposit: 1, tier: 4},
            {tick: 0, resetTick: 22, deposit: 1.2, tier: 5},
            {tick: 0, resetTick: 20, deposit: 1.4, tier: 6},
            {tick: 0, resetTick: 18, deposit: 2.4, tier: 7},
            {tick: 0, resetTick: 16, deposit: 3, tier: 8}
        ];
        this.players = false;
        this.positionRest = null;
        this.lockPos = {x: 12000, y: 12000};
        leaderboardData[this.serverId] = [];
    }
    encode(e) {
        return new Uint8Array(codec.encode(9, {name: "message", msg: e}));
    }
    decode(e) {
        return codec.decode(new Uint8Array(e)).response.msg;
    }
    sendMessage(m) {
        this.wss && this.wss.send(this.encode(m));
    }
    sendPacket(event, data) {
        this.ws && this.ws.readyState == 1 && this.ws.send(new Uint8Array(this.codec.encode(event, data)));
    }
    sendData(data) {
        sessions[this.userId] && Object.values(sessions[this.userId]).forEach(e => {
            let ws = connections.get(e);
            ws && ws.isVerified && ws.readyState == 1 && ws.send(data);
        });
    }
    async onMessage(msg) {
        const opcode = new Uint8Array(msg.data)[0];
        if (opcode == 5) {
            try {
                wasmModule(e => {
                    if (new Uint8Array(e[5].extra)[0] == 0 && new Uint8Array(e[5].extra)[1] == 0 && new Uint8Array(e[5].extra)[2] == 0) {
                        new Bot(this.sessionName, this.name, this.serverId, this.psk);
                    } else {
                        this.sendPacket(4, {displayName: this.name, extra: e[5].extra});
                        this.enterWorld2 = e[6];
                        this.Module = e[10];
                    }
                }, new Uint8Array(msg.data), this.hostname);
            } catch(e) {
                console.log(e);
            }
            return;
        }
        if (opcode == 10) {
            this.sendPacket(10, {extra: codec.decode(new Uint8Array(msg.data), this.Module).extra});
            return;
        }
        const data = this.codec.decode(msg.data);
        switch(opcode) {
            case 0:
                this.onEntitiesUpdateHandler(data);
                this.sendData(msg.data);
                !this.hasVerified && (this.userId = counts++, sessions[this.userId] = {}, sessionsNames[this.userId] = {sessionName: this.sessionName || "Session", sessionUserId: this.userId, actualUserId: this.userId}, sessions_1[this.userId] = this, sendSessions(), this.hasVerified = true);
                break;
            case 4:
                this.onEnterWorldHandler(data);
                break;
            case 9:
                this.onRpcUpdateHandler(data);
                let x = new Uint8Array(msg.data);
                x[0] = 8;
                this.sendData(x);
                break;
        }
    }
    onEntitiesUpdateHandler(data) {
        this.tick = data.tick;
        data.entities.forEach((entity, uid) => {
            const entity_1 = this.entities.get(uid);
            !entity_1 ? this.entities.set(uid, {uid: uid, targetTick: entity, model: entity.model}) : Object.keys(entity).forEach(e => entity_1.targetTick[e] = entity[e]);
        })
        this.nearestPlayer = null;
        this.nearestZombie = null;
        this.nearestPlayerDistance = Infinity;
        this.nearestZombieDistance = Infinity;
        this.entities.forEach((entity, uid) => {
            if (!data.entities.has(uid)) {
                this.entities.delete(uid);
                return;
            }
            if (this.scripts.autoaim) {
                if (entity.targetTick.model == "GamePlayer" && entity.targetTick.uid !== this.myPlayer.uid && entity.targetTick.partyId !== this.myPlayer.partyId && !entity.targetTick.dead) {
                    const distance = Math.hypot(entity.targetTick.position.x - this.myPlayer.position.x, entity.targetTick.position.y - this.myPlayer.position.y);
                    if (this.nearestPlayerDistance > distance) {
                        this.nearestPlayerDistance = distance;
                        this.nearestPlayer = entity.targetTick;
                    }
                }
            }
            if (this.scripts.autoaimonzombies) {
                if (entity.targetTick.model.startsWith("Zombie")) {
                    const distance = Math.hypot(entity.targetTick.position.x - this.myPlayer.position.x, entity.targetTick.position.y - this.myPlayer.position.y);
                    if (this.nearestZombieDistance > distance) {
                        this.nearestZombieDistance = distance;
                        this.nearestZombie = entity.targetTick;
                    }
                }
            }
        });
        this.myPlayer = this.entities.get(this.uid) && this.entities.get(this.uid).targetTick;
        this.myPet = this.myPlayer && this.entities.get(this.myPlayer.petUid) && this.entities.get(this.myPlayer.petUid).targetTick;
        const userCount = !!Object.keys(sessions[this.userId] || {}).length;
        if (!userCount && this.myPlayer) {
            this.scripts.autorespawn && this.myPlayer.dead && this.sendPacket(3, {respawn: 1});
            this.scripts.autoheal && (this.myPlayer.health / 5) <= this.scripts.healset && this.myPlayer.health > 0 && this.heal();
        }
        if ((!userCount || this.scripts.autopetheal) && this.myPet) {
            this.scripts.autoheal && (this.myPet.health / this.myPet.maxHealth)*100 <= this.scripts.pethealset && this.myPet.health > 0 && (this.buy("PetHealthPotion", 1), this.equip("PetHealthPotion", 1));
        }
        this.myPet && !this.petActivated && (this.petActivated = true);
        !userCount && !this.inventory.HealthPotion && this.buy("HealthPotion", 1);
        this.gs && this.scripts.autobuild && this.inactiveRebuilder.forEach(e => {
            const x = e[0] * 24 + this.gs.x;
            const y = e[1] * 24 + this.gs.y;
            if (Math.abs(this.myPlayer.position.x - x) < 576 && Math.abs(this.myPlayer.position.y - y) < 576) {
                this.sendPacket(9, {name: "MakeBuilding", x: x, y: y, type: e[2], yaw: 0});
            }
        })
        this.gs && this.scripts.autoupgrade && this.inactiveReupgrader.forEach(e => {
            const x = e[0] * 24 + this.gs.x;
            const y = e[1] * 24 + this.gs.y;
            if (Math.hypot((this.myPlayer.position.x - x), (this.myPlayer.position.y - y)) <= 768) {
                if (e[5] - this.tick <= 0) {
                    e[5] = this.tick + 7;
                    this.sendPacket(9, {name: "UpgradeBuilding", uid: e[4]});
                }
            }
        })
        this.scripts.autoaim && this.nearestPlayer && this.sendPacket(3, {mouseMoved: ((Math.atan2(this.nearestPlayer.position.y - this.myPlayer.position.y, this.nearestPlayer.position.x - this.myPlayer.position.x) * 180/Math.PI + 450) % 360) | 0});
        this.scripts.autoaimonzombies && this.nearestZombie && this.sendPacket(3, {mouseMoved: ((Math.atan2(this.nearestZombie.position.y - this.myPlayer.position.y, this.nearestZombie.position.x - this.myPlayer.position.x) * 180/Math.PI + 450) % 360) | 0});
        this.scripts.autobow && (this.sendPacket(3, {space: 0}), this.sendPacket(3, {space: 1}));
        this.scripts.autopetrevive && this.petActivated && (this.sendPacket(9, {name: "BuyItem", itemName: "PetRevive", tier: 1}), this.sendPacket(9, {name: "EquipItem", itemName: "PetRevive", tier: 1}));

        if (this.scripts.playertrick || this.scripts.reverseplayertrick) {
            const daySeconds = Math.floor((this.tick * 50 / 1000 + 60) % 120);
            if (!this.leaveOnce && daySeconds > 18) {
                this.leaveOnce = true;
                this.scripts.reverseplayertrick ? this.sendPacket(9, {name: "JoinPartyByShareKey", partyShareKey: this.playerTrickPsk}) : this.sendPacket(9, {name: "LeaveParty"});
            }
            if (!this.joinOnce && daySeconds >= 118 && this.playerTrickPsk) {
                this.joinOnce = true;
                this.scripts.reverseplayertrick ? this.sendPacket(9, {name: "LeaveParty"}) : this.sendPacket(9, {name: "JoinPartyByShareKey", partyShareKey: this.playerTrickPsk});
            }
        }
        this.scripts.ahrc && this.harvesterTicks.forEach(e => {
            e.tick++;
            if (e.tick >= e.resetTick) {
                e.tick = 0;
                this.depositAhrc(e);
            }
            if (e.tick == 1) {
                this.collectAhrc(e);
            }
        });
        const server = serverMap.get(this.serverId);
        if (server.filler && this.tick > server.tick && (this.players !== 32 || this.dayCycle.isDay)) {
            let count = 0;
            serversSessions[this.serverId].forEach(ws => {
                if (ws.readyState == 0 || ws.readyState == 1) {
                    count++;
                }
            })
            if (count < 8) {
                let amt = Math.min(8 - count, 4);
                let amtNeededToFill = this.dayCycle.isDay ? 1 : ((32 - this.players) || 1);
                let finalAmt = Math.min(amtNeededToFill, amt);
                server.tick = this.tick + 115;
                for (let i = 0; i < finalAmt; i++) {
                    new Bot(this.sessionName, this.name, this.serverId, "");
                }
            }
        }
        if (this.scripts.positionlock) {
            let x = (Math.round(((Math.atan2(this.lockPos.y - this.myPlayer.position.y, this.lockPos.x - this.myPlayer.position.x) * 180/Math.PI + 450) % 360) / 45) * 45) % 360;
            if (Math.hypot(this.lockPos.y - this.myPlayer.position.y, this.lockPos.x - this.myPlayer.position.x) > 100) {
                this.sendPacket(3, {up: (x == 0 || x == 45 || x == 315) ? 1 : 0, down: (x == 135 || x == 180 || x == 225) ? 1 : 0, right: (x == 45 || x == 90 || x == 135) ? 1 : 0, left: (x == 225 || x == 270 || x == 315) ? 1 : 0});
                this.positionRest = x;
            } else {
                if (this.positionRest != 696969) {
                    this.positionRest = 696969;
                    this.sendPacket(3, {up: 0, down: 0, right: 0, left: 0});
                }
            }
        }
    }
    onEnterWorldHandler(data) {
        if (!data.allowed) return;
        this.uid = data.uid;
        this.enterWorld2 && this.ws.send(this.enterWorld2);
        this.join(this.psk);
        this.buy("HatHorns", 1);
        this.buy("PetCARL", 1);
        this.buy("PetMiner", 1);
        this.equip("PetCARL", 1);
        this.equip("PetMiner", 1);
        for (let i = 0; i < 26; i++) this.ws.send(new Uint8Array([3, 17, 123, 34, 117, 112, 34, 58, 49, 44, 34, 100, 111, 119, 110, 34, 58, 48, 125]));
        this.ws.send(new Uint8Array([7, 0]));
        this.ws.send(new Uint8Array([9,6,0,0,0,126,8,0,0,108,27,0,0,146,23,0,0,82,23,0,0,8,91,11,0,8,91,11,0,0,0,0,0,32,78,0,0,76,79,0,0,172,38,0,0,120,155,0,0,166,39,0,0,140,35,0,0,36,44,0,0,213,37,0,0,100,0,0,0,120,55,0,0,0,0,0,0,0,0,0,0,100,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,134,6,0,0]));
        console.log("bot in game");
    }
    onRpcUpdateHandler(data) {
        switch(data.name) {
            case "LocalBuilding":
                data.response.forEach(e => {
                    if (this.buildingUids_1[e.uid]) return;
                    if (e.dead && !this.buildingUids_1[e.uid]) {
                        this.buildingUids_1[e.uid] = true;
                        setTimeout(() => {
                            delete this.buildingUids_1[e.uid];
                        }, 500);
                    }
                    if (e.type == "GoldStash") {
                        this.gs = e;
                    }
                    if (e.type == "GoldStash" && e.dead) {
                        if (this.scripts.autobuild) {
                            this.rebuilder.forEach(e => {
                                if (e[2] == "GoldStash") return;
                                this.inactiveRebuilder.set(e[0] + e[1] * 1000, e);
                            })
                        }
                        this.gs = null;
                    }
                    this.buildings[e.uid] = e;
                    e.dead && (delete this.buildings[e.uid]);
                    e.type == "Harvester" && this.harvesters.set(e.uid, e);
                    e.type == "Harvester" && e.dead && this.harvesters.delete(e.uid);
                    if (this.scripts.autobuild && this.gs && this.rebuilder.get((e.x - this.gs.x) / 24 + (e.y - this.gs.y) / 24 * 1000)) {
                        const index = (e.x - this.gs.x) / 24 + (e.y - this.gs.y) / 24 * 1000;
                        const _rebuilder = this.rebuilder.get(index);
                        e.dead ? this.inactiveRebuilder.set(index, _rebuilder) : this.inactiveRebuilder.delete(index);
                    }
                    if (this.scripts.autoupgrade && this.gs && this.reupgrader.get((e.x - this.gs.x) / 24 + (e.y - this.gs.y) / 24 * 1000)) {
                        const index = (e.x - this.gs.x) / 24 + (e.y - this.gs.y) / 24 * 1000;
                        const _reupgrader = this.reupgrader.get(index);
                        if (e.dead) {
                            this.inactiveReupgrader.delete(index);
                        } else {
                            if (e.tier < _reupgrader[2]) {
                                !this.inactiveReupgrader.get(index) && this.inactiveReupgrader.set(index, [_reupgrader[0], _reupgrader[1], _reupgrader[2], e.tier, e.uid, this.tick]);
                            } else {
                                this.inactiveReupgrader.delete(index);
                            }
                        }
                    }
                })
                break;
            case "PartyShareKey":
                this.partyShareKey = data.response.partyShareKey;
                this.psk = data.response.partyShareKey;
                break;
            case "Dead":
                this.buy("HatHorns", 1);
                break;
            case "SetItem":
                this.inventory[data.response.itemName] = data.response;
                if (this.inventory.HatHorns && !this.inventory.HatHorns.stacks) this.buy("HatHorns", 1);
                if (!this.inventory[data.response.itemName].stacks) delete this.inventory[data.response.itemName];
                if (data.response.itemName == "ZombieShield" && data.response.stacks) this.equip("ZombieShield", data.response.tier);
                break;
            case "PartyInfo":
                this.partyInfo = data.response;
                break;
            case "SetPartyList":
                this.parties = {};
                this.players = 0;
                data.response.forEach(e => {
                    this.parties[e.partyId] = e;
                    this.players += e.memberCount;
                });
                leaderboardData[this.serverId][0] = this.players;
                break;
            case "DayCycle":
                this.dayCycle = data.response;
                if (!data.response.isDay) {
                    this.leaveOnce = false;
                    this.joinOnce = false;
                    if (this.scripts.autopetevolve && this.myPet && [9, 17, 25, 33, 49, 65, 97].includes(Math.min(Math.floor(this.myPet.experience / 100) + 1, [9, 17, 25, 33, 49, 65, 97][this.myPet.tier - 1]))) {
                        this.sendPacket(9, {name: "BuyItem", itemName: this.myPet.model, tier: this.myPet.tier + 1});
                    }
                }
                break;
            case "Leaderboard":
                this.leaderboard = data.response;
                leaderboardData[this.serverId][1] = data.response;
                break;
            case "ReceiveChatMessage":
                this.messages.push(data.response);
                let _messages = [];
                if (this.messages.length > 50) {
                    for (let i = this.messages.length - 50; i < this.messages.length; i++) {
                        _messages.push(this.messages[i]);
                    }
                    this.messages = _messages;
                }
                break;
            case "CastSpellResponse":
                this.castSpellResponse = data.response;
                break;
        }
    }
    getSyncNeeds() {
        const syncNeeds = [];
        syncNeeds.push({allowed: 1, uid: this.uid, startingTick: this.tick, tickRate: 20, effectiveTickRate: 20, players: 1, maxPlayers: 32, chatChannel: 0, effectiveDisplayName: this.entities.get(this.uid) ? this.entities.get(this.uid).targetTick.name : this.name, x1: 0, y1: 0, x2: 24000, y2: 24000, opcode: 4});
        syncNeeds.push({name: 'PartyInfo', response: this.partyInfo, opcode: 9});
        syncNeeds.push({name: 'PartyShareKey', response: {partyShareKey: this.partyShareKey}, opcode: 9});
        syncNeeds.push({name: 'DayCycle', response: this.dayCycle, opcode: 9});
        syncNeeds.push({name: 'Leaderboard', response: this.leaderboard, opcode: 9});
        syncNeeds.push({name: 'SetPartyList', response: Object.values(this.parties), opcode: 9});
        const localBuildings = Object.values(this.buildings);
        const entities = [];
        this.entities.forEach(e => {
            entities.push([e.uid, e.targetTick]);
        });
        return {tick: this.tick, entities: entities, byteSize: 654, opcode: 0, syncNeeds: syncNeeds, localBuildings: localBuildings, inventory: this.inventory, messages: this.messages, serverId: this.serverId, useRequiredEquipment: true, petActivated: this.petActivated, castSpellResponse: this.castSpellResponse, isPaused: this.myPlayer ? this.myPlayer.isPaused : 0, sortedUidsByType: this.codec.sortedUidsByType, removedEntities: this.codec.removedEntities, absentEntitiesFlags: this.codec.absentEntitiesFlags, updatedEntityFlags: this.codec.updatedEntityFlags};
    }
    disconnect() {
        this.ws.send([]);
    }
    heal() {
        if (this.healTimeout_1) return;
        this.equip("HealthPotion", 1);
        this.buy("HealthPotion", 1);
        this.healTimeout_1 = true;
        setTimeout(() => {this.healTimeout_1 = null}, 500);
    }
    buy(item, tier) {
        this.sendPacket(9, {name: "BuyItem", itemName: item, tier: tier});
    }
    equip(item, tier) {
        this.sendPacket(9, {name: "EquipItem", itemName: item, tier: tier});
    }
    join(psk = "") {
        this.sendPacket(9, {name: "JoinPartyByShareKey", partyShareKey: psk});
    }
    depositAhrc(tick) {
        this.harvesters.forEach(e => {
            if (e.tier == tick.tier) {
                this.sendPacket(9, {name: "AddDepositToHarvester", uid: e.uid, deposit: tick.deposit});
            }
        })
    }
    collectAhrc(tick) {
        this.harvesters.forEach(e => {
            if (e.tier == tick.tier) {
                this.sendPacket(9, {name: "CollectHarvester", uid: e.uid});
            }
        })
    }
}

// server objects

const serverArr = JSON.parse('[["v1001","US East #1","149.28.33.161","zombs-951c21a1-0.eggs.gg"],["v1002","US East #2","104.238.135.188","zombs-68ee87bc-0.eggs.gg"],["v1003","US East #3","207.246.91.98","zombs-cff65b62-0.eggs.gg"],["v1004","US East #4","45.76.4.28","zombs-2d4c041c-0.eggs.gg"],["v1005","US East #5","45.77.203.204","zombs-2d4dcbcc-0.eggs.gg"],["v1006","US East #6","45.77.200.150","zombs-2d4dc896-0.eggs.gg"],["v1007","US East #7","104.156.225.133","zombs-689ce185-0.eggs.gg"],["v1008","US East #8","207.246.80.27","zombs-cff6501b-0.eggs.gg"],["v1009","US East #9","207.148.27.190","zombs-cf941bbe-0.eggs.gg"],["v1010","US East #10","45.77.149.224","zombs-2d4d95e0-0.eggs.gg"],["v1011","US East #11","173.199.123.77","zombs-adc77b4d-0.eggs.gg"],["v1012","US East #12","45.76.166.32","zombs-2d4ca620-0.eggs.gg"],["v1013","US East #13","149.28.58.193","zombs-951c3ac1-0.eggs.gg"],["v2001","US West #1","45.76.175.122","zombs-2d4caf7a-0.eggs.gg"],["v2002","US West #2","149.28.71.117","zombs-951c4775-0.eggs.gg"],["v2003","US West #3","149.28.87.132","zombs-951c5784-0.eggs.gg"],["v2004","US West #4","207.246.110.13","zombs-cff66e0d-0.eggs.gg"],["v2005","US West #5","45.76.68.210","zombs-2d4c44d2-0.eggs.gg"],["v2006","US West #6","108.61.219.244","zombs-6c3ddbf4-0.eggs.gg"],["v5001","Europe #1","95.179.241.70","zombs-5fb3f146-0.eggs.gg"],["v5002","Europe #2","80.240.19.5","zombs-50f01305-0.eggs.gg"],["v5003","Europe #3","217.163.29.174","zombs-d9a31dae-0.eggs.gg"],["v5004","Europe #4","80.240.25.107","zombs-50f0196b-0.eggs.gg"],["v5005","Europe #5","45.77.53.65","zombs-2d4d3541-0.eggs.gg"],["v5006","Europe #6","95.179.167.12","zombs-5fb3a70c-0.eggs.gg"],["v5007","Europe #7","95.179.164.203","zombs-5fb3a4cb-0.eggs.gg"],["v5008","Europe #8","95.179.163.97","zombs-5fb3a361-0.eggs.gg"],["v5009","Europe #9","199.247.19.65","zombs-c7f71341-0.eggs.gg"],["v5010","Europe #10","136.244.83.44","zombs-88f4532c-0.eggs.gg"],["v5011","Europe #11","45.32.158.210","zombs-2d209ed2-0.eggs.gg"],["v5012","Europe #12","95.179.169.17","zombs-5fb3a911-0.eggs.gg"],["v3001","Asia #1","66.42.52.118","zombs-422a3476-0.eggs.gg"],["v3002","Asia #2","45.77.248.180","zombs-2d4df8b4-0.eggs.gg"],["v3003","Asia #3","45.77.249.75","zombs-2d4df94b-0.eggs.gg"],["v3004","Asia #4","149.28.146.87","zombs-951c9257-0.eggs.gg"],["v3005","Asia #5","139.180.136.217","zombs-8bb488d9-0.eggs.gg"],["v3006","Asia #6","45.77.44.176","zombs-2d4d2cb0-0.eggs.gg"],["v4001","Australia #1","139.180.169.5","zombs-8bb4a905-0.eggs.gg"],["v4002","Australia #2","207.148.86.209","zombs-cf9456d1-0.eggs.gg"],["v4003","Australia #3","149.28.182.161","zombs-951cb6a1-0.eggs.gg"],["v4004","Australia #4","149.28.171.21","zombs-951cab15-0.eggs.gg"],["v4005","Australia #5","149.28.170.123","zombs-951caa7b-0.eggs.gg"],["v4006","Australia #6","149.28.165.199","zombs-951ca5c7-0.eggs.gg"],["v6001","South America #1","149.28.99.116","zombs-951c6374-0.eggs.gg"],["v6002","South America #2","149.28.97.132","zombs-951c6184-0.eggs.gg"],["v6003","South America #3","207.246.72.194","zombs-cff648c2-0.eggs.gg"],["v6004","South America #4","144.202.46.64","zombs-90ca2e40-0.eggs.gg"],["v6005","South America #5","45.32.175.4","zombs-2d20af04-0.eggs.gg"]]')
.map(e => ({id: e[0], name: e[1], region: e[1].split(" #")[0], hostname: e[2], players: 0, leaderboard: [], host: e[3], filler: false, tick: 0}));
const serverMap = new Map(serverArr.map(e => [e.id, e]));
// Bincodec Function

let PacketIds_1 = JSON.parse('{"default":{"0":"PACKET_ENTITY_UPDATE","1":"PACKET_PLAYER_COUNTER_UPDATE","2":"PACKET_SET_WORLD_DIMENSIONS","3":"PACKET_INPUT","4":"PACKET_ENTER_WORLD","5":"PACKET_PRE_ENTER_WORLD","6":"PACKET_ENTER_WORLD2","7":"PACKET_PING","9":"PACKET_RPC","10":"PACKET_BLEND","PACKET_PRE_ENTER_WORLD":5,"PACKET_ENTER_WORLD":4,"PACKET_ENTER_WORLD2":6,"PACKET_ENTITY_UPDATE":0,"PACKET_INPUT":3,"PACKET_PING":7,"PACKET_PLAYER_COUNTER_UPDATE":1,"PACKET_RPC":9,"PACKET_SET_WORLD_DIMENSIONS":2,"PACKET_BLEND":10}}');
let e_AttributeType = JSON.parse("{\"0\":\"Uninitialized\",\"1\":\"Uint32\",\"2\":\"Int32\",\"3\":\"Float\",\"4\":\"String\",\"5\":\"Vector2\",\"6\":\"EntityType\",\"7\":\"ArrayVector2\",\"8\":\"ArrayUint32\",\"9\":\"Uint16\",\"10\":\"Uint8\",\"11\":\"Int16\",\"12\":\"Int8\",\"13\":\"Uint64\",\"14\":\"Int64\",\"15\":\"Double\",\"Uninitialized\":0,\"Uint32\":1,\"Int32\":2,\"Float\":3,\"String\":4,\"Vector2\":5,\"EntityType\":6,\"ArrayVector2\":7,\"ArrayUint32\":8,\"Uint16\":9,\"Uint8\":10,\"Int16\":11,\"Int8\":12,\"Uint64\":13,\"Int64\":14,\"Double\":15}");
let e_ParameterType = JSON.parse("{\"0\":\"Uint32\",\"1\":\"Int32\",\"2\":\"Float\",\"3\":\"String\",\"4\":\"Uint64\",\"5\":\"Int64\",\"Uint32\":0,\"Int32\":1,\"Float\":2,\"String\":3,\"Uint64\":4,\"Int64\":5}");

class BinCodec {
  constructor() {
      this.attributeMaps = {};
      this.entityTypeNames = {};
      this.rpcMaps = [{
          "name": "message",
          "parameters": [{
              "name": "msg",
              "type": 3
          }],
          "isArray": false,
          "index": 0
      }, {
          "name": "serverObj",
          "parameters": [{
              "name": "data",
              "type": 3
          }],
          "isArray": false,
          "index": 1
      }];
      this.rpcMapsByName = {
          "message": {
              "name": "message",
              "parameters": [{
                  "name": "msg",
                  "type": 3
              }],
              "isArray": false,
              "index": 0
          },
          "serverObj": {
              "name": "serverObj",
              "parameters": [{
                  "name": "data",
                  "type": 3
              }],
              "isArray": false,
              "index": 1
          }
      };
      this.sortedUidsByType = {};
      this.removedEntities = {};
      this.absentEntitiesFlags = [];
      this.updatedEntityFlags = [];
      this.startedDecoding = Date.now();
  };
  encode(name, item, Module) {
      let buffer = new ByteBuffer(100, true);
      switch(name) {
          case PacketIds_1.default.PACKET_ENTER_WORLD:
              buffer.writeUint8(PacketIds_1.default.PACKET_ENTER_WORLD);
              this.encodeEnterWorld(buffer, item);
              break;
          case PacketIds_1.default.PACKET_ENTER_WORLD2:
              buffer.writeUint8(PacketIds_1.default.PACKET_ENTER_WORLD2);
              this.encodeEnterWorld2(buffer, Module);
              break;
          case PacketIds_1.default.PACKET_INPUT:
              buffer.writeUint8(PacketIds_1.default.PACKET_INPUT);
              this.encodeInput(buffer, item);
              break;
          case PacketIds_1.default.PACKET_PING:
              buffer.writeUint8(PacketIds_1.default.PACKET_PING);
              this.encodePing(buffer, item);
              break;
          case PacketIds_1.default.PACKET_RPC:
              buffer.writeUint8(PacketIds_1.default.PACKET_RPC);
              this.encodeRpc(buffer, item);
              break;
          case PacketIds_1.default.PACKET_BLEND:
              buffer.writeUint8(PacketIds_1.default.PACKET_BLEND);
              this.encodeBlend(buffer, item);
      };
      buffer.flip();
      buffer.compact();
      return buffer.toArrayBuffer(false);
  };
  decode(data, Module) {
      let buffer = ByteBuffer.wrap(data);
      buffer.littleEndian = true;
      let opcode = buffer.readUint8();
      let decoded;
      switch(opcode) {
          case PacketIds_1.default.PACKET_PRE_ENTER_WORLD:
              decoded = this.decodePreEnterWorldResponse(buffer, Module);
              break;
          case PacketIds_1.default.PACKET_ENTER_WORLD:
              decoded = this.decodeEnterWorldResponse(buffer);
              break;
          case PacketIds_1.default.PACKET_ENTITY_UPDATE:
              decoded = this.decodeEntityUpdate(buffer);
              break;
          case PacketIds_1.default.PACKET_PING:
              decoded = this.decodePing(buffer);
              break;
          case PacketIds_1.default.PACKET_RPC:
              decoded = this.decodeRpc(buffer);
              break;
          case PacketIds_1.default.PACKET_BLEND:
              decoded = this.decodeBlend(buffer, Module);
              break;
      };
      decoded.opcode = opcode;
      return decoded;
  };
  safeReadVString(buffer) {
      let offset = buffer.offset;
      let len = buffer.readVarint32(offset);
      try {
          var func = buffer.readUTF8String.bind(buffer);
          var str = func(len.value, "b", offset += len.length);
          offset += str.length;
          buffer.offset = offset;
          return str.string;
      } catch (e) {
          offset += len.value;
          buffer.offset = offset;
          return '?';
      };
  };
  decodePreEnterWorldResponse(buffer, Module) {
      Module._MakeBlendField(255, 140);
      var extraBuffers = this.decodeBlendInternal(buffer, Module);
      return {
          extra: extraBuffers
      };
  };
  decodeEnterWorldResponse(buffer) {
      let allowed = buffer.readUint32();
      let uid = buffer.readUint32();
      let startingTick = buffer.readUint32();
      let ret = {
          allowed: allowed,
          uid: uid,
          startingTick: startingTick,
          tickRate: buffer.readUint32(),
          effectiveTickRate: buffer.readUint32(),
          players: buffer.readUint32(),
          maxPlayers: buffer.readUint32(),
          chatChannel: buffer.readUint32(),
          effectiveDisplayName: this.safeReadVString(buffer),
          x1: buffer.readInt32(),
          y1: buffer.readInt32(),
          x2: buffer.readInt32(),
          y2: buffer.readInt32()
      };
      let attributeMapCount = buffer.readUint32();
      this.attributeMaps = {};
      this.entityTypeNames = {};
      for(let i = 0; i < attributeMapCount; i++) {
          let attributeMap = [];
          let entityType = buffer.readUint32();
          let entityTypeString = buffer.readVString();
          let attributeCount = buffer.readUint32();
          for(let j = 0; j < attributeCount; j++) {
              let name_1 = buffer.readVString();
              let type = buffer.readUint32();
              attributeMap.push({
                  name: name_1,
                  type: type
              });
          };
          this.attributeMaps[entityType] = attributeMap;
          this.entityTypeNames[entityType] = entityTypeString;
          this.sortedUidsByType[entityType] = [];
      };
      let rpcCount = buffer.readUint32();
      this.rpcMaps = [];
      this.rpcMapsByName = {};
      for(let i = 0; i < rpcCount; i++) {
          let rpcName = buffer.readVString();
          let paramCount = buffer.readUint8();
          let isArray = buffer.readUint8() != 0;
          let parameters = [];
          for(let j = 0; j < paramCount; j++) {
              let paramName = buffer.readVString();
              let paramType = buffer.readUint8();
              parameters.push({
                  name: paramName,
                  type: paramType
              });
          };
          let rpc = {
              name: rpcName,
              parameters: parameters,
              isArray: isArray,
              index: this.rpcMaps.length
          };
          this.rpcMaps.push(rpc);
          this.rpcMapsByName[rpcName] = rpc;
      };
      return ret;
  };
  decodeEntityUpdate(buffer) {
      let tick = buffer.readUint32();
      let removedEntityCount = buffer.readVarint32();
      const entityUpdateData = {};
      entityUpdateData.tick = tick;
      entityUpdateData.entities = new Map();
      let rE = Object.keys(this.removedEntities);
      for(let i = 0; i < rE.length; i++) {
          delete this.removedEntities[rE[i]];
      };
      for(let i = 0; i < removedEntityCount; i++) {
          var uid = buffer.readUint32();
          this.removedEntities[uid] = 1;
      };
      let brandNewEntityTypeCount = buffer.readVarint32();
      for(let i = 0; i < brandNewEntityTypeCount; i++) {
          var brandNewEntityCountForThisType = buffer.readVarint32();
          var brandNewEntityType = buffer.readUint32();
          for(var j = 0; j < brandNewEntityCountForThisType; j++) {
              var brandNewEntityUid = buffer.readUint32();
              this.sortedUidsByType[brandNewEntityType].push(brandNewEntityUid);
          };
      };
      let SUBT = Object.keys(this.sortedUidsByType);
      for(let i = 0; i < SUBT.length; i++) {
          let table = this.sortedUidsByType[SUBT[i]];
          let newEntityTable = [];
          for(let j = 0; j < table.length; j++) {
              let uid = table[j];
              if(!(uid in this.removedEntities)) {
                  newEntityTable.push(uid);
              };
          };
          newEntityTable.sort((a, b) => a - b);
          this.sortedUidsByType[SUBT[i]] = newEntityTable;
      };
      while(buffer.remaining()) {
          let entityType = buffer.readUint32();
          if(!(entityType in this.attributeMaps)) {
              throw new Error('Entity type is not in attribute map: ' + entityType);
          };
          let absentEntitiesFlagsLength = Math.floor((this.sortedUidsByType[entityType].length + 7) / 8);
          this.absentEntitiesFlags.length = 0;
          for(let i = 0; i < absentEntitiesFlagsLength; i++) {
              this.absentEntitiesFlags.push(buffer.readUint8());
          };
          let attributeMap = this.attributeMaps[entityType];
          for(let tableIndex = 0; tableIndex < this.sortedUidsByType[entityType].length; tableIndex++) {
              let uid = this.sortedUidsByType[entityType][tableIndex];
              if((this.absentEntitiesFlags[Math.floor(tableIndex / 8)] & (1 << (tableIndex % 8))) !== 0) {
                  entityUpdateData.entities.set(uid, true);
                  continue;
              };
              var player = {
                  uid: uid
              };
              this.updatedEntityFlags.length = 0;
              for(let j = 0; j < Math.ceil(attributeMap.length / 8); j++) {
                  this.updatedEntityFlags.push(buffer.readUint8());
              };
              for(let j = 0; j < attributeMap.length; j++) {
                  let attribute = attributeMap[j];
                  let flagIndex = Math.floor(j / 8);
                  let bitIndex = j % 8;
                  let count = void 0;
                  let v = [];
                  if(this.updatedEntityFlags[flagIndex] & (1 << bitIndex)) {
                      switch(attribute.type) {
                          case e_AttributeType.Uint32:
                              player[attribute.name] = buffer.readUint32();
                              break;
                          case e_AttributeType.Int32:
                              player[attribute.name] = buffer.readInt32();
                              break;
                          case e_AttributeType.Float:
                              player[attribute.name] = buffer.readInt32() / 100;
                              break;
                          case e_AttributeType.String:
                              player[attribute.name] = this.safeReadVString(buffer);
                              break;
                          case e_AttributeType.Vector2:
                              var x = buffer.readInt32() / 100;
                              var y = buffer.readInt32() / 100;
                              player[attribute.name] = {
                                  x: x,
                                  y: y
                              };
                              break;
                          case e_AttributeType.ArrayVector2:
                              count = buffer.readInt32();
                              v = [];
                              for(let i = 0; i < count; i++) {
                                  let x_1 = buffer.readInt32() / 100;
                                  let y_1 = buffer.readInt32() / 100;
                                  v.push({
                                      x: x_1,
                                      y: y_1
                                  });
                              };
                              player[attribute.name] = v;
                              break;
                          case e_AttributeType.ArrayUint32:
                              count = buffer.readInt32();
                              v = [];
                              for(let i = 0; i < count; i++) {
                                  let element = buffer.readInt32();
                                  v.push(element);
                              };
                              player[attribute.name] = v;
                              break;
                          case e_AttributeType.Uint16:
                              player[attribute.name] = buffer.readUint16();
                              break;
                          case e_AttributeType.Uint8:
                              player[attribute.name] = buffer.readUint8();
                              break;
                          case e_AttributeType.Int16:
                              player[attribute.name] = buffer.readInt16();
                              break;
                          case e_AttributeType.Int8:
                              player[attribute.name] = buffer.readInt8();
                              break;
                          case e_AttributeType.Uint64:
                              player[attribute.name] = buffer.readUint32() + buffer.readUint32() * 4294967296;
                              break;
                          case e_AttributeType.Int64:
                              var s64 = buffer.readUint32();
                              var s642 = buffer.readInt32();
                              if(s642 < 0) {
                                  s64 *= -1;
                              };
                              s64 += s642 * 4294967296;
                              player[attribute.name] = s64;
                              break;
                          case e_AttributeType.Double:
                              var s64d = buffer.readUint32();
                              var s64d2 = buffer.readInt32();
                              if(s64d2 < 0) {
                                  s64d *= -1;
                              };
                              s64d += s64d2 * 4294967296;
                              s64d = s64d / 100;
                              player[attribute.name] = s64d;
                              break;
                          default:
                              throw new Error('Unsupported attribute type: ' + attribute.type);
                      };
                  };
              };
              entityUpdateData.entities.set(player.uid, player);
          };
      };
      entityUpdateData.byteSize = buffer.capacity();
      return entityUpdateData;
  };
  decodePing() {
      return {};
  };
  encodeRpc(buffer, item) {
      if(!(item.name in this.rpcMapsByName)) {
          throw new Error('RPC not in map: ' + item.name);
      };
      var rpc = this.rpcMapsByName[item.name];
      buffer.writeUint32(rpc.index);
      for(var i = 0; i < rpc.parameters.length; i++) {
          var param = item[rpc.parameters[i].name];
          switch(rpc.parameters[i].type) {
              case e_ParameterType.Float:
                  buffer.writeInt32(Math.floor(param * 100.0));
                  break;
              case e_ParameterType.Int32:
                  buffer.writeInt32(param);
                  break;
              case e_ParameterType.String:
                  buffer.writeVString(param);
                  break;
              case e_ParameterType.Uint32:
                  buffer.writeUint32(param);
                  break;
          };
      };
  };
  decodeBlend(buffer, Module) {
      var extraBuffers = this.decodeBlendInternal(buffer, Module);
      return {
          extra: extraBuffers
      };
  };
  decodeBlendInternal(buffer, Module) {
      Module._MakeBlendField(24, 132);
      for(let firstSync = Module._MakeBlendField(228, buffer.remaining()), i = 0; buffer.remaining();)
          Module.HEAPU8[firstSync + i] = buffer.readUint8(), i++;
      Module._MakeBlendField(172, 36);
      var extraBuffers = new ArrayBuffer(64);
      var exposedBuffers = new Uint8Array(extraBuffers);
      for(var secondSync = Module._MakeBlendField(4, 152), i = 0; i < 64; i++) {
          exposedBuffers[i] = Module.HEAPU8[secondSync + i];
      };
      return extraBuffers;
  };
  decodeRpcObject(buffer, parameters) {
      var result = {};
      for(var i = 0; i < parameters.length; i++) {
          switch(parameters[i].type) {
              case e_ParameterType.Uint32:
                  result[parameters[i].name] = buffer.readUint32();
                  break;
              case e_ParameterType.Int32:
                  result[parameters[i].name] = buffer.readInt32();
                  break;
              case e_ParameterType.Float:
                  result[parameters[i].name] = buffer.readInt32() / 100.0;
                  break;
              case e_ParameterType.String:
                  result[parameters[i].name] = this.safeReadVString(buffer);
                  break;
              case e_ParameterType.Uint64:
                  result[parameters[i].name] = buffer.readUint32() + buffer.readUint32() * 4294967296;
                  break;
          };
      };
      return result;
  };
  decodeRpc(buffer) {
      var rpcIndex = buffer.readUint32();
      var rpc = this.rpcMaps[rpcIndex];
      var result = {
          name: rpc.name,
          response: null
      };
      if(!rpc.isArray) {
          result.response = this.decodeRpcObject(buffer, rpc.parameters);
      } else {
          var response = [];
          var count = buffer.readUint16();
          for(var i = 0; i < count; i++) {
              response.push(this.decodeRpcObject(buffer, rpc.parameters));
          };
          result.response = response;
      };
      return result;
  };
  encodeBlend(buffer, item) {
      for(var e = new Uint8Array(item.extra), i = 0; i < item.extra.byteLength; i++)
          buffer.writeUint8(e[i]);
  };
  encodeEnterWorld(buffer, item) {
      buffer.writeVString(item.displayName);
      for(var e = new Uint8Array(item.extra), i = 0; i < item.extra.byteLength; i++)
          buffer.writeUint8(e[i]);
  };
  encodeEnterWorld2(buffer, Module) {
      var managementcommandsdns = Module._MakeBlendField(187, 22);
      for(var siteName = 0; siteName < 16; siteName++) {
          buffer.writeUint8(Module.HEAPU8[managementcommandsdns + siteName]);
      };
  };
  encodeInput(buffer, item) {
      buffer.writeVString(JSON.stringify(item));
  };
  encodePing(buffer) {
      buffer.writeUint8(0);
  };
};

let codec = new BinCodec();

let wasmBuffers;
fetch("https://cdn.glitch.global/14f404fe-81a3-418b-bc7c-78513660ae26/zombs_wasm%20(7).wasm?v=1710679251082").then(e => e.arrayBuffer().then(r => {
    wasmBuffers = r;
}));

let wasmModule = (callback, data_12, hostname) => {
  function _0x364d84$jscomp$0(item, value, i) {
      var check = value + i;
      var input = value;
      for(; item[input] && !(input >= check);) {
          ++input;
      };
      if(input - value > 16 && item.subarray && _0x30c1b5$jscomp$0) {
          return _0x30c1b5$jscomp$0.decode(item.subarray(value, input));
      };
      var segmentedId = "";
      for(; value < input;) {
          let i = item[value++];
          if(128 & i) {
              var b1 = 63 & item[value++];
              if(192 != (224 & i)) {
                  var _0x4e8ea1 = 63 & item[value++];
                  if(i = 224 == (240 & i) ? (15 & i) << 12 | b1 << 6 | _0x4e8ea1 : (7 & i) << 18 | b1 << 12 | _0x4e8ea1 << 6 | 63 & item[value++], i < 65536) {
                      segmentedId = segmentedId + String.fromCharCode(i);
                  } else {
                      var snI = i - 65536;
                      segmentedId = segmentedId + String.fromCharCode(55296 | snI >> 10, 56320 | 1023 & snI);
                  };
              } else {
                  segmentedId = segmentedId + String.fromCharCode((31 & i) << 6 | b1);
              };
          } else {
              segmentedId = segmentedId + String.fromCharCode(i);
          };
      };
      return segmentedId;
  };
  function _0x18d59e$jscomp$0(value, left) {
      return value ? _0x364d84$jscomp$0(_0x2c159b$jscomp$0, value, left) : "";
  };
  function _0x710b07$jscomp$0(text, value, key, code) {
      if(!(code > 0)) {
          return 0;
      };
      var KEY0 = key;
      var c = key + code - 1;
      var i = 0;
      for(; i < text.length; ++i) {
          var character = text.charCodeAt(i);
          if(character >= 55296 && character <= 57343) {
              var _0x216e31 = text.charCodeAt(++i);
              character = 65536 + ((1023 & character) << 10) | 1023 & _0x216e31;
          };
          if(character <= 127) {
              if(key >= c) {
                  break;
              };
              value[key++] = character;
          } else {
              if(character <= 2047) {
                  if(key + 1 >= c) {
                      break;
                  };
                  value[key++] = 192 | character >> 6;
                  value[key++] = 128 | 63 & character;
              } else {
                  if(character <= 65535) {
                      if(key + 2 >= c) {
                          break;
                      };
                      value[key++] = 224 | character >> 12;
                      value[key++] = 128 | character >> 6 & 63;
                      value[key++] = 128 | 63 & character;
                  } else {
                      if(key + 3 >= c) {
                          break;
                      };
                      value[key++] = 240 | character >> 18;
                      value[key++] = 128 | character >> 12 & 63;
                      value[key++] = 128 | character >> 6 & 63;
                      value[key++] = 128 | 63 & character;
                  };
              };
          };
      };
      return value[key] = 0,
          key - KEY0;
  };
  function _0x36268d$jscomp$0(message, initialValue, params) {
      return _0x710b07$jscomp$0(message, _0x2c159b$jscomp$0, initialValue, params);
  };
  function _0xaf9b5$jscomp$0(text) {
      var _0x41d111 = 0;
      var i = 0;
      for(; i < text.length; ++i) {
          var $sendIcon = text.charCodeAt(i);
          if($sendIcon >= 55296 && $sendIcon <= 57343) {
              $sendIcon = 65536 + ((1023 & $sendIcon) << 10) | 1023 & text.charCodeAt(++i);
          };
          if($sendIcon <= 127) {
              ++_0x41d111;
          } else {
              _0x41d111 = _0x41d111 + ($sendIcon <= 2047 ? 2 : $sendIcon <= 65535 ? 3 : 4);
          };
      };
      return _0x41d111;
  };
  function _0x45ab50$jscomp$0(untypedElevationArray) {
      _0x4f7d64$jscomp$0.HEAP8 = _0x43f8b2$jscomp$0 = new Int8Array(untypedElevationArray);
      _0x4f7d64$jscomp$0.HEAP16 = _0x4204f0$jscomp$0 = new Int16Array(untypedElevationArray);
      _0x4f7d64$jscomp$0.HEAP32 = _0x2917ec$jscomp$0 = new Int32Array(untypedElevationArray);
      _0x4f7d64$jscomp$0.HEAPU8 = _0x2c159b$jscomp$0 = new Uint8Array(untypedElevationArray);
      _0x4f7d64$jscomp$0.HEAPU16 = _0x37eff3$jscomp$0 = new Uint16Array(untypedElevationArray);
      _0x4f7d64$jscomp$0.HEAPU32 = _0x3322a0$jscomp$0 = new Uint32Array(untypedElevationArray);
      _0x4f7d64$jscomp$0.HEAPF32 = _0x28607a$jscomp$0 = new Float32Array(untypedElevationArray);
      _0x4f7d64$jscomp$0.HEAPF64 = _0x241d97$jscomp$0 = new Float64Array(untypedElevationArray);
  };
  function _0x55729a$jscomp$0() {
      function test(component) {
          _0x4f7d64$jscomp$0.asm = component.exports;
          _0x45ab50$jscomp$0(_0x4f7d64$jscomp$0.asm.g.buffer);
          _0x33e8b7$jscomp$0();
          _0x1e5f8d$jscomp$0();
      };
      function id(fn) {
          test(fn.instance);
      };
      function instantiate(id) {
          WebAssembly.instantiate(wasmBuffers, locals).then(fn => {
              id(fn);
              typeof callback == "function" && callback(_0x4f7d64$jscomp$0.decodeOpcode5(hostname, data_12));
          });
      };
      var locals = {
          "a": {
              "d": () => {},
              "e": () => {},
              "c": () => {},
              "f": () => {},
              "b": _0x2db992$jscomp$0,
              "a": _0x1cbea8$jscomp$0
          }
      };
      if(_0x4f7d64$jscomp$0.instantiateWasm) {
          try {
              return _0x4f7d64$jscomp$0.instantiateWasm(locals, test);
          } catch (_0xe87ddd) {
              return console.log("Module.instantiateWasm callback failed with error: " + _0xe87ddd), false;
          };
      };
      instantiate(id);
      return {};
  };
  function _0x2db992$jscomp$0(_0x264e37$jscomp$0) {
      let e = _0x18d59e$jscomp$0(_0x264e37$jscomp$0);
      if(e.includes('typeof window === "undefined" ? 1 : 0;')) {
          return 0;
      };
      if(e.includes("typeof process !== 'undefined' ? 1 : 0;")) {
          return 0;
      };
      if(e.includes('Game.currentGame.network.connected ? 1 : 0')) {
          return 1;
      };
      if(e.includes('Game.currentGame.world.myUid === null ? 0 : Game.currentGame.world.myUid;')) {
          return 0;
      };
      if(e.includes('document.getElementById("hud").children.length;')) {
          return 24;
      };
      if(e.includes("hostname")) {
          return hostname;
      };
      let data = eval(_0x18d59e$jscomp$0(_0x264e37$jscomp$0));
      return 0 | data;
  };
  function _0x1cbea8$jscomp$0(_0xdcd74c$jscomp$0) {
      var _0x49bfc6$jscomp$0 = hostname;
      if(null == _0x49bfc6$jscomp$0) return 0;
      _0x49bfc6$jscomp$0 = String(_0x49bfc6$jscomp$0);
      var _0x1bcee7$jscomp$0 = _0x1cbea8$jscomp$0;
      var _0x5383b2$jscomp$0 = _0xaf9b5$jscomp$0(_0x49bfc6$jscomp$0);
      return (!_0x1bcee7$jscomp$0.bufferSize ||
              _0x1bcee7$jscomp$0.bufferSize < _0x5383b2$jscomp$0 + 1) &&
          (_0x1bcee7$jscomp$0.bufferSize &&
              _0x620aa9$jscomp$0(_0x1bcee7$jscomp$0.buffer),
              _0x1bcee7$jscomp$0.bufferSize = _0x5383b2$jscomp$0 + 1,
              _0x1bcee7$jscomp$0.buffer = _0x141790$jscomp$0(_0x1bcee7$jscomp$0.bufferSize)),
          _0x36268d$jscomp$0(_0x49bfc6$jscomp$0, _0x1bcee7$jscomp$0.buffer, _0x1bcee7$jscomp$0.bufferSize),
          _0x1bcee7$jscomp$0.buffer;
  };
  function _0x1e5f8d$jscomp$0() {
      _0x2917ec$jscomp$0[1328256] = 5313008;
      _0x2917ec$jscomp$0[1328257] = 0;
      try {
          _0x4f7d64$jscomp$0._main(1, 5313024);
      } finally {};
  };
  var _0x4f7d64$jscomp$0 = {};
  var _0x30c1b5$jscomp$0 = new TextDecoder("utf8");
  var _0x2c159b$jscomp$0;
  var _0x2917ec$jscomp$0;
  _0x55729a$jscomp$0();
  var _0x33e8b7$jscomp$0 = _0x4f7d64$jscomp$0.___wasm_call_ctors = function() {
      return (_0x33e8b7$jscomp$0 = _0x4f7d64$jscomp$0.___wasm_call_ctors = _0x4f7d64$jscomp$0.asm.h).apply(null, arguments);
  };
  var _0x6f9ca9$jscomp$0 = _0x4f7d64$jscomp$0._main = function() {
      return (_0x6f9ca9$jscomp$0 = _0x4f7d64$jscomp$0._main = _0x4f7d64$jscomp$0.asm.i).apply(null, arguments);
  };
  var _0x1d0522$jscomp$0 = _0x4f7d64$jscomp$0._MakeBlendField = function() {
      return (_0x1d0522$jscomp$0 = _0x4f7d64$jscomp$0._MakeBlendField = _0x4f7d64$jscomp$0.asm.j).apply(null, arguments);
  };
  var _0x141790$jscomp$0 = _0x4f7d64$jscomp$0._malloc = function() {
      return (_0x141790$jscomp$0 = _0x4f7d64$jscomp$0._malloc = _0x4f7d64$jscomp$0.asm.l).apply(null, arguments);
  };
  var _0x620aa9$jscomp$0 = _0x4f7d64$jscomp$0._free = function() {
      return (_0x620aa9$jscomp$0 = _0x4f7d64$jscomp$0._free = _0x4f7d64$jscomp$0.asm.m).apply(null, arguments);
  };
  _0x4f7d64$jscomp$0.decodeOpcode5 = function(hostname, extra) {
      _0x4f7d64$jscomp$0.hostname = hostname;
      let DecodedOpcode5 = codec.decode(new Uint8Array(extra), _0x4f7d64$jscomp$0);
      let EncodedEnterWorld2 = codec.encode(6, {}, _0x4f7d64$jscomp$0);
      return {
          5: DecodedOpcode5,
          6: EncodedEnterWorld2,
          10: _0x4f7d64$jscomp$0
      };
  };
  return _0x4f7d64$jscomp$0;
};