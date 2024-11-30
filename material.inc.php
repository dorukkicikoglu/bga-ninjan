<?php
/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * Ninjan implementation : © Doruk Kicikoglu <doruk.kicikoglu@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * material.inc.php
 *
 * Ninjan game material description
 *
 * Here, you can describe the material of your game with PHP variables.
 *
 * This file is loaded in your game logic class constructor, ie these variables
 * are available everywhere in your game logic code.
 *
 */

if (!defined('SUIT_COUNT')) { // guard since this included multiple times
    define("SUIT_COUNT", 3);
    define("HIGHEST_RANK", 10);
    define("LOWEST_RANK", -6);
    define("HAND_SIZE", 9);
    define("PILE_COUNT", 3);

    define("SUIT_DATA", [
        1 => ['name' => 'ROCK', 'colorCode' => 'dc4e3a', 'font-awesome' => '<i class="fa fa-hand-rock-o"></i>'],
        2 => ['name' => 'PAPER', 'colorCode' => '0ba1c4', 'font-awesome' => '<i class="fa fa-hand-paper-o"></i>'],
        3 => ['name' => 'SCISSORS', 'colorCode' => '7b9d26', 'font-awesome' => '<i class="fa fa-hand-scissors-o"></i>']
    ]);

    define("AUTO_TAKE_BEST_PILE_ON", 1);
}
