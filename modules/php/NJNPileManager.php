<?php

class NJNPileManager extends APP_DbObject{
    public $parent;

    function __construct($parent) {
        $this->parent = $parent;
    }

    function getAllPiles($orderBy = 'ORDER BY location_on_pile'){ return $this->getPileCards(false, $orderBy); }
    function getPile($pileIndex, $orderBy = ''){ return $this->getPileCards($pileIndex, $orderBy); }

    private function getPileCards($pileIndex, $orderBy){ //$pileIndex = false brings all piles
        $bringSinglePiles = $pileIndex !== false;
        $pileIndexSQL = $bringSinglePiles ? "AND card_location_arg = $pileIndex" : '';

        $cards = $this->getObjectListFromDB( "SELECT card_id, suit, rank, card_location_arg, location_on_pile FROM cards WHERE card_location = 'pile' $pileIndexSQL $orderBy");

        if($bringSinglePiles)
            return $cards;

        $cardsByPileIndex = [];
        foreach($cards as $cardID => $cardData)
            $cardsByPileIndex[$cardData['card_location_arg']][] = $cardData;
        
        return $cardsByPileIndex;
    }

    function getPileQueueCount(){ return $this->getPileQueue(true)[0]['count']; }
    function getPileQueue($countOnly = false){ 
        $columns = $countOnly ? ' count(*) as count ' : ' card_id, suit, rank, card_location_arg as owner_id, location_on_pile as location_in_queue ';
        return $this->getObjectListFromDB( "SELECT $columns FROM cards WHERE card_location = 'pile_queue'".(!$countOnly ? 'ORDER BY location_in_queue' : '') ); 
    }

    function getPossiblePiles($playerID = false, $additionalCardsToCompare = []){
        if(!$playerID)
            $playerID = $this->parent->getActivePlayerId();

        $topCards = $this->getPileTopCards();
        $topCards = array_merge($topCards, $additionalCardsToCompare); //required to check for early end game
        $selectedCard = $this->parent->handManager->getPlayerSelectedCard($playerID);
        $weakSuit = (((int) $selectedCard['suit']) % SUIT_COUNT) + 1;

        $pileIndeces = [];
        foreach($topCards as $index => $cardData)
            if((int) $cardData['suit'] == $weakSuit)
                $pileIndeces[] = isset($cardData['pile_index']) ? (int) $cardData['pile_index'] : 'player_'.$playerID;

        if($pileIndeces)
            return ['pile_indices' => $pileIndeces, 'reason' => 'take'];

        $pileIndeces = [];
        for($i = 0; $i < PILE_COUNT; $i++)
            $pileIndeces[] = $i;

        return ['pile_indices' => $pileIndeces, 'reason' => 'place_under'];
    }

    function getPileTopCards(){
        return $this->getObjectListFromDB("SELECT c.card_location_arg AS pile_index, c.card_id, c.suit, c.rank FROM cards AS c JOIN ( SELECT card_location_arg, MAX(location_on_pile) AS max_location FROM cards WHERE card_location = 'pile' GROUP BY card_location_arg ) AS max_rows ON c.card_location_arg = max_rows.card_location_arg AND c.location_on_pile = max_rows.max_location WHERE c.card_location = 'pile' ORDER BY pile_index");
    }
}

?>