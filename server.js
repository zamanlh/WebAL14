var express = require('express')
	, app = express()
	, server = require('http').createServer(app)
	, io = require('socket.io').listen(server)
	, _ = require('lodash');

server.listen(8010);

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});

app.use("/public", express.static(__dirname + "/public"));

saved_orgs = {};

io.sockets.on('connection', function (socket) {
	io.sockets.sockets['nickname'] = socket.id;

	socket.on('num_connected', function(data) {
		socket.emit('num_connected_response', {connections: io.sockets.clients().length});
	});

	socket.on('save_org', function(data) {
		saved_orgs[io.sockets.sockets.nickname] = data;
	});

	socket.on('get_org', function(data) {
		random_connection = _.sample(_.keys(saved_orgs), 1);
		socket.emit('send_org', saved_orgs[random_connection]);
	});

	socket.on('disconnect', function () {
		delete saved_orgs[io.sockets.sockets.nickname];
		delete io.sockets.sockets.nickname;
	});
});