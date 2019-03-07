import * as crypto from 'crypto';
import { dbconn } from '../shared/dbconn';

const database = 'chatroom';
const salt_suffix = '-development';

class Result {
	success = false;
	message = '';

	constructor(success: boolean, message: string = '') {
		this.success = success;
		this.message = message;
	}
}

let hashSecret = (secret: string) => {
	const hash = crypto.createHash('sha256');
	hash.update(secret + salt_suffix);
	return hash.digest();
};

class UserOperations {

	static async addUserCredential(username: string ,password: string): Promise<Result> {
		try {
			let db = await dbconn(database);
			let document = await db.collection('users').findOne({ username: username });
			if (document !== null) {
				await db.collection('users').insertOne({ username: username, password: hashSecret(password) });
				console.log("created a new user with credential: " + username);
				return new Result(true);
			}
			return new Result(false, 'something wrong happened.');
		} catch(e) {
			throw e;
		}
	}

	static async checkUserCredential(username: string, password: string): Promise<Result> {
		try {
			let db = await dbconn(database);
			let document = await db.collection('users').findOne({ username: username });
			if (document === null) {
				return new Result(false, 'no users with username');
			} else if (document.password !== hashSecret(password)) {
				return new Result(false, 'incorrect password');
			} else {
				return new Result(true);
			}
		} catch(e) {
			throw e;
		}
	}

	static async checkUserPublic(username: string): Promise<Result> {
		try {
			let db = await dbconn(database);
			let document = await db.collection('users').findOne({ username: username });
			if (document === null) {
				return new Result(true);
			} else {
				return new Result(false, 'this user name is not publicly available, try log in with passcode');
			}
		} catch(e) {
			throw e;
		}
	}
}

export { UserOperations };