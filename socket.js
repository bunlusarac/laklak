
window.onload = () => {
	let socket = io();

	const messagesDiv = document.querySelector(".messages");
	const messageForm = document.querySelector(".message-form");
	const messageInput = document.querySelector(".message-input");

	const roomControlsDiv = document.querySelector(".room-controls");
	const hostRoomForm = document.querySelector(".host-room-form");
	const joinRoomForm = document.querySelector(".join-room-form");

	const hostRoomUsernameInput = document.querySelector(".host-room-username-input");
	const hostRoomPasswordInput = document.querySelector(".host-room-password-input");
	const hostRoomNameInput = document.querySelector(".host-room-name-input")

	const joinRoomUsernameInput = document.querySelector(".join-room-username-input");
	const joinRoomIdInput = document.querySelector(".join-room-id-input");
	const joinRoomPasswordInput = document.querySelector(".join-room-password-input");

	const membersDiv = document.querySelector(".members");
	const chatroomHeader = document.querySelector(".chatroom-header");
	const numMembersText = document.querySelector(".number-of-members");

	const chatroomDiv = document.querySelector('.chatroom')
	const roomIdText = document.querySelector(".room-id");
	const copyButton = document.querySelector(".copy-btn");

	chatroomDiv.style.display = 'none';

	copyButton.addEventListener('click', (e) => {
		var r = document.createRange();
		r.selectNode(roomIdText);
		window.getSelection().removeAllRanges();
		window.getSelection().addRange(r);
		document.execCommand('copy');
		window.getSelection().removeAllRanges();
	});

	var userName;

	function addMessageBox(messageBundle){
		let messageItem = document.createElement('li');
		messageItem.classList.add('message');
		messageItem.textContent = `${messageBundle.timestamp}-${messageBundle.username}: ${messageBundle.content}`;
		messagesDiv.appendChild(messageItem);
	}


	//when message is submitted
	messageForm.addEventListener('submit', (e) => {
		e.preventDefault(); //prevent default behavior
		const messageContent = messageInput.value;
		//if input is not empty
		if(messageContent){
			const messageBundle = { 'username': userName, 
									'content': messageContent,
									'timestamp': Date() };

			addMessageBox(messageBundle);
			//emit the message from socket
			socket.emit('chat message', messageBundle);
			//reset input

			messageInput.value = '';
		}
	});

	socket.on('chat message', (messageBundle) => {
		addMessageBox(messageBundle);
		window.scrollTo(0, document.body.scrollHeight);
	});


	joinRoomForm.addEventListener('submit', (e) => {
		e.preventDefault(); 

		const username = joinRoomUsernameInput.value;
		const roomId = joinRoomIdInput.value;
		const roomPassword = joinRoomPasswordInput.value;

		const joinBundle = {'username': username,
							'roomId': roomId, 
							'roomPassword': roomPassword,
							'timestamp': Date()};

		socket.emit('join room', joinBundle);
	});

	hostRoomForm.addEventListener('submit', (e) => {
		e.preventDefault();

		const username = hostRoomUsernameInput.value;
		const roomPassword = hostRoomPasswordInput.value;
		const roomName = hostRoomNameInput.value;


		const hostBundle = {'username': username,
							'roomName': roomName,
							'roomPassword': roomPassword};

		socket.emit('host room', hostBundle);
	});

	socket.on('join success', (roomData) => {
		if(joinRoomUsernameInput.value){
			userName = joinRoomUsernameInput.value;
			joinRoomUsernameInput.value = '';
			joinRoomIdInput.value = '';
			joinRoomPasswordInput.value = '';
		}
		else{
			userName = hostRoomUsernameInput.value;
			hostRoomUsernameInput.value = '';
			hostRoomPasswordInput.value = '';
			hostRoomNameInput.value = '';
		}

		const roomName = roomData['name'];
		const numMembers = Object.keys(roomData['users']).length;
		const usersObject = roomData['users'];
		const adminSocketId = roomData['admin-socket-id'];

		if(roomName){
			chatroomHeader.innerHTML = `${roomName}`;	
		}
		else{
			chatroomHeader.innerHTML = `Chatroom`;	
		}
		
		numMembersText.innerHTML = `Members (${numMembers})`;
		roomIdText.innerHTML = `${roomData['room-id']}`;

		for(const userSocketId in usersObject){
			let memberItem = document.createElement('li');
			

			let adminPostfix = '';
			if(userSocketId == adminSocketId){
				adminPostfix = '(admin)';
			}

			memberItem.textContent = `${usersObject[userSocketId]} (${userSocketId}) ${adminPostfix}`;

			/*Unnecessary code
			if(userSocketId != adminSocketId && socket.id == adminSocketId){
				//memberItem.innerHTML += `<button class="kick-btn" onclick="kickButtonListener(${socket.id})" type="button">Kick</button>`;
				
				let kickButton = document.createElement('button');
				kickButton.innerHTML = "Kick";
				kickButton.classList.add('kick-btn');
				kickButton.addEventListener('click', () => kickButtonListener(userSocketId));
				memberItem.appendChild(kickButton);
			}
			*/
			membersDiv.appendChild(memberItem); 
		}

		chatroomDiv.style.display = 'flex';
		roomControlsDiv.style.display = 'none';
	});

	socket.on('newcomer', (newcomerData) => {
		const username = newcomerData['username'];
		const userSocketId = newcomerData['socket-id'];
		const timestamp = newcomerData['timestamp'];
		const numMembers = newcomerData['num-members'];
		const adminSocketId = newcomerData['admin-socket-id'];

		numMembersText.innerHTML = `Members (${numMembers})`;

		let memberItem = document.createElement('li');
		memberItem.textContent = `${username} (${userSocketId})`;

		if(socket.id == adminSocketId){
			//memberItem.innerHTML += `<button class="kick-btn" onclick="kickButtonListener(${socket.id})" type="button">Kick</button>`;
			
			let kickButton = document.createElement('button');
			kickButton.innerHTML = "Kick";
			kickButton.classList.add('kick-btn');
			kickButton.addEventListener('click', () => kickButtonListener(userSocketId));
			memberItem.appendChild(kickButton);
		}

		membersDiv.appendChild(memberItem);

		addMessageBox({ 'username': '',
						'content': `${username} (${userSocketId}) has joined the chatroom.`,
						'timestamp': timestamp});
	});

	socket.on('join fail', () => {
		alert("The room could not be found. Please check the ID and password.");
	});

	socket.on('join admin', (adminJoinBundle) => {
		socket.emit('join room', adminJoinBundle);
	});

	socket.on('notify leave', (leaveBundle) => {
		const leavingUserSocketId = leaveBundle['socket-id'];
		const username = leaveBundle['username'];
		const timestamp = leaveBundle['timestamp'];
		const adminSocketId = leaveBundle['admin-socket-id'];
		const usersObject = leaveBundle['users'];
		const numMembers = Object.keys(usersObject).length;

		numMembersText.innerHTML = `Members (${numMembers})`;
		membersDiv.innerHTML = '';

		for(const userSocketId in usersObject){
			let memberItem = document.createElement('li');
			
			let adminPostfix = '';
			if(userSocketId == adminSocketId){
				adminPostfix = '(admin)';
			}

			memberItem.textContent = `${usersObject[userSocketId]} (${userSocketId}) ${adminPostfix}`;
			
			if(userSocketId != adminSocketId && socket.id == adminSocketId){
				let kickButton = document.createElement('button');
				kickButton.innerHTML = "Kick";
				kickButton.addEventListener('click', () => kickButtonListener(userSocketId));
				memberItem.appendChild(kickButton);
			}

			membersDiv.appendChild(memberItem);
		}

		addMessageBox({ 'username': '',
				'content': `${username} (${leavingUserSocketId}) has left the chatroom.`,
				'timestamp': timestamp});
	});

	socket.on('kick notify', () => {
		window.location.reload();
	});

	function kickButtonListener(kickSocketId){
		socket.emit('kick', kickSocketId);
	}

}
