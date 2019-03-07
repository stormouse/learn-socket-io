import User from '../shared/user';
import {UserOperations} from '../operations/user';

let defaultParserRegex = {
	use_nickname_command_re: /^#nickname:\s*(\w+)\s+([A-Za-z0-9\w]+)$/,
	change_nickname_command_re: /^#nickname:\s*(\w+)$/,
	create_passcode_command_re: /^#set_pw:\s*([A-Za-z0-9\w]+)$/,
	valid_nickname_re: /^\w+$/
};

async function parse(message: string, user: User): Promise<boolean> {
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
				console.log('nickname', nickname);
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
		throw e;
	}
}


export let defaultParser = { parse };