const dbconfig = require('../config.json').database;
const mongo = require('mongodb').MongoClient;

let url = "mongodb://" + dbconfig.user + ":" + dbconfig.password + 
    '@' + dbconfig.host + ":" + dbconfig.port + "/reigns?authSource=admin";
console.log(url);
let option = { useNewUrlParser: true };


mongo.connect(url, option, function(err, client){
    if(err) throw err;
    const db = client.db('reigns');
    db.createCollection("stories", function(err, res){
        client.close();
        if(err) console.log(err);
        else console.log("created collection: reigns");
    });
});


mongo.connect(url, option, function(err, client){
    if(err) throw err;
    const db = client.db('reigns');
    db.collection('stories').insertMany(
        [
            {name:"famine", desc: "粮食减产，人民暴动，是否派军队镇压？", _A:{name:"yes", _result: { army: 2, people: -3 }}, _B:{name:"no", _result: {people: -1, economy: -1}}},
            {name:"prayer", desc: "教皇希望国王可以带领民众一起祷告，是否进行", _A:{name:"yes", _result: { religion: 5, people: 1 }}, _B:{name:"no", _result: { religion: -3 }}},
        ], 
        function(err, res){
            client.close();
            if(err) console.log(err);
            else console.log("created reigns stories in reigns.stories");
        }
    );
});


