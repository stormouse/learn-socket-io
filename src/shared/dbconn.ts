import { MongoClient } from 'mongodb';
import { database as dbconfig } from '../config.json';

export async function dbconn(database: string) {
	const url = 'mongodb://' + dbconfig.user + ':' + dbconfig.password + '@' + dbconfig.host + ':' + dbconfig.port + '/'
	+ database + '?authSource=admin';
	const option = { useNewUrlParser: true };
	console.log('url: ', url);
	try {
		let client = await MongoClient.connect(url, option);
		return await client.db(database);
	} catch(e) {
		throw e;
	}
}

