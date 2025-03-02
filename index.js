const PORT = 7777;
let http = require('http');
let static = require('node-static');
let ws = require('ws');

let file = new static.Server('./public');

let http_server = http.createServer(function (request, response) {
    request.addListener('end', function () {
        file.serve(request, response);
    }).resume();
}).listen(PORT);

let ws_server = new ws.Server({ server: http_server });
let player1 = null, player2 = null;
let spectators = [];

function notifyGamePause() {
    let gamePause = { gS: false };
    if (player1) player1.send(JSON.stringify(gamePause));
    if (player2) player2.send(JSON.stringify(gamePause));
    spectators.forEach(s => s.send(JSON.stringify(gamePause)));
}

function spectatorMessage(message){
	spectators.forEach(s => s.send(JSON.stringify(message)));
}

ws_server.on('connection', function (conn) {
    console.log("Usuario conectado");
    
    if (player1 == null) {
        player1 = conn;
        player1.send(JSON.stringify({ player_num: 1 }));

        player1.on('close', function () {
            console.log("Player 1 disconnected");
            player1 = null;
            notifyGamePause();
            if (player2) player2.send(JSON.stringify({ message: "Player 1 disconnected" }));
	    	spectatorMessage({ message: "Player 1 disconnected"});
        });

        player1.on('message', function (msg) {
            if (!player2) return;
            let info = JSON.parse(msg);
            if (info.y1 != null || info.by != null) {
                player2.send(JSON.stringify(info));
		spectatorMessage(info);
            }
	    else if(info.s1 != null){
                player2.send( JSON.stringify(info) );
                player1.send( JSON.stringify(info) );
		spectatorMessage(info);
		 if(info.s1 > 3){
                    let gmOv = { p: "PLAYER 1"}
                    player2.send ( JSON.stringify(gmOv) );
                    player1.send ( JSON.stringify(gmOv) );
		    spectatorMessage(gmOv);
                    return;
                }
                if(info.s2 > 3){
                    let gmOv = { p: "PLAYER 2"};
                    player2.send ( JSON.stringify(gmOv) );
                    player1.send ( JSON.stringify(gmOv) );
		    spectatorMessage(gmOv);
                    return;
                }
	    }
        });
    } 
    else if (player2 == null) {
        player2 = conn;
        player2.send(JSON.stringify({ player_num: 2 }));
        
        setTimeout(function () {
            let gameStart = { gS: true };
            if (player1) player1.send(JSON.stringify(gameStart));
            if (player2) player2.send(JSON.stringify(gameStart));
	   		spectatorMessage(gameStart);
        }, 1000);

        player2.on('close', function () {
            console.log("Player 2 disconnected");
            player2 = null;
            notifyGamePause();
            if (player1) player1.send(JSON.stringify({ message: "Player 2 disconnected" }));
			spectatorMessage({ message: "Player 2 disconnected"});
        });

        player2.on('message', function (msg) {
            if (!player1) return;
            let info = JSON.parse(msg);
            if (info.y2 != null) {
                player1.send(JSON.stringify(info));
				spectatorMessage(info);
            }
        });
    }
    else{
	spectators.push(conn);
	conn.send(JSON.stringify({ player_num: 3 }));
	conn.on('close', function () {
            spectators = spectators.filter(s => s !== conn);
        });
    }
});
