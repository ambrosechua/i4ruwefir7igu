var net = require("net");
var EventEmitter = require('events').EventEmitter;
var httpserver = require('http').createServer(httphandler).listen(8023);
var io = require('socket.io').listen(httpserver);
var fs = require('fs');
var server = net.createServer();
server.listen(1234);

function httphandler(req, res) {
	if (req.url == "/") {
		fs.createReadStream("index.html").pipe(res);
	}
	else {
		res.writeHead(500);
		res.end();
	}
}

var crypto = require("crypto");
function genId(bytes) {
        return crypto.randomBytes(bytes).toString("hex");
}

function log(t) {
	true && console.log(t);
}

String.prototype.repeat = function (c) {
	var s = "";
	for (var i = 0; i < c; i++) {
		s += this;
	}
	return s;
}; 

function formatString(s, w, alignright) {
	var c = w - s.length;
	return alignright ? " ".repeat(c) + s : s + " ".repeat(c);
}

var users = [];
var userEventEmitter = new EventEmitter();

var conn = function (socket) {
	var oldwrite = socket.write;
	socket.write = function () {
		oldwrite.call(socket, arguments[0].replace("\n", "\r\n"));
	};
	var id = users.push(socket) - 1;
	socket.write("Assigning game... \r\n\
While you wait, here's all the commands: \r\n\
> firewall list \r\n\
> firewall create <int level> \r\n\
> firewall up <String id> \r\n\
> firewall delete <String id> \r\n\
> bot list \r\n\
> bot create <int level> \r\n\
> bot up <String id> \r\n\
> bot delete <String id> \r\n\
> exit\r\n\
");
	userEventEmitter.emit("newuser", id);
};

io.sockets.on('connection', function (socket) {
	socket.write = function (t) {
		socket.emit("data", t);
	};
	socket.end = function (t) {
		//socket.disconnect(true);
		try {
			socket.emit("disconnect");
		}
		catch (e) {
		
		}
	};
	conn(socket);
});
server.on("connection", conn);

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
					t && cb(t.replace("\r", ""));
					buf = "";
				});
			}
		});
		soc.on("disconnect", function () {
			cb({ dc: true });
		});
		soc.on("end", function () {
			cb({ dc: true });
		});
		this.write = function (txt) {
			soc.write(txt);
		};
		this.end = function () {
			soc.end();
		};
		this.dead = function () {
			cb({ lose: true });
		};
		this.xp = 0;
		this.firewalls = [];
		this.damage = 0;
		this.bots = [];
		this.prompt = function () {
			soc.write("> ");
		};
		this.acceptinput = false;
		this.attack = function () {
			this.damage -= attacks.attackHealth();
			log("damage: " + this.damage);
			var a = null;
			this.firewalls.forEach(function (e) {
				a && e.up ? 0 : a = e;
			}); 
			if (this.damage <= -attacks.firewallHealth(a.level)) {
				log("wall down: " + a.hash);
				this.write("Your firewall " + a.hash + " went down. ");
				this.firewalls.splice(0, 1);
				this.damage = 0;
				if (this.firewalls.length == 0) {
					this.dead();
				}
				return true;
			}
			return false;
			
		}
		return this;
	}
	

	var GameEvents = new EventEmitter();

	var p1 = new Player(s1, function (command) {
		if (typeof command == "object" && command.lose ) {
			GameEvents.emit("dead", p1, p2);
			return;
		}
		if (typeof command == "object" && command.dc ) {
			GameEvents.emit("exit", "", p1, p2);
			return;
		}	
		if (p1.acceptinput) {
			var commands = parseCommand(command);		
			GameEvents.emit("command", commands, p1, p2);
		}
	});
	var p2 = new Player(s2, function (command) {
		if (typeof command == "object" && command.lose ) {
			GameEvents.emit("dead", p2, p1);
			return;
		}
		if (typeof command == "object" && command.dc ) {
			GameEvents.emit("exit", "", p2, p1);
			return;
		}	
		if (p2.acceptinput) {
			var commands = parseCommand(command);		
			GameEvents.emit("command", commands, p2, p1);
		}
	});
	var isispup = false;

	var countdown = "\r\nConnected to opponent! Will start in 3...";	
	p1.write(countdown);
	p2.write(countdown);

	setTimeout(function () {
	
	countdown = "2...";
	p1.write(countdown);
	p2.write(countdown);

	}, 1000);
	
	setTimeout(function () {
	
	countdown = "1...";
	p1.write(countdown);
	p2.write(countdown);

	}, 2000);

	setTimeout(function () {
		
	var welcome = "GO!\r\nISP will go up in 30 seconds. Prepare for attack now! \r\n";
	p1.write(welcome);
	p2.write(welcome);
	p1.acceptinput = true;
	p2.acceptinput = true;
	p1.prompt();
	p2.prompt();

	p1.firewalls.push({
		hash: genId(1),
		level: 1,
		up: true
	});
	p2.firewalls.push({
		hash: genId(1),
		level: 1,
		up: true
	});

	setTimeout(function () {
		isispup = true;
		GameEvents.emit("ispup");
		var attack = "\r\nISP is up! Attacks will begin to come in! \r\n";
		p1.write(attack);
		p2.write(attack);
		p1.prompt();
		p2.prompt();
	}, 30 * 1000);

	}, 3000);	

	GameEvents.on("command", function (command, player, opponent) {
		player.acceptinput = false;
		var cb = function () {
			player.acceptinput = true;;
			player.prompt();
		};
		var args = command.concat();
		args.shift();
		if (GameEvents.listeners(command[0]).length == 0 || command[0] == "command") {
			player.write("Command not found \n");
			cb();
		}
		else {
			GameEvents.emit(command[0], args, player, opponent, cb);
		}
	});
	
	GameEvents.on("exit", function (command, player, opponent) {
		player.write("You are being disconnected...");
		opponent.write("Your opponent disconnected from the game");
		player.end();
		opponent.end();
		users.splice(users.indexOf(s1), 1);
		users.splice(users.indexOf(s2), 1);
	});

	GameEvents.on("dead", function (dead, opponent) {
		dead.write("You got hacked. Data comprimised. ");
		opponent.write("Data aquired. Mission complete! ");
		dead.end();
		opponent.end();
		users.splice(users.indexOf(s1), 1);
		users.splice(users.indexOf(s2), 1);
	});

	var attacks = {
		firewallHealth: function (i) {
			return 200 * i;
		},
		attackHealth: function () {
			return 10;
		}
	};
	
	var delays = {
		botCreation: function (i) {
			return Math.floor(i * 1000 - 200);
		},
		botUp: function (i) {
			return Math.floor(i * 2000 - 500);
		},
		botDown: function (i) {
			return Math.floor(1);
		},
		botAttack: function (i) {
			return	Math.floor(1 / i * 1000);
		},
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


	GameEvents.on("bot", function (args, player, opponent, done) {
		if (args[0] == "list") {
			player.write("Created Bots: \n");
			player.write("+------------+------+-------+\n");
			player.write("|" + formatString("ID", 12) + "|" + formatString("Level", 6) + "|" + formatString("Status", 7) + "|\n");
			player.write("+------------+------+-------+\n");
			player.bots.forEach(function (bot) {
				player.write("|" + formatString(bot.hash, 12) + "|" + formatString(bot.level + "", 6) + "|" + formatString((bot.up ? "Up" : "Down"), 7) + "|\n");
			});
			player.write("+------------+------+-------+\n");
			done();
		}
		else if (args[0] == "create" && args[1] * 1 > 0 && args[1] * 1 < 6) {
			args[1] = args[1] * 1;
			player.write("Creating bot... \n");
			if (args[1] - 1 > player.xp) {
				player.write("XP is insufficient to create a level " + args[1] + " bot. Break down firewalls to earn +1 XP. \n");
				done();
			}
			else {
				setTimeout(function () {
					var bot = {
						hash: genId(7),
						level: args[1],
						up: false
					};
					player.write("Created bot " + bot.hash + " of level " + bot.level + " \n");
					done();
					player.bots.push(bot);
				}, delays.botCreation(args[1]));
			}
		}
		else if (args[0] == "up" && args[1]) {
			player.write("Starting bot... \n");
			var isdone = false;
			player.bots.forEach(function (bot, index) {
				if (args[1] == bot.hash) {
					isdone = true;
					setTimeout(function () {
						bot.up = true;
						player.write("Bot " + bot.hash + " started! \n");

						var attackcheck = function () {
							var intv = setInterval(function () {
								if (opponent.attack()) {
									player.bots.splice(player.bots.indexOf(bot), 2);
									player.xp++;
									clearInterval(intv);
								}
							}, delays.botAttack(bot.level));
						};

						if (isispup) {
							attackcheck();
						}
						else {
							GameEvents.on("ispup", attackcheck);
						}

						done();
					}, delays.botUp(bot.level));
				}
			});
			if (!isdone) {
				player.write("Bot not found. \n");
				done();
			}
		}
		else if (args[0] == "delete" && args[1]) {
			player.write("Removing Bot... \n");
			var isdone = false;
			player.bots.forEach(function (bot, index) {
				if (args[1] == bot.hash) {
					isdone = true;
					setTimeout(function () {
						bot.up = false;
						player.write("Bot " + bot.hash + " removed! \n");
						player.bots.splice(player.bots.indexOf(bots), 1);
						done();
					}, delays.botDown(bot.level));
				}
				if (player.bots.length - 1 == index && !isdone) {
					player.write("Bot not found. \n");
					done();
				}
			});
		}
		else {
			player.write("Error running command \n");
			done();
		}
	});
 
	GameEvents.on("firewall", function (args, player, opponent, done) {
		if (args[0] == "list") {
			player.write("Created Firewalls: \n");
			player.write("+----------------+------+-------+\n");
			player.write("|" + formatString("ID", 16) + "|" + formatString("Level", 6) + "|" + formatString("Status", 7) + "|\n");
			player.write("+----------------+------+-------+\n");
			player.firewalls.forEach(function (firewall) {
				var id = firewall.hash.length < 13 ? firewall.hash : firewall.hash.substr(1, 12) + "...";
				player.write("|" + formatString(id, 16) + "|" + formatString(firewall.level + "", 6) + "|" + formatString((firewall.up ? "Up" : "Down"), 7) + "|\n");
			});
			player.write("+----------------+------+-------+\n");
			done();
		}
		else if (args[0] == "create" && args[1] * 1 > 0 && args[1] * 1 < 6) {
			args[1] = args[1] * 1;
			player.write("Creating firewall... \n");
			if (args[1] - 1 > player.xp) {
				player.write("XP is insufficient to create a level " + args[1] + " firewall. Break down firewalls to earn +1 XP. \n");
				done();
			}
			else if (player.firewalls.length >= 5) {
				player.write("Too many firewalls. Maxium 5 firewalls. \n");
				done();
			}
			else {
				setTimeout(function () {
					var firewall = {
						hash: genId(Math.floor(Math.pow(args[1], 1.5) + 1)),
						level: args[1],
						up: false
					};
					player.write("Created firewall " + firewall.hash + " of level " + firewall.level + " \n");
					done();
					player.firewalls.push(firewall);
					//setTimeout(function () {
					//	if (player.firewalls.indexOf(firewall) > -1) {
					//		player.firewalls.splice(player.firewalls.indexOf(firewall), 1);
					//	}
					//}, 100);
				}, delays.firewallCreation(args[1]));
			}
		}
		else if (args[0] == "up" && args[1]) {
			player.write("Starting firewall... \n");
			var isdone = false;
			player.firewalls.forEach(function (firewall, index) {
				if (args[1] == firewall.hash) {
					isdone = true;
					setTimeout(function () {
						firewall.up = true;
						player.write("Firewall " + firewall.hash + " started! \n");
						done();
					}, delays.firewallUp(firewall.level));
				}
			});
			if (!isdone) {
				player.write("Firewall not found. \n");
				done();
			}
		}
		else if (args[0] == "delete" && args[1]) {
			player.write("Removing firewall... \n");
			var isdone = false;
			player.firewalls.forEach(function (firewall, index) {
				if (args[1] == firewall.hash) {
					isdone = true;
					setTimeout(function () {
						firewall.up = false;
						player.write("Firewall " + firewall.hash + " removed! \n");
						player.firewalls.splice(player.firewalls.indexOf(firewall), 1);
						done();
					}, delays.firewallDown(firewall.level));
				}
				if (player.firewalls.length - 1 == index && !isdone) {
					player.write("Firewall not found. \n");
					done();
				}
			});
		}
		else if (false && args[0] == "down" && args[1]) {
			player.write("Stopping firewall... \n");
			var isdone = false;
			player.firewalls.forEach(function (firewall, index) {
				if (args[1] == firewall.hash) {
					isdone = true;
					setTimeout(function () {
						firewall.up = false;
						player.write("Firewall " + firewall.hash + " stopped! \n");
						done();
					}, delays.firewallDown(firewall.level));
				}
				if (player.firewalls.length - 1 == index && !isdone) {
					player.write("Firewall " + firewall.hash + " not found. \n");
					done();
				}
			});
		}
		else {
			player.write("Error running command \n");
			done();
		}
	}); 



}
