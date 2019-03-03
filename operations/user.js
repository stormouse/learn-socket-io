const dbops = require('../shared/dbconn.js')('chatroom');
const crypto = require('crypto');

const hash = crypto.createHash('sha256');
salt_suffix = "-development";

function hashSecret(secret) {
    hash.update(secret + salt_suffix);
    return hash.digest('hex');
}

module.exports = {

    addUserCredential: function(username, password) { return new Promise(
        function(resolve, reject) {
            dbops(function(db, client) {
                db.collection('users').findOne({username: username}, function(err, result) {
                    if(err) reject(err);
                    if(result == null) {
                        db.collection('users').insertOne({ username: username, password: hashSecret(password) }, function(err, result) {
                            client.close();
                            if(err) reject(err);
                            console.log("created a new user with credential: " + username);
                            resolve();
                        });
                    }
                });
            })
        }
    )},

    checkUserCredential: function(username, password) { return new Promise(
        function(resolve, reject) {
            dbops(function(db, client) {
                db.collection('users').findOne({username: username}, function(err, result) {
                    client.close();
                    if(err) reject(err);
                    if(result === null) {
                        reject("no users with username " + username);
                    } else if(result.password != hashSecret(password)) {
                        reject("incorrect password for user " + username);
                    } else {
                        resolve();
                    }
                })
            });
        }
    )},

    checkUserPublic: function (username) { return new Promise(
        function(resolve, reject) {
            dbops(function(db, client) {
                db.collection('users').findOne({username: username}, function(err, result) {
                    client.close();
                    if(err) reject(err);
                    if(result === null) resolve();
                    else reject("this user name is not publicly available, try log in with passcode.");
                });
            });
        }
    )}

}