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
	icon_url TEXT,
	description TEXT,
	invite_code TEXT UNIQUE NOT NULL,
	is_public BOOLEAN NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	owner_id UUID,

	CONSTRAINT fk_server_owner
	FOREIGN KEY (owner_id)
	REFERENCES users(id)
	ON DELETE SET NULL
);

CREATE TABLE server_members (
	server_id INTEGER NOT NULL,
	member_id UUID NOT NULL,
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
	name TEXT NOT NULL,
	type TEXT DEFAULT 'text',
	created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	server_id INTEGER NOT NULL,

	CONSTRAINT fk_channel_server
	FOREIGN KEY (server_id)
	REFERENCES servers(id)
	ON DELETE CASCADE,

	CONSTRAINT unique_channel_name_per_server 
	UNIQUE (server_id, name)
);

CREATE TABLE channel_messages (
	id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	message TEXT NOT NULL,
	channel_id INTEGER NOT NULL,
	sender_id UUID,
	sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
	sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

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

CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  jti VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_refresh_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_jti ON refresh_tokens(jti);
CREATE INDEX idx_channels_server_id ON channels(server_id);
CREATE INDEX idx_channel_messages_channel_id ON channel_messages(channel_id);
CREATE INDEX idx_direct_messages_conversation_id ON direct_messages(conversation_id);