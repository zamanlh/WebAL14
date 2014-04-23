var express = require('express')
	, app = express()
	, server = require('http').createServer(app)
	, io = require('socket.io').listen(server);

server.listen(80);

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});

app.use("/public", express.static(__dirname + "/public"));


num_connected = 0;

stored_org = null;

io.sockets.on('connection', function (socket) {
	num_connected += 1;

	socket.on('num_connected', function(data) {
		socket.emit('num_connected_response', {connections: num_connected});
	});

	socket.on('save_org', function(data) {
		stored_org = data;
	});

	socket.on('get_org', function(data) {
		socket.emit('send_org', stored_org);
	});

	socket.on('disconnect', function () {
		num_connected -= 1;
	});


});