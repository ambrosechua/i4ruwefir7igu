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
	socket.on("end", function () {
		userEventEmitter.emit("deaduser", id);
	});
});

userEventEmitter.on("newuser", function (id) {
	if (users.length % 2 == 0) {
		new Game(users[id - 1], users[id]);
	}
});
