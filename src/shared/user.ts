import socketIO from 'socket.io';

export default class User {
	nickname: string;
	socket: socketIO.Socket;
	constructor(socket: socketIO.Socket) {
		this.socket = socket;
		this.nickname = String(socket.request.connection.remoteAddress);
	}
	setNickname(nickname: string): void {
		this.nickname = nickname;
	}
}