const dbops = require('../../shared/dbconn.js')('reigns');

module.exports = class Game {
    constructor(callbacks, maxVoteCount, timeForRoundAfterFirstVote = 30) {
        this.reignState = {
            army: 10,
            economy: 10,
            people: 10,
            religion: 10,
        };

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
        var self = this;
        this.waitingForAction = false;
        this.briefHistory = [];
        Promise.all([
            new Promise(_prLoadStories),
        ])
        .then(function() {
            step_callback(self._step());
        })
        .catch((err) => {
            console.log("Error starting Reigns: " + err);
        });
    }

    vote(playerName, action) {
        let result = {status:'', message:''};
        if(action === "none") {
            result.status = 'error';
            result.message = 'require an action to continue';
            vote_callback(result);
        }
        if(action !== this.currentStory._A.name && action !== this.currentStory._B.name) {
            result.status = 'error';
            result.message = "invalid action, only accept '" + this.currentStory._A.name + "' or '" + this.currentStory._B.name + "'.";
            vote_callback(result);
        }

        this.votes[playerName] = action;
        if(Object.keys(this.votes).length == 1) {
            this.hangingVote = setTimeout(this.step, this.timeForRoundAfterFirstVote * 1000);
        }
        if(Object.keys(this.votes).length == this.maxVoteCount) {
            this.step();
            result.status = 'accepted';
            result.message = '[FINAL] ' + this.currentStory._A.name + ": " + this._acount() + ",  " + this.currentStory._B.name + ": " + this._bcount();
            vote_callback(result);
        } else {
            result.status = 'accepted';
            result.message = this.currentStory._A.name + ": " + this._acount() + ",  " + this.currentStory._B.name + ": " + this._bcount();
            vote_callback(result);
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
        if(this.hangingVote != null) {
            clearTimeout(this.hangingVote);
            this.hangingVote = null;
        }
        let a = this._acount();
        let b = this._bcount();
        let action;
        if(a == b) { action = Math.random() < 0.5 ? this.currentStory._A.name : this.currentStory._B.name; }
        else { action = a > b ? this.currentStory._A.name : this.currentStory._B.name; }
        step_callback(action, this._step(action));
    }


    _prLoadStories(resolve, reject) {
        var self = this; // by-pass js scope
        dbops(function(db, client){
            db.stories.find({}).toArray(function(err, result) {
                client.close();
                if(err) { reject(err) }
                else if(result == null) { reject("no story in db"); }
                else {
                    // filter stories here
                    self.allStories = result;
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
                result.status = "gameOver";
                result.message = this.gameOverReason;
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
        this.reignState.army += action._result.army;
        this.reignState.economy += action._result.economy;
        this.reignState.people += action._result.people;
        this.reignState.religion += action._result.religion;

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
        let obj = {};
        for(let item in this.reignState) {
            if(this.reignState[item] <= 0 || this.reignState[item] >= 20) {
                obj[item] = "Out of control";
            } else if (this.reignState <= 5) {
                obj[item] = "Barely enough";
            } else if (this.reignState <= 10) {
                obj[item] = "Pretty good";
            } else if (this.reignState <= 15) {
                obj[item] = "More than enough";
            }
        }
        return obj;
    }

    _makeReadableStory(story) {
        var obj = {};
        for(let key in story) {
            if((typeof key) === "string" && key.length > 0) {
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
    }
}

