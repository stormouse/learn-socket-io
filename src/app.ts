import express from 'express';
import * as http from 'http';
import socket from 'socket.io';
import * as fs from 'fs';
import { UserOperations } from './operations/user';

const app = express();
const server = new http.Server(app);
const io = socket(server);

class User {
	nickname: string;
	socket: any;
	constructor(socket: any) {
		this.socket = socket;
		this.nickname = String(socket.request.connection.remoteAddress);
	}
	setNickname(nickname: string) {
		this.nickname = nickname;
	}
}

let defaultParserRegex = {
	use_nickname_command_re: /^#nickname:\s*(\w+)\s+([A-Za-z0-9\w]+)$/,
	change_nickname_command_re: /^#nickname:\s*(\w+)$/,
	create_passcode_command_re: /^#set_pw:\s*([A-Za-z0-9\w]+)$/,
	valid_nickname_re: /^\w+$/
};

let defaultParser = {

	parse: async (message: string, user: User) => {
		try {
			{
				let captured = defaultParserRegex.use_nickname_command_re.exec(message);
				if (captured !== null) {
					let nickname = captured[1], password = captured[2];
					let result = await UserOperations.addUserCredential(nickname, password);
					if (result.success === true) {
						user.setNickname(nickname);
						user.socket.emit('system_notification', 'You have changed your nickname to ' + nickname);
					} else {
						user.socket.emit('system_notification', 'Failed to change nickname: ' + result.message);
					}
					return true;
				}
			}

			{
				let captured = defaultParserRegex.change_nickname_command_re.exec(message);
				if (captured !== null) {
					let nickname = captured[1];
					let result = await UserOperations.checkUserPublic(nickname);
					if (result.success === true) {
						user.setNickname(result.message);
						user.socket.emit('system_notification', 'You have changed your nickname to ' + nickname);
					} else {
						user.socket.emit('system_notification', 'Failed to change nickname: ' + result.message);
					}
					return true;
				}
			}

			{
				let captured = defaultParserRegex.create_passcode_command_re.exec(message);
				if (captured !== null) {
					let password = captured[1];
					if (defaultParserRegex.valid_nickname_re.exec(user.nickname) === null) {
						user.socket.emit('system_notification', 'you must have a valid nickname before creating credentials for it');
					} else {
						let result = await UserOperations.addUserCredential(user.nickname, password);
						if (result.success === true) {
							user.socket.emit('system_notification', 'Credential updated!');
						} else {
							user.socket.emit('system_notification', 'Credential update failed: ' + result.message);
						}
						return true;
					}
				}
			}

			return false;
		} catch(e) {
			console.log('error while parsing user command: ' + e);
		}
	}
};

const globalContext = {
	parsers: [defaultParser],
	connectedUsers: <any>{},
	messageCacheLines: 40,
	singleFileMessageLimit: 100,
};

let messageCache: string[] = [];
let messageToDump: string[] = [];
let latestMessageHistory = null;

function dumpMessage() {
	latestMessageHistory = "history/message_"+new Date().getTime()+".txt";
	fs.writeFile(latestMessageHistory, JSON.stringify(messageToDump), function(err) {
		if(err) console.log(err);
		else console.log('file saved');
		messageToDump = [];
	});
}

app.get('/', function (req: any, res: any) {
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket: any) => {
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

	socket.on('message', async function (msg: string) {
		try {
			let isCommand = false;
			let parsers = globalContext.parsers;
			let user = globalContext.connectedUsers[socket_id];
			for (let i in parsers) {
				let result = await parsers[i].parse(msg, user);
				if (result === true) {
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

server.listen(8080, () => {
	console.log('listening on *:8080');
});