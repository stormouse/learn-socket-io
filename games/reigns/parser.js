

module.exports = {
    gameInstance: null,
    vote_action_re: /^#reigns-vote: (\w+)$/,
    parse: function(message, user) {
        try {
            if(this.gameInstance === null) return false;
            if(user.nickname.match(/^\w+$/) == null) {
                user.socket.emit('system_notification', 'Change to your nickname to play the game.');
                return true;
            }
            if((captured = vote_action_re.exec(message)) != null) {
                this.gameInstance.vote(user.nickname, captured[1]);
                return true;
            }
        } catch(e) {}

        return false;
    }
}