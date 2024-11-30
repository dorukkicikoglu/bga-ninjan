
-- ------
-- BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
-- Ninjan implementation : © Doruk Kicikoglu <doruk.kicikoglu@gmail.com>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-- -----

-- dbmodel.sql

-- This is the file where you are describing the database schema of your game
-- Basically, you just have to export from PhpMyAdmin your table structure and copy/paste
-- this export here.
-- Note that the database itself and the standard tables ("global", "stats", "gamelog" and "player") are
-- already created and must not be created here

-- Note: The database schema is created from this file when the game starts. If you modify this file,
--       you have to restart a game to see your changes in database.

-- Example 1: create a standard "card" table to be used with the "Deck" tools (see example game "hearts"):

-- CREATE TABLE IF NOT EXISTS `card` (
--   `card_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
--   `card_type` varchar(16) NOT NULL,
--   `card_type_arg` int(11) NOT NULL,
--   `card_location` varchar(16) NOT NULL,
--   `card_location_arg` int(11) NOT NULL,
--   PRIMARY KEY (`card_id`)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;


-- Example 2: add a custom field to the standard "player" table
-- ALTER TABLE `player` ADD `player_my_custom_field` INT UNSIGNED NOT NULL DEFAULT '0';

CREATE TABLE IF NOT EXISTS `cards` (
  `card_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `card_type` varchar(16) NOT NULL,
  `card_type_arg` int(11) NOT NULL,
  `card_location` ENUM('player', 'pile', 'pile_queue', 'scored', 'zombified', 'returned_to_box') NOT NULL,
  `card_location_arg` int(11) NOT NULL,
  `location_on_pile` TINYINT UNSIGNED NULL,
  `suit` TINYINT NOT NULL,
  `rank` TINYINT NOT NULL,
  PRIMARY KEY (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

ALTER TABLE `player` 
ADD `sort_cards_by` ENUM('suit', 'rank') NOT NULL DEFAULT 'suit' AFTER `player_state`,
ADD `selected_card_id` INT(2) UNSIGNED DEFAULT NULL AFTER `sort_cards_by`,
ADD `made_card_selection_this_round` ENUM('true','false') NOT NULL DEFAULT 'false',
ADD `pre_selected_card_id` INT(2) UNSIGNED DEFAULT NULL AFTER `made_card_selection_this_round`;
