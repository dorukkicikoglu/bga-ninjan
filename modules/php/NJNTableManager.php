<?php

class NJNTableManager extends APP_DbObject{
    function __construct($parent) {
        $this->parent = $parent;
    }

    function shuffleAndDealCards(){
        $this->parent->cardsDeck->shuffle('returned_to_box');

        $playerIDs = self::getObjectListFromDB("SELECT player_id FROM player", true);
        $end = 0;
        foreach($playerIDs as $index => $player_id){
            $start = $index * HAND_SIZE;
            $end = $start + HAND_SIZE - 1;

            self::DbQuery("UPDATE cards SET card_location = 'player', card_location_arg = $player_id WHERE card_location = 'returned_to_box' AND card_location_arg >= $start AND card_location_arg <= $end");
        }

        for($i = 0; $i < PILE_COUNT; $i++)
        	self::DbQuery("UPDATE cards SET card_location = 'pile', card_location_arg = $i, card_type_arg = 0, location_on_pile = 0 WHERE card_location = 'returned_to_box' AND card_location_arg = ".($end + $i + 1));
    }

    function sortRockPaperScissors($cards) {
        // Group cards by rank
        $cardsByRank = [];
        foreach ($cards as $key => $card) {
            $cardsByRank[(int) $card['rank']][$key] = $card;
        }

        // Sort ranks in descending order
        krsort($cardsByRank);

        // Sort each rank group by suit according to the rules
        foreach ($cardsByRank as $rank => $rankCards) {
            if (count($rankCards) === 3) {
                // If all three suits are present, sort by strict 1 > 2 > 3 order
                uasort($rankCards, function($a, $b) {
                    return (int) $a['suit'] - (int) $b['suit'];
                });
            } else {
                // If only two suits are present, apply Rock-Paper-Scissors rules
                uasort($rankCards, function($a, $b) {
                    // Handle the rock-paper-scissors tie-breaking logic
                    // 1 (rock) beats 3 (scissors), 2 (paper) beats 1 (rock), 3 (scissors) beats 2 (paper)
                    if (((int) $a['suit'] == 1 && (int) $b['suit'] == 2) || ((int) $a['suit'] == 2 && (int) $b['suit'] == 3) || ((int) $a['suit'] == 3 && (int) $b['suit'] == 1)) {
                        return -1;  // a wins
                    }
                    return 1; // b wins
                });
            }

            // Update the sorted rank group back to the main array
            $cardsByRank[$rank] = $rankCards;
        }

        // Flatten the sorted cards array and sort by rank (descending)
        $sortedCards = [];
        foreach ($cardsByRank as $rank => $rankCards) {
            foreach ($rankCards as $key => $card) {
                $sortedCards[$key] = $card;
            }
        }

        $sortedCards = array_values($sortedCards);

        return $sortedCards;
    }

    function getRemainingPlayerCardsCount(){ return (int) $this->getUniqueValueFromDB("SELECT count(*) FROM cards WHERE card_location = 'player'"); }
    function isLastCards(){ return $this->getRemainingPlayerCardsCount() <= $this->parent->getPlayersNumber(true); }
    function arePlayerCardsFinished(){ return (int) $this->getUniqueValueFromDB("SELECT EXISTS (SELECT 1 FROM cards WHERE card_location = 'player') AS exists_in_player") == 0; }
    function anyPilesTaken($playerID = false){ return (int) $this->getUniqueValueFromDB("SELECT EXISTS (SELECT 1 FROM cards WHERE card_location = 'scored'".($playerID ? " AND card_location_arg = $playerID" : "").") AS exists_scored_card") != 0; }
    function getPlayedCards(){ return $this->getDoubleKeyCollectionFromDB("SELECT suit, rank, card_id FROM cards WHERE card_location IN('pile', 'pile_queue', 'scored')", false); }
}

?>