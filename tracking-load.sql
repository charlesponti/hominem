CREATE TABLE Items (
    item_id INT PRIMARY KEY AUTO_INCREMENT,
    item_type ENUM('restaurant', 'action', 'movie', 'tv_show', 'music', 'book', 'podcast', 'game', 'place', 'event', 'course', 'health', 'project') NOT NULL,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Added creation timestamp
);

CREATE TABLE Restaurants (
    restaurant_id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT UNIQUE NOT NULL,
    location VARCHAR(255) NULL,
    delivery_service VARCHAR(255) NULL,
    FOREIGN KEY (item_id) REFERENCES Items(item_id)
);

CREATE TABLE Music (
    music_id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT UNIQUE NOT NULL,
    artist VARCHAR(255) NOT NULL,
    album VARCHAR(255) NULL,
    FOREIGN KEY (item_id) REFERENCES Items(item_id)
);

CREATE TABLE TV_Shows (
    tv_show_id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT UNIQUE NOT NULL,
    platform VARCHAR(255) NULL,
    FOREIGN KEY (item_id) REFERENCES Items(item_id)
);

CREATE TABLE Movies (
    movie_id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT UNIQUE NOT NULL,
    FOREIGN KEY (item_id) REFERENCES Items(item_id)
);

CREATE TABLE Books (
    book_id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT UNIQUE NOT NULL,
    author VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    genre VARCHAR(255) NULL,
    rating INT NULL,
    status ENUM('reading', 'completed', 'to-read') NULL,
    FOREIGN KEY (item_id) REFERENCES Items(item_id)
);

CREATE TABLE Podcasts (
    podcast_id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT UNIQUE NOT NULL,
    podcast_name VARCHAR(255) NOT NULL,
    episode_title VARCHAR(255) NULL,
    hosts VARCHAR(255) NULL,
    date_listened DATE NULL, -- Separate date for listening
    FOREIGN KEY (item_id) REFERENCES Items(item_id)
);

CREATE TABLE Games (
    game_id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT UNIQUE NOT NULL,
    game_title VARCHAR(255) NOT NULL,
    platform VARCHAR(255) NULL,
    status ENUM('playing', 'completed', 'to-play') NULL,
    FOREIGN KEY (item_id) REFERENCES Items(item_id)
);

CREATE TABLE Places (
    place_id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT UNIQUE NOT NULL,
    place_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NULL,  -- Could also use latitude/longitude fields
    type VARCHAR(255) NULL,  -- e.g., restaurant, museum, park
    notes TEXT NULL,
    FOREIGN KEY (item_id) REFERENCES Items(item_id)
);

CREATE TABLE Events (
    event_id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT UNIQUE NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NULL,
    date DATE NULL,
    attendees TEXT NULL,  -- Could be a separate attendees table for more complex tracking
    type VARCHAR(255) NULL,  -- e.g., concert, conference
    FOREIGN KEY (item_id) REFERENCES Items(item_id)
);

CREATE TABLE Courses (
    course_id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT UNIQUE NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    institution VARCHAR(255) NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    status ENUM('in progress', 'completed', 'planned') NULL,
    FOREIGN KEY (item_id) REFERENCES Items(item_id)
);

CREATE TABLE Health (
    health_id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT UNIQUE NOT NULL,
    activity_type VARCHAR(255) NOT NULL,
    duration INT NULL,  -- In minutes or other relevant unit
    calories_burned INT NULL,
    notes TEXT NULL,
    FOREIGN KEY (item_id) REFERENCES Items(item_id)
);

CREATE TABLE Projects (
    project_id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT UNIQUE NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    status VARCHAR(255) NULL,  -- e.g., "in progress", "completed"
    due_date DATE NULL,
    notes TEXT NULL,
    FOREIGN KEY (item_id) REFERENCES Items(item_id)
);

-- Tags table and joining table for many-to-many relationship
CREATE TABLE Tags (
    tag_id INT PRIMARY KEY AUTO_INCREMENT,
    tag_name VARCHAR(255) UNIQUE NOT NULL  -- Ensure tag names are unique
);

CREATE TABLE ItemTags (
    item_id INT NOT NULL,
    tag_id INT NOT NULL,
    FOREIGN KEY (item_id) REFERENCES Items(item_id),
    FOREIGN KEY (tag_id) REFERENCES Tags(tag_id),
    PRIMARY KEY (item_id, tag_id) -- Composite key to prevent duplicate tag assignments to the same item
);

-- Restaurant
INSERT INTO Items (item_type, name, date) VALUES ('restaurant', 'Pho Cafe', '2025-01-31');
INSERT INTO Restaurants (item_id, location, delivery_service) VALUES (LAST_INSERT_ID(), 'Silver Lake', 'DoorDash');

INSERT INTO Items (item_type, name, date) VALUES ('restaurant', 'Agnes', '2025-02-01');
INSERT INTO Restaurants (item_id, location) VALUES (LAST_INSERT_ID(), 'Pasadena');

-- Action
INSERT INTO Items (item_type, name, date, notes) VALUES ('action', 'Begin working on RevRock', '2024-12-01', NULL);
INSERT INTO Actions (item_id) VALUES (LAST_INSERT_ID());

INSERT INTO Items (item_type, name, date, notes) VALUES ('action', 'Washed regular clothes', '2025-01-16', NULL);
INSERT INTO Actions (item_id) VALUES (LAST_INSERT_ID());

INSERT INTO Items (item_type, name, date, notes) VALUES ('action', 'Triaged `_dump` with ollama', '2025-01-25', NULL);
INSERT INTO Actions (item_id) VALUES (LAST_INSERT_ID());


-- Movie
INSERT INTO Items (item_type, name, date) VALUES ('movie', 'Inside Out', '2025-01-29');
INSERT INTO Movies (item_id, platform) VALUES (LAST_INSERT_ID(), 'Disney +');

INSERT INTO Items (item_type, name, date) VALUES ('movie', 'Inside Out 2', '2025-02-03');
INSERT INTO Movies (item_id, platform) VALUES (LAST_INSERT_ID(), 'Disney +');

-- TV Show
INSERT INTO Items (item_type, name, date) VALUES ('tv_show', 'Silo', '2025-01-06');
INSERT INTO TV_Shows (item_id, platform) VALUES (LAST_INSERT_ID(), 'Apple +');

-- Music
INSERT INTO Items (item_type, name, date) VALUES ('music', 'Juelz Santana - God Will''n', '2025-01-25');
INSERT INTO Music (item_id, artist, album) VALUES (LAST_INSERT_ID(), 'Juelz Santana', 'God Will''n');

INSERT INTO Items (item_type, name, date) VALUES ('music', 'Cam''ron - Come Home With Me', '2025-01-26');
INSERT INTO Music (item_id, artist) VALUES (LAST_INSERT_ID(), 'Cam''ron');

INSERT INTO Items (item_type, name, date) VALUES ('music', 'Jim Jones - On My Way to Church', '2025-01-27');
INSERT INTO Music (item_id, artist, album, release_date) VALUES (LAST_INSERT_ID(), 'Jim Jones', 'On My Way to Church'. "2004");
