const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');
// const dbops = require('./shared/dbconn.js')('chatroom');

const reignsCommandParser = require('./games/reigns/parser.js');
const ReignsGame = require('./games/reigns/game.js');

const operations = {
    user: require('./operations/user.js'),
}

const globalContext = {
    parsers: {},
    connectedUsers: {},
    messageCacheLines: 40,
    singleFileMessageLimit: 100,
}

var messageCache = [];
var messageToDump = [];
var latestMessageHistory = null;
function dumpMessage() {
    latestMessageHistory = "history/message_"+new Date().getTime()+".txt";
    fs.writeFile(latestMessageHistory, JSON.stringify(messageToDump), function(err) {
        if(err) console.log(err);
        else console.log('file saved');
        messageToDump = [];
    });
}


const defaultParser = {
    use_nickname_command_re: /^#nickname:\s*(\w+)\s+([A-Za-z0-9\w]+)$/,
    change_nickname_command_re: /^#nickname:\s*(\w+)$/,
    create_passcode_command_re: /^#set-pw:\s*([A-Za-z0-9\w]+)$/,
    valid_nickname_re: /^\w+$/,
    parse: function (message, user) {
        try{
            if((captured = this.use_nickname_command_re.exec(message)) != null) {
                try {
                    let nickname = captured[1], password = captured[2];
                    operations.user.checkUserCredential(nickname, password)
                    .then(function() {
                        user.setNickname(nickname);
                        user.socket.emit("system_notification", "You have changed your nickname to " + nickname);
                    })
                    .catch(function(err){
                        user.socket.emit("system_notification", "Failed to change nickname: " + err);
                    });
                } catch(e) {
                    console.log("error while parsing user command: " + e);
                }
                return true;
            }
            if((captured = this.change_nickname_command_re.exec(message)) != null) {
                try {
                    let nickname = captured[1];
                    operations.user.checkUserPublic(nickname)
                    .then(function(){
                        user.setNickname(nickname);
                        user.socket.emit("system_notification", "You have changed your nickname to " + nickname);
                    })
                    .catch(function(err){
                        user.socket.emit("system_notification", "Failed to change nickname: " + err);
                    });
                } catch(e) {
                    console.log("error while parsing user command: " + e);
                }
                return true;
            }
            if((captured = this.create_passcode_command_re.exec(message)) != null) {
                try {
                    let nickname = captured[1];
                    if(this.valid_nickname_re.exec(user.nickname) == null) {
                        user.socket.emit("system_notification", "You must have a valid nickname before creating credential for it.")
                    } else {       
                        operations.user.addUserCredential(user.nickname, nickname)
                        .then( function(){
                            user.socket.emit("system_notification", "Credential updated!"); 
                        })
                        .catch(function(err) {
                            user.socket.emit("system_notification", "Credential update failed: " + err); 
                        });
                    }
                } catch(e) {
                    console.log("error while parsing user command: " + e);
                }
                return true;
            }

            if(message == '#start-game: reigns') {
                if(!globalContext.parsers.hasOwnProperty('reigns')) {
                    globalContext.parsers['reigns'] = reignsCommandParser;
                    let gameCallbacks = {
                        step: function(action, state) {
                            let m = "[REIGNS] ";
                            if(action != null) m += "You said '" + action + "'. ";
                            m += "Now: " + JSON.stringify(state);
                            io.emit('game_message', m); 
                            messageCache.push(m);
                            if(messageCache.length >= globalContext.messageCacheLines) {
                                messageCache.shift();
                            }
                            if(state.status == 'game_over') {
                                reignsCommandParser.gameInstance.dispose();
                                reignsCommandParser.gameInstance = null;
                            }
                        },
                        vote: function(result) { io.emit('game_message', '[REIGNS] ' + JSON.stringify(result)); },
                    }
                    reignsCommandParser.gameInstance = new ReignsGame(
                        gameCallbacks,
                        globalContext.connectedUsers.length, 
                        20
                    );
                    reignsCommandParser.gameInstance.start();
                } else {
                    user.socket.emit("system_notification", "There's one Reigns instance running already.");
                }
                return true;
            }

            if(message == '#end_game: reigns') {
                if(user.nickname != 'debug') return false;
                if(globalContext.parsers.hasOwnProperty('reigns')) {
                    delete globalContext.parsers[''];
                }
                if(reignsCommandParser.gameInstance != null) {
                    reignsCommandParser.gameInstance.destroy();
                    reignsCommandParser.gameInstance = null;
                }
            }
        } catch(e) {}

        return false;
    },
}

globalContext.parsers['default'] = defaultParser;

class User {
    constructor(socket) {
        this.socket = socket;
        this.nickname = String(socket.request.connection.remoteAddress);
    }
    setNickname(nickname) {
        this.nickname = nickname;
    }
}


app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {

    let socket_id = JSON.stringify(socket.request.connection._peername);

    if (!globalContext.connectedUsers.hasOwnProperty(socket_id)) {
        try {
            globalContext.connectedUsers[socket_id] = new User(socket);
            console.log('new connection from ' + socket.request.connection.remoteAddress);
            io.emit('message', "Welcome friend from " + socket.request.connection.remoteAddress);
            socket.emit('sync_history', messageCache);
        } catch(e) {
            console.log("error when establishing new connection.");
        }
    }

    socket.on('disconnect', function () {
        console.log('user disconnected');
        delete globalContext.connectedUsers[socket_id];
        io.emit('message', 'someone left us ):<');
    });

    socket.on('message', function (msg) {
        try {
            let isCommand = false;
            let parsers = globalContext.parsers;
            var user = globalContext.connectedUsers[socket_id];
            for (let i in parsers) {
                if (parsers[i].parse(msg, user)) {
                    isCommand = true;
                    break;
                }
            }
            if (!isCommand) {
                let user = globalContext.connectedUsers[socket_id];
                io.emit('message', user.nickname + ": " + msg);
                messageCache.push(user.nickname + ": " + msg);
                if(messageCache.length >= globalContext.messageCacheLines) {
                    messageCache.shift();
                }
                messageToDump.push(user.nickname + ": " + msg);
                if(messageToDump.length > globalContext.singleFileMessageLimit) {
                    dumpMessage();
                }
            }
        } catch (e) {
            console.log(e);
        }

    });

});

http.listen(8080, function () {
    console.log('listening on *:8080');
});
