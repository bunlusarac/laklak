const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require("socket.io");
const io = new Server(server);
const favicon = require('serve-favicon');
const { v4: uuidv4 } = require('uuid');

//array that contains currently available rooms
const roomsArray = {'123': {'password': '123', 
							  'name': 'test odasi',
							  'admin-socket-id': '123',
							  'users': {'123': 'admin'}}};
							

app.use(favicon(__dirname + '/favicon.png'))

app.get('/socket.js', (req, res) => {
	res.sendFile(__dirname + '/socket.js');
});

app.get('/style.css', (req, res) => {
	res.sendFile(__dirname + '/style.css');
});

app.get('/logo.png', (req, res) => {
	res.sendFile(__dirname + '/logo.png');
});

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/chat.html');
});

//When user connected
io.on('connection', (socket) => {
	console.log('user connected');

	//When user disconnects
	socket.on('disconnect', () => {
		console.log('user disconnected');
	});

	//When a new chat message event is caught
	socket.on('chat message', (messageBundle) => {
		//Emit to all clients except sender
		//This assumes that the socket has joined to a room
		//Disable all chatroom controls before joining/hosting!!!!!!!!
		const roomId = Array.from(socket.rooms)[1];
		console.log(roomId);
		socket.to(roomId).emit('chat message', messageBundle);
	});

	socket.on('join room', (joinBundle) => {
		const roomId = joinBundle.roomId;
		const roomPassword = joinBundle.roomPassword;
		const username = joinBundle.username;
		const timestamp = joinBundle.timestamp;

		if(!(roomId in roomsArray))
		{
			socket.emit('join fail');
		}
		else{
			//Room authentication here, unhash the password and compare
			if(roomsArray[roomId]['password'] == roomPassword){
				socket.join(roomId);
				console.log(`Socket with ID ${socket.id} joined to room with ID ${roomId}`);
			
				roomsArray[roomId]['users'][socket.id] = username;
				const roomData = roomsArray[roomId];
				const adminSocketId = roomData['admin-socket-id'];

				const numMembers = Object.keys(roomData['users']).length;
				const newcomerData = {'socket-id': socket.id, 
									  'username': username, 
									  'timestamp': timestamp,
									  'num-members': numMembers,
									  'admin-socket-id': adminSocketId};

				roomData['room-id'] = roomId;

				socket.emit('join success', roomData); //to newcomer
				socket.to(roomId).emit('newcomer', newcomerData); //to other users
			}
			else{
				socket.emit('join fail');
				console.log(`Authentication failed. Socket with ID ${socket.id} failed to join the room with ID ${roomId}`);
			}
		}
	});

	socket.on('host room', (hostBundle) => {
		const username = hostBundle.username;
		const roomPassword = hostBundle.roomPassword;
		const roomName = hostBundle.roomName;

		const roomId = uuidv4();
		const newRoom = {'password': roomPassword,
						 'name': roomName,
						 'admin-socket-id': socket.id,
						 'users': {[socket.id]: username}};

		//This is for mockup purposes, this will be changed to Redis query
		roomsArray[roomId] = newRoom;
		console.log(roomsArray);

		const adminJoinBundle = {'username': username,
								 'roomId': roomId,
								 'roomPassword': roomPassword,
								 'timestamp': Date(),
								 'room-id': roomId};

		socket.emit('join admin', adminJoinBundle);
	});

	socket.on('disconnecting', () => {

		console.log(`${socket.id} leaving`);
		const socketId = socket.id;
		const socketRoomArray = Array.from(socket.rooms);

		//If joined to a room
		if(socketRoomArray.length == 2){
			const roomId = socketRoomArray[1];

			const roomData = roomsArray[roomId];
			const users = roomData['users'];
			const userName = users[socketId];
			let usersKeys = Object.keys(users);


			if(socketId == roomData['admin-socket-id']){
				//admin is leaving
				delete users[socketId];

				//new admin socket id randomization
				const newAdminSocketId = usersKeys[usersKeys.length * Math.random() << 0];	
				console.log(`new admin is ${newAdminSocketId} which is ${users[newAdminSocketId]}`);
				roomData['admin-socket-id'] = newAdminSocketId;
				console.log("admin switched");
			}	
			else{
				//regular member is leaving
				delete users[socketId];
			}

			//if there are no members, delete room 
			usersKeys = Object.keys(users); //update
			if(usersKeys.length == 0){
				delete roomsArray[roomId];
				console.log("room destroyed");
			}
			else{
				//notify other member UI's
				const leaveBundle = {
					'socket-id': socketId,
					'username': userName,
					'users' : users,
					'admin-socket-id' : roomData['admin-socket-id'],
					'timestamp': Date() };

				socket.to(roomId).emit('notify leave', leaveBundle);
			}
		}
	});

	socket.on('kick', (kickSocketId) => {
		//verify that request is from admin
		const roomId = Array.from(socket.rooms)[1];
		const roomData = roomsArray[roomId];
		const adminSocketId = roomData['admin-socket-id'];

		if(socket.id == adminSocketId){
			//proceed kicking
			console.log("verified");
			const kickSocket = io.sockets.sockets.get(kickSocketId);
			kickSocket.emit('kick notify');
			kickSocket.disconnect();
			console.log("kicked");
		}
		else{
			console.log("GO AWAY YOU HACKER");
		}
	});
});



server.listen(3000, () => {
	console.log('listening on 3000')
});