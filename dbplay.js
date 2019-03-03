const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const SHA = require('./shared/sha256.js');

console.log(SHA.hash("hello, world"));

// const url = 'mongodb://developer:password@localhost/chatroom?authSource=admin';

// MongoClient.connect(url, {useNewUrlParser: true}, function(err, client){
//     if(err) throw err;
    
//     const db = client.db('chatroom');

//     db.collection('playground').findOne({ tags: /player122$/ }, (err, result) => {
//         if(err) throw err;
//         console.log(result);
//     });
    
//     client.close();
// });


