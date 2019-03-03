const dbconfig = require('../config.json').database;
const mongo = require('mongodb').MongoClient;

module.exports = function(database) {
    return function(operate) {
        let url = "mongodb://" + dbconfig.user + ":" + dbconfig.password + 
            '@' + dbconfig.host + ":" + dbconfig.port + "/" + database + "?authSource=admin";
        let option = { useNewUrlParser: true };
        mongo.connect(url, option, function(err, client){
            if(err) throw err;
            const db = client.db(database);
            operate(db, client);
        });
    }
}
