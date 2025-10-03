CREATE TABLE users (
	id UUID DEFAULT uuidv7() PRIMARY KEY,
	email TEXT UNIQUE NOT NULL,
	username TEXT UNIQUE NOT NULL,
	password_hash TEXT NOT NULL,
	avatar_url TEXT,
	status TEXT DEFAULT 'offline',
	created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE servers (
	id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	name TEXT UNIQUE NOT NULL,
	invite_code TEXT UNIQUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	owner_id UUID,

	CONSTRAINT fk_server_owner
	FOREIGN KEY (owner_id)
	REFERENCES users(id)
	ON DELETE SET NULL
);

CREATE TABLE server_members (
	server_id INTEGER NOT NULL,
	member_id uuid NOT NULL,
	role TEXT DEFAULT 'member',
	joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

	PRIMARY KEY (server_id, member_id),

	CONSTRAINT fk_member_server
	FOREIGN KEY (server_id)
	REFERENCES servers(id)
	ON DELETE CASCADE,

	CONSTRAINT fk_member_user
	FOREIGN KEY (member_id)
	REFERENCES users(id)
	ON DELETE CASCADE
);

CREATE TABLE channels (
	id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	name TEXT UNIQUE NOT NULL,
	type TEXT DEFAULT 'text',
	created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	server_id INTEGER NOT NULL,

	CONSTRAINT fk_channel_server
	FOREIGN KEY (server_id)
	REFERENCES servers(id)
	ON DELETE CASCADE
);

CREATE TABLE channel_messages (
	id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	message TEXT NOT NULL,
	sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	channel_id INTEGER NOT NULL,
	sender_id UUID,

	CONSTRAINT fk_cm_channel
	FOREIGN KEY (channel_id)
	REFERENCES channels(id)
	ON DELETE CASCADE,

	CONSTRAINT fk_cm_user
	FOREIGN KEY (sender_id)
	REFERENCES users(id)
	ON DELETE SET NULL
);

CREATE TABLE conversations (
	id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	user_one_id UUID,
	user_two_id UUID,
	created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	user_one_last_read TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
	user_two_last_read TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT unique_conversation UNIQUE (user_one_id, user_two_id),
	CONSTRAINT check_user_order CHECK (user_one_id < user_two_id),

	CONSTRAINT fk_user_one
	FOREIGN KEY (user_one_id)
	REFERENCES users(id)
	ON DELETE SET NULL,

	CONSTRAINT fk_user_two
	FOREIGN KEY (user_two_id)
	REFERENCES users(id)
	ON DELETE SET NULL
);

CREATE TABLE direct_messages (
	id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	message TEXT NOT NULL,
	conversation_id INTEGER NOT NULL,
	sender_id UUID,
	created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT fk_dm_conversation
	FOREIGN KEY (conversation_id)
	REFERENCES conversations(id)
	ON DELETE CASCADE,

	CONSTRAINT fk_dm_user
	FOREIGN KEY (sender_id)
	REFERENCES users(id)
	ON DELETE SET NULL
);

CREATE TABLE channel_read_states (
	user_id UUID NOT NULL,
	channel_id INTEGER NOT NULL,
	last_read_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

	PRIMARY KEY (user_id, channel_id),
	
	CONSTRAINT fk_read_user 
	FOREIGN KEY (user_id) 
	REFERENCES users(id) 
	ON DELETE CASCADE,
	
	CONSTRAINT fk_read_channel 
	FOREIGN KEY (channel_id) 
	REFERENCES channels(id) 
	ON DELETE CASCADE
);