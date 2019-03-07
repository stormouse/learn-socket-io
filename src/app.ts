import express from 'express';
import http from 'http';
import socketIO from 'socket.io';
import fs from 'fs';

import User from './shared/user';

import { defaultParser } from './parsers';

class ChatServer {
	static readonly DEFAULT_PORT: number = 8080;
	static readonly MESSAGE_CACHE_LINES: number = 40;
	static readonly SINGLE_FILE_MESSAGE_LIMIT: number = 100;

	private readonly app: express.Application;
	private readonly server: http.Server;
	private readonly io: socketIO.Server;
	private readonly port: number;

	private readonly connectedUsers: {[index: string]: User} = {};
	private messageCache: string[] = [];
	private messageToDump: string[] = [];
	private latestMessageHistory: string = '';


	private parsers: [any];

	constructor() {
		// create express app
		this.app = express();
		this.app.get('/', (req: express.Request, res: express.Response) => {
			res.sendFile(__dirname + '/index.html');
		});

		// configuration
		this.port = Number(process.env.PORT) || ChatServer.DEFAULT_PORT;

		// create http server
		this.server = http.createServer(this.app);

		// bind socketIO with the express app
		this.io = socketIO(this.server);

		// load parsers
		this.parsers = [defaultParser];
	}

	private dumpMessage: () => void = () => {
		this.latestMessageHistory = "history/message_"+new Date().getTime()+".txt";
		fs.writeFile(this.latestMessageHistory, JSON.stringify(this.messageToDump), (err) => {
			if(err) console.log(err);
			else console.log('file saved');
			this.messageToDump = [];
		});
	};

	// use instance function to avoid the 'this' problem
	listen: () => void = () => {
		this.server.listen(this.port, () => {
			console.log('Running server on port ' + this.port);
		});

		this.io.on('connection', (socket: socketIO.Socket) => {
			let socket_id = JSON.stringify(socket.request.connection._peername);

			if (!this.connectedUsers.hasOwnProperty(socket_id)) {
				try {
					this.connectedUsers[socket_id] = new User(socket);
					console.log('new connection from ' + socket.request.connection.remoteAddress);
					this.io.emit('message', "Welcome friend from " + socket.request.connection.remoteAddress);
					socket.emit('sync_history', this.messageCache);
				} catch(e) {
					console.log("error when establishing new connection.");
				}
			}

			socket.on('disconnect',  () => {
				console.log('user disconnected');
				delete this.connectedUsers[socket_id];
				this.io.emit('message', 'someone left us ):<');
			});

			socket.on('message', async (msg: string) => {
				try {
					let isCommand = false;
					let parsers = this.parsers;
					let user = this.connectedUsers[socket_id];
					for (let i in parsers) {
						let result = await parsers[i].parse(msg, user);
						if (result === true) {
							isCommand = true;
							break;
						}
					}
					if (!isCommand) {
						let user = this.connectedUsers[socket_id];
						this.io.emit('message', user.nickname + ": " + msg);
						this.messageCache.push(user.nickname + ": " + msg);
						if(this.messageCache.length >= ChatServer.MESSAGE_CACHE_LINES) {
							this.messageCache.shift();
						}
						this.messageToDump.push(user.nickname + ": " + msg);
						if(this.messageToDump.length > ChatServer.SINGLE_FILE_MESSAGE_LIMIT) {
							this.dumpMessage();
						}
					}
				} catch (e) {
					console.log(e);
				}
			});
		});
	}
}

const chatServer = new ChatServer();
chatServer.listen();