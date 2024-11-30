<?php

class NJNHandManager extends APP_DbObject{
    function __construct($parent) {
        $this->parent = $parent;
    }
    
    function getPlayerHand($playerID) { 
        $orderBy = $this->getUniqueValueFromDB("SELECT sort_cards_by FROM player WHERE player_id = $playerID");

        if($orderBy == 'suit')
            $orderBy = 'suit, CAST(rank AS SIGNED) DESC';
        else $orderBy = 'CAST(rank AS SIGNED) DESC, suit';

    	return $this->getObjectListFromDB( "SELECT card_id, suit, rank FROM cards WHERE card_location = 'player' AND card_location_arg = '$playerID' ORDER BY $orderBy" );
    }

    function getPlayerSelectedCard($playerID){ return $this->getObjectFromDB( "SELECT player.selected_card_id as card_id, cards.suit, cards.rank FROM player INNER JOIN cards ON cards.card_id = player.selected_card_id WHERE player_id = $playerID" ); }

    function updatePlayerScore($playerID){
        $score = (int) $this->getUniqueValueFromDB("SELECT SUM(rank) FROM cards WHERE card_location = 'scored' AND card_location_arg = $playerID");
        $this->DbQuery( "UPDATE player SET player_score = $score WHERE player_id = $playerID" );

        return $score;
    }
}

?>