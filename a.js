var net = require("net");
var EventEmitter = require('events').EventEmitter;

var server = net.createServer();
server.listen(process.env.PORT || 1234);

var crypto = require("crypto");
function genId(bytes) {
        return crypto.randomBytes(bytes).toString("hex");
}

var users = [];
var userEventEmitter = new EventEmitter();

server.on("connection", function (socket) {
	var id = users.push(socket) - 1;
	socket.write("Assigning game... \n\
While you wait, here's the documentation: \n\
\n\
> firewall create <int level> \n\
> firewall up <String id> \n\
> firewall down <String id> \n\
\n\
> bot create <int level> \n\
> bot up <String id> \n\
> bot down <String id> \n\
\n\
> exit\n\
");
	userEventEmitter.emit("newuser", id);
});

userEventEmitter.on("newuser", function (id) {
	if (users.length % 2 == 0 && users.length > 0) {
		new Game(users[id - 1], users[id]);
	}
});

function Game(s1, s2) {



	var parseCommand = function (str) {
		return str.split(" ");
	};

	function Player(soc, cb) {
		var buf = "";
		soc.on("data", function (d) {
			buf += d;
			if (buf.indexOf("\n") > -1) {
				buf.split("\n").forEach(function (t) {
					t && cb(t);
				});
			}
		});
		return {
			write: function (txt) {
				soc.write(txt);
			},
			end: function () {
				soc.end();
			},
			firewalls: [],
			bots: [],
			prompt: function () {
				soc.write("> ");
			},
			acceptinput: false
		};
	}

	var p1 = new Player(s1, function (command) {
		if (p1.acceptinput) {
			var commands = parseCommand(command);		
			GameEvents.emit("command", commands, p1, p2);
		}
	});
	var p2 = new Player(s2, function (command) {
		if (p2.acceptinput) {
			var commands = parseCommand(command);		
			GameEvents.emit("command", commands, p2, p1);
		}
	});
	var isispup = false;
	
	var welcome = "\nConnected to opponent! ISP will go up in 10 seconds. Prepare for attack now! \n";
	p1.write(welcome);
	p2.write(welcome);
	p1.acceptinput = true;
	p2.acceptinput = true;
	p1.prompt();
	p2.prompt();

	var GameEvents = new EventEmitter();

	setTimeout(function () {
		isispup = true;
		GameEvents.emit("ispup");
		var attack = "\n ISP is up! Attacks will begin to come in! \n";
		p1.write(attack);
		p2.write(attack);
	}, 10 * 1000);

	GameEvents.on("command", function (command, player, opponent) {
		player.accpetinput = false;
		var cb = function () {
			player.acceptinput = true;;
			player.prompt();
		};
		var args = command;
		args.splice(0, 1);
		if (GameEvents.listeners(command[0]).length == 0 || command[0] == "command") {
			player.write("Command not found \n");
			cb();
		}
		else {
			GameEvents.emit(command[0], args, player, opponent, cb);
		}
	});

	var delays = {
		firewallCreation: function (i) {
			return Math.floor(i * 200 + 100);
		},
		firewallUp: function (i) {
			return Math.floor(i * 1000);
		},
		firewallDown: function (i) {
			return Math.floor(1);
		}
	};

	GameEvents.on("firewall", function (args, player, opponent, done) {
		if (args[0] == "create") {
			player.write("Creating firewall...");
			setTimeout(function () {
				var firewall = {
					hash: genId(Math.pow(args[1], 2)),
					level: args[1],
					up: false
				};
				player.write("Created firewall " + firewall.hash + " of level " + firewall.hash + " \n");
				done();
				player.firewalls.push(firewall);
				//setTimeout(function () {
				//	if (player.firewalls.indexOf(firewall) > -1) {
				//		player.firewalls.splice(player.firewalls.indexOf(firewall), 1);
				//	}
				//}, 100);
			}, firewallCreation(args[1]));
		}
		else if (args[0] == "up" && args[1]) {
			player.write("Starting firewall...");
			setTimeout(function () {
				player.firewalls.forEach(function (firewall) {
					if (args[1] == firewall.hash) {
						firewall.up = true;
						player.write("Firewall " + firewall.hash + " is up! ");
						done();
					}
				});
			}, firewallUp(args[1]));	
		}
		else if (args[0] == "down" && args[1]) {
			player.write("Stopping firewall...");
			setTimeout(function () {
				player.firewalls.forEach(function (firewall) {
					if (args[1] == firewall.hash) {
						firewall.up = false;
						player.write("Firewall " + firewall.hash + " stopped! ");
						done();
					}
				});
			}, firewallDown(args[1]));
		}
	}); 



}
