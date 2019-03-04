const dbops = require('../../shared/dbconn.js')('reigns');

var _reign_game_instance = null;

module.exports = class Game {
    constructor(callbacks, maxVoteCount, timeForRoundAfterFirstVote = 20) {
        this.reignState = {
            army: 10,
            economy: 10,
            people: 10,
            religion: 10,
        };

        _reign_game_instance = this;

        this.round = 0;
        this.briefHistory = [];
        this.allStories = []; 
        this.currentStory = null;
        this.step_callback = callbacks.step;
        this.vote_callback = callbacks.vote;
        this.gameOverReason = "";

        // player vote (not sure how to separate this out of game)
        this.votes = {};
        this.maxVoteCount = maxVoteCount;
        this.timeForRoundAfterFirstVote = timeForRoundAfterFirstVote;
        this.hangingVote = null;
    }

    start() {
        console.log("start called");
        this.waitingForAction = false;
        this.briefHistory = [];
        Promise.all([
            new Promise(this._prLoadStories),
        ])
        .then(function(result) {
            _reign_game_instance.step_callback(null, _reign_game_instance._step());
        })
        .catch((err) => {
            console.log("Error starting Reigns: " + err);
        });
    }

    vote(playerName, action) {
        let result = {status:'', message:''};
        if(action == "none") {
            result.status = 'error';
            result.message = 'require an action to continue';
            this.vote_callback(result);
        }
        if(action != this.currentStory._A.name && action != this.currentStory._B.name) {
            result.status = 'error';
            result.message = "invalid action, only accept '" + this.currentStory._A.name + "' or '" + this.currentStory._B.name + "'.";
            this.vote_callback(result);
        }

        this.votes[playerName] = action;
        if(Object.keys(this.votes).length == 1) {
            this.hangingVote = setTimeout(this.step, this.timeForRoundAfterFirstVote * 1000);
        }
        if(Object.keys(this.votes).length == this.maxVoteCount) {
            this.step();
            result.status = 'accepted';
            result.message = '[FINAL] ' + this.currentStory._A.name + ": " + _reign_game_instance._acount() + ",  " + this.currentStory._B.name + ": " + this._bcount();
            this.vote_callback(result);
        } else {
            result.status = 'accepted';
            result.message = this.currentStory._A.name + ": " + _reign_game_instance._acount() + ",  " + this.currentStory._B.name + ": " + this._bcount();
            this.vote_callback(result);
        }
    }

    _acount() {
        var c = 0;
        for(let i in this.votes) {
            if(this.votes[i] == this.currentStory._A.name) c++;
        }
        return c;
    }

    _bcount() {
        var c = 0;
        for(let i in this.votes) {
            if(this.votes[i] == this.currentStory._B.name) c++;
        }
        return c;
    }

    step() {
        var self = _reign_game_instance;

        if(self.hangingVote != null) {
            clearTimeout(self.hangingVote);
            self.hangingVote = null;
        }
        let a = self._acount();
        let b = self._bcount();
        let action;
        if(a == b) { action = Math.random() < 0.5 ? self.currentStory._A.name : self.currentStory._B.name; }
        else { action = a > b ? self.currentStory._A.name : self.currentStory._B.name; }
        self.step_callback(action, self._step(action));
    }


    _prLoadStories(resolve, reject) {
        dbops((db, client) => {
            db.collection('stories').find({}).toArray((err, result) => {
                client.close();
                if(err) { reject(err) }
                else if(result == null) { reject("no story in db"); }
                else {
                    _reign_game_instance.allStories = result;
                    resolve();
                }
            });
        });
    }

    _step(action = "none") {
        this.votes = {}; // clear old votes
        let result = { status: '', message: '' }; // result prototype
        if(this.waitingForAction) {
            // ASSERT(action in [_A.name, _B.name])
            let done = this._do( action == this.currentStory._A.name ? this.currentStory._A : this.currentStory._B);
            if(!done) {
                this.currentStory = this._pickNextStory();
                this.briefHistory.push(this.currentStory);
                if(this.briefHistory.length > 10) this.briefHistory.shift();
                result.status = "step";
                result.message = this._makeReadableStory(this.currentStory);
                result.outcome = this._makeReadableState();
                return result;
            } else {
                result.status = "game_over";
                result.message = this.gameOverReason;
                result.outcome = this._makeReadableState();
                this.waitingForAction = false;
                return result;
            }
        } else {
            this.currentStory = this._pickNextStory();
            this.briefHistory.push(this.currentStory);
            if(this.briefHistory.length > 10) this.briefHistory.shift();
            result.status = "step";
            result.message = this._makeReadableStory(this.currentStory);
            result.outcome = this._makeReadableState();
            this.waitingForAction = true;
            return result;
        }
    }

    _do(action) {
        let keys = Object.keys(action._result);
        for(let i in keys) {
            let key = keys[i];
            if(this.reignState.hasOwnProperty(key)){
                this.reignState[key] += action._result[key];
            }
        }

        if(this.reignState.army <= 0 || this.reignState.army >= 20) {
            this.gameOverReason = "Your reign fell because you have a way too " + this.reignState.army > 10 ? "powerful" : "weak" + " army.";
            return true;
        } else if(this.reignState.economy <= 0 || this.reignState.economy >= 20) {
            this.gameOverReason = this.reignState.economy > 10 
                ? "Your reign fell of greed and corruption."
                : "Your reign fell of poorness and famine.";
            return true;
        } else if(this.reignState.people <= 0 || this.reignState.people >= 20) {
            this.gameOverReason = this.reignState.people > 10 
                ? "Your people seized enough power and freedom to pull over the reign."
                : "Your people don't support your government any more.";
            return true;
        } else if(this.reignState.religion <= 0 || this.reignState.religion >= 20) {
            this.gameOverReason = this.reignState.religion > 10 
                ? "You are not the governer of your reign anymore. The Pope ruled you."
                : "Faith and belief will not bliss your reign anymore.";
            return true;
        }
        return false;
    }

    _makeReadableState() {
        var obj = new Object();
        let keys = Object.keys(this.reignState);
        for(let i in keys) {
            let item = keys[i];
            if(this.reignState[item] <= 0 || this.reignState[item] >= 20) {
                obj[item] = "Out of control";
            } else if (this.reignState[item] <= 5) {
                obj[item] = "Barely enough";
            } else if (this.reignState[item] <= 10) {
                obj[item] = "Pretty good";
            } else if (this.reignState[item] <= 15) {
                obj[item] = "More than enough";
            }
        }
        return obj;
    }

    _makeReadableStory(story) {
        var obj = {};
        for(let key in story) {
            if((typeof key) == "string" && key.length > 0) {
                if(key[0] != '_') {
                    obj[key] = story[key];
                }
            }
        }
        obj.options = [story._A.name, story._B.name];
        return JSON.stringify(obj);  // TODO: beautify this some time.
    }

    _pickNextStory() {
        // you can use this.briefHistory to support generating subsequent events
        // for the 1st version, we randomly pick one from story list
        return this.allStories[Math.floor(Math.random() * this.allStories.length)];
    }

    destroy() {
        if(this.hangingVote != null) {
            clearInterval(this.hangingVote);
            this.hangingVote = null;
        }
        _reign_game_instance = null;
    }
}

