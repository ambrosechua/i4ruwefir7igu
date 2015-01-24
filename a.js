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
	var id = users.push({
		socket: socket,
	});
	socket.write("Assigning game... \n\
While you wait, here's the documentation: \n\
\n\
firewall create <int level> \n\
firewall up <String id> \n\
firewall down <String id> \n\
\n\
bot create <int level> \n\
bot up <String id> \n\
bot down <String id> \n\
\n\
exit\n\
");
	userEventEmitter.emit("newuser", id);
});

userEventEmitter.on("newuser", function (id) {
	if (users.length % 2 == 0) {
		new Game(users[id - 1], users[id]);
	}
});

function Game(s1, s2) {



	var parseCommand = function (str) {
		return str.split(" ");
	};

	function Player(soc, cb) {
		var buf;
		soc.on("data", function (d) {
			buf += d;
			if (buf.indexOf("\n") > -1) {
				buf.split("\n").forEach(function (t) {
					t && cb(t);
				});
			}
		});
		return {
			write: function () {
				soc.write(args);
			},
			end: function () {
				soc.end();
			},
			firewalls: [],
			bots: []
		};
	}

	var p1 = new Player(s1, function (command) {
		var commands = parseCommand(command);		
		GameEvents.emit("command", commands, p1, p2);
	});
	var p2 = new Player(s2, function (command) {
		var commands = parseCommand(command);		
		GameEvents.emit("command", commands, p2, p1);
	});

	var GameEvents = new EventEmitter();

	GameEvents.on("command", function (command, player, opponent) {
		var args = command;
		args.splice(0, 1);
		GameEvents.emit(command[0], args, player, opponent);
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

	GameEvents.on("firewall", function (args, player, opponent) {
		if (args[0] == "create") {
			player.write("Creating firewall...");
			setTimeout(function () {
				var firewall = {
					hash: genId(Math.pow(args[1], 2)),
					level: args[1]
				};
				player.write("Firewall Level: " + firewall.level + "\n");
				player.write("Firewall ID: " + firewall.hash + "\n");
				player.firewalls.push(firewall);
			}, firewallCreation(args[1]));
		}
	}); 
s'da;'
d;a's;das'd;as
d;as'
d;a'
s;d
a';d'
as


}
