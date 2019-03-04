

module.exports = {
    gameInstance: null,
    vote_action_re: /^#reigns-vote: (\w+)$/,
    parse: function(message, user) {
        try {
            if(this.gameInstance == null) return false;
            if((captured = this.vote_action_re.exec(message)) != null) {
                if(user.nickname.match(/^\w+$/) == null) {
                    user.socket.emit('system_notification', 'Change to your nickname to play the game.');
                    return true;
                }
                this.gameInstance.vote(user.nickname, captured[1]);
                return true;
            }
        } catch(e) {}

        return false;
    }
}