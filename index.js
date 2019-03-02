var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);


const defaultParser = { 
    change_nickname_command_re: /^#nickname:\s*(\w+)$/,
    parse : function ( message, user ) {
        if ( ( captured = this.change_nickname_command_re.exec( message ) ) != null ) {
            console.log(captured);
            user.setNickname( captured[1] );
            return true;
        }
        return false;
    },
}

class User {
    constructor ( socket ) {
        this.socket = socket;
        this.nickname = String(socket.request.connection.remoteAddress);
    }
    setNickname ( nickname ) {
        this.nickname = nickname;
    }
}


const globalContext = {
    parsers: [defaultParser],
    connectedUsers: {}
}


app.get( '/', function( req, res ) {
    res.sendFile(__dirname + '/index.html');
});

io.on( 'connection', function( socket ) {

    if( !globalContext.connectedUsers.hasOwnProperty( socket ) ) {
        globalContext.connectedUsers[socket] = new User( socket );
        console.log( 'new connection from ' + socket.request.connection.remoteAddress );
        io.emit( 'message', "Welcome friend from " + socket.request.connection.remoteAddress );
    }

    socket.on( 'disconnect', function() {
        console.log( 'user disconnected' );
        io.emit( 'message', 'someone left us ):<' );
    });

    socket.on( 'message', function( msg ) {
        try {
            let isCommand = false;
            let parsers = globalContext.parsers;
            var user = globalContext.connectedUsers[socket];
            for(let i in parsers) {
                if( parsers[i].parse( msg, user ) ) {
                    isCommand = true;
                    break;
                }
            }
            if( !isCommand ) {
                let user = globalContext.connectedUsers[socket];
                io.emit( 'message', user.nickname + ": " + msg );
            }
        } catch( e ) { 
            console.log( e ); 
        }
        
    });

});

http.listen( 8080, function() {
    console.log( 'listening on *:8080' );
});
