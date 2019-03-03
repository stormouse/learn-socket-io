const dbconfig = require('../config.json').database;
const mongo = require('mongodb').MongoClient;

let url = "mongodb://" + dbconfig.user + ":" + dbconfig.password + 
    '@' + dbconfig.host + ":" + dbconfig.port + "/chatroom?authSource=admin";
console.log(url);
let option = { useNewUrlParser: true };
mongo.connect(url, option, function(err, client){
    if(err) throw err;
    const db = client.db('chatroom');
    db.createCollection("users", function(err, res){
        client.close();
        if(err) console.log(err);
        else console.log("created collection: chatroom.users");
    })
});
