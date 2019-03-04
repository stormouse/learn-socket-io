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
            {
                name:"饥荒", 
                desc: "粮食减产，人民暴动，是否派军队镇压？", 
                _A:{name:"yes", _result: { army: 2, people: -3 }}, 
                _B:{name:"no",  _result: { people: -1, economy: -1}}
            },
            {
                name:"公众祷告", 
                desc: "教皇希望国王可以带领民众一起祷告，是否进行", 
                _A:{ name:"yes", _result: { religion: 5, people: 1 }}, 
                _B:{ name:"no", _result: { religion: -3 }}
            },
            {
                name: "宗教丑闻",
                desc: "教皇的儿子被发现与民女通奸，应该如何处理？包庇（protect），将其正法（execute）",
                _A: {
                    name: "protect",
                    _result: {
                        people: -3,
                        religion: 3
                    }
                },
                _B: {
                    name: "execute",
                    _result: {
                        people: 2,
                        religion: -5
                    }
                }
            },
            {
                name: "水灾",
                desc: "陛下，今年的水势很可能要造成洪灾，您的打算是？修建堤坝(consolidate)，转移居民(evacuate)",
                _A: {
                    name: "consolidate",
                    _result: {
                        people: -1,
                        economy: -3,
                    }
                },
                _B: {
                    name: "evacuate",
                    _result: {
                        people: -2,
                        army: -1,
                        economy: -1
                    }
                }
            },
            {
                name: "丰收",
                desc: "陛下，今年是丰收年，您要不要考虑加税？加税（agree），该怎样就怎样吧（ignore）",
                _A: {
                    name: "agree",
                    _result: {
                        people: -1,
                        economy: 3,
                    }
                },
                _B: {
                    name: "ignore",
                    _result: {
                        people: 2,
                    }
                }
            },
            {
                name: "邻国威胁",
                desc: "陛下，邻国的威胁日渐强大，我们的军队缺乏精良武器，急需大炼钢铁！同意(yes)，拒绝(no)",
                _A: {
                    name: "yes",
                    _result: {
                        army: 4,
                        economy: -2
                    }
                },
                _B: {
                    name: "no",
                    _result: {
                        army: -2,
                        people: -2,
                    }
                }
            },
            {
                name: "通商",
                desc: "最近和邻国日渐交益，使者来访请求交易？同意(yes)，拒绝(no)",
                _A: {
                    name: "yes",
                    _result: {
                        economy: 2,
                        army: -1,
                    }
                },
                _B: {
                    name: "no",
                    _result: {
                        religion: 1,
                        army: 1
                    }
                }
            },
            {
                name: "异族入侵",
                desc: "陛下，异族人从南境攻过来了，已经打到了南边的属国，请快救援！率军救援(assist)，放弃属国(ignore)",
                _A: {
                    name: "assist",
                    _result: {
                        people: -1,
                        army: -3
                    }
                },
                _B: {
                    name: "ignore",
                    _result: {
                        people: -1,
                        army: -1,
                        economy: -2
                    }
                }
            },
            {
                name: "宗教统治",
                desc: "陛下，西边小国同意归顺，教皇希望您让他去宣布统治。让教皇去(accept)，和将军亲自去(reject)",
                _A: {
                    name: "accept",
                    _result: {
                        people: 1,
                        army: -3,
                        religion: 3
                    }
                },
                _B: {
                    name: "reject",
                    _result: {
                        people: 2,
                        army: 2,
                        religion: -2
                    }
                }
            },

        ], 
        function(err, res){
            client.close();
            if(err) console.log(err);
            else console.log("created reigns stories in reigns.stories");
        }
    );
});


