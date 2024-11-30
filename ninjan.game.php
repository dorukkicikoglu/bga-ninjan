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
 * ninjan.game.php
 *
 * This is the main file for your game logic.
 *
 * In this PHP file, you are going to defines the rules of the game.
 */
declare(strict_types=1);

require_once(APP_GAMEMODULE_PATH . "module/table/table.game.php");

require_once ('modules/php/NJNGlobalsManager.php');
require_once ('modules/php/NJNHandManager.php');
require_once ('modules/php/NJNTableManager.php');
require_once ('modules/php/NJNPileManager.php');

class Ninjan extends Table
{
    /**
     * Your global variables labels:
     *
     * Here, you can assign labels to global variables you are using for this game. You can use any number of global
     * variables with IDs between 10 and 99. If your game has options (variants), you also have to associate here a
     * label to the corresponding ID in `gameoptions.inc.php`.
     *
     * NOTE: afterward, you can get/set the global variables with `getGameStateValue`, `setGameStateInitialValue` or
     * `setGameStateValue` functions.
     */
    public function __construct()
    {
        parent::__construct();

        $this->globalsManager = new NJNGlobalsManager($this, 
            $globalKeys = array(),
            $userPrefs = array(
                'auto_take_best_pile' => 100,
                'card_preselection' => 101,
                'flying_characters' => 110,
            )
        );
        
        $this->cardsDeck = self::getNew("module.common.deck");
        $this->cardsDeck->init("cards");

        $this->handManager = new NJNHandManager($this);
        $this->tableManager = new NJNTableManager($this);
        $this->pileManager = new NJNPileManager($this);
    }

    /**
     * Player actions
     */
    
    public function actSelectCard($cardID, $autoPlay_playerID = false, $preSelection = false): void
    {
        if(!$autoPlay_playerID){
            if(!$preSelection)
                $this->checkAction('actSelectCard');
            else $this->gamestate->checkPossibleAction('actSelectCardPreSelection');
        }

        $currentPlayerID = $autoPlay_playerID ? $autoPlay_playerID : (int) $this->getCurrentPlayerId();

        $cardBelongsToMe = $this->getUniqueValueFromDB("SELECT card_id FROM cards WHERE card_id = $cardID AND card_location = 'player' AND card_location_arg = $currentPlayerID");
        if(!$cardBelongsToMe)
            throw new BgaUserException(_("Invalid card selected"));

        $this->zombifyCardsIfNeeded();

        if(!$preSelection){
            $madeSelectionThisRound = $this->getUniqueValueFromDB("SELECT made_card_selection_this_round FROM player WHERE player_id = $currentPlayerID");

            if($madeSelectionThisRound == 'false')
                $this->giveExtraTime($currentPlayerID);
            else $this->not_a_move_notification = true; // note: do not increase the move counter
        
            self::DbQuery("UPDATE player SET selected_card_id = $cardID, made_card_selection_this_round = 'true' WHERE player_id = $currentPlayerID");
        } else self::DbQuery("UPDATE player SET pre_selected_card_id = $cardID WHERE player_id = $currentPlayerID");

        $this->notifyPlayer($currentPlayerID, 'notif_cardSelectionConfirmed', '', ['confirmed_selected_card_id' => $cardID, 'pre_selection' => $preSelection]);
        
        if(!$preSelection)
            $this->gamestate->setPlayerNonMultiactive($currentPlayerID, 'displaySelectedCards');
    }

    public function actRevertCardSelection($preSelection = false): void
    {
        $this->gamestate->checkPossibleAction(!$preSelection ? 'actRevertCardSelection' : 'actRevertCardSelectionPreSelection');

        $currentPlayerID = (int) $this->getCurrentPlayerId();

        self::DbQuery("UPDATE player SET ".(!$preSelection ? 'selected_card_id' : 'pre_selected_card_id')." = NULL WHERE player_id = $currentPlayerID");

        if(!$preSelection)
            $this->gamestate->setPlayersMultiactive([$currentPlayerID], '');

        $this->not_a_move_notification = true; // note: do not increase the move counter
        $this->notifyPlayer($currentPlayerID, 'notif_cardSelectionReverted', '', ['pre_selection' => $preSelection]);
    }

    public function actSelectCardPreSelection($cardID): void { $this ->actSelectCard($cardID, false, true); }
    public function actRevertCardSelectionPreSelection(): void { $this->actRevertCardSelection(true); }

    public function actTakePile($pileIndex, $autoPlay = false): void
    {
        $this->gamestate->checkPossibleAction('actTakePile');
        
        $possiblePiles = $this->pileManager->getPossiblePiles();

        if(!in_array($pileIndex, $possiblePiles['pile_indices']))
            throw new BgaUserException(_("Invalid pile selected"));

        $activePlayerID = (int) $this->getActivePlayerId();
        $selectedCard = $this->handManager->getPlayerSelectedCard($activePlayerID);

        $selectedCardID = $selectedCard['card_id'];
        $pileCards = $this->pileManager->getPile($pileIndex, ' ORDER BY rank DESC, suit');
        $newScore = 'no_change';

        if($possiblePiles['reason'] == 'take'){
            $firstTakenPileOfGame = !$this->tableManager->anyPilesTaken();
            $firstTakenPileByPlayer = !$this->tableManager->anyPilesTaken($playerID = $activePlayerID);

            self::DbQuery("UPDATE cards SET card_location = 'scored', card_location_arg = $activePlayerID WHERE card_location = 'pile' AND card_location_arg = $pileIndex");
            $newScore = $this->handManager->updatePlayerScore($activePlayerID);
            self::DbQuery("UPDATE cards SET card_location = 'pile', card_location_arg = $pileIndex, location_on_pile = 0 WHERE card_id = $selectedCardID");

            $this->incStat(count($pileCards), 'cards_taken', $activePlayerID);
            $this->incStat(1, 'piles_taken', $activePlayerID);

            $pileSum = array_sum(array_map(function($card) {return $card['rank']; }, $pileCards));

            if($firstTakenPileOfGame){ //first pile taken, set highest and lowest stats automatically because BGA stats doesnt accept INF values
                $this->setStat($pileSum, 'highest_point_from_pile');
                $this->setStat($pileSum, 'lowest_point_from_pile');
            } else {
                $this->setStat(max($pileSum, $this->getStat('highest_point_from_pile')), 'highest_point_from_pile');
                $this->setStat(min($pileSum, $this->getStat('lowest_point_from_pile')), 'lowest_point_from_pile');
            }

            if($firstTakenPileByPlayer){
                $this->setStat($pileSum, 'highest_point_from_pile', $activePlayerID);
                $this->setStat($pileSum, 'lowest_point_from_pile', $activePlayerID);
            } else {
                $this->setStat(max($pileSum, $this->getStat('highest_point_from_pile', $activePlayerID)), 'highest_point_from_pile', $activePlayerID);
                $this->setStat(min($pileSum, $this->getStat('lowest_point_from_pile', $activePlayerID)), 'lowest_point_from_pile', $activePlayerID);
            }
        } else {
            $newLocationOnPile = 1 + (int) $this->getUniqueValueFromDB("SELECT IFNULL(MAX(location_on_pile), 0) FROM cards WHERE card_location = 'pile' AND card_location_arg = $pileIndex");
            $this->setStat(max($newLocationOnPile + 1, $this->getStat('max_card_on_a_pile')), 'max_card_on_a_pile');
            
            self::DbQuery("UPDATE cards SET card_location = 'pile', card_location_arg = $pileIndex, location_on_pile = $newLocationOnPile WHERE card_id = $selectedCardID");
        }

        self::DbQuery("UPDATE player SET selected_card_id = NULL WHERE player_id = $activePlayerID");

        if(!$autoPlay)
            $this->giveExtraTime($activePlayerID);

        $isTaking = $possiblePiles['reason'] == 'take';
        $cardIconsData = $isTaking ? $pileCards : [$selectedCard];
        
        $cardIconStr = []; //needed for the game replay page
        foreach($cardIconsData as $cardIndex => $cardData)
            $cardIconStr[] = $this->getCardLogHTML($cardData);
        $cardIconStr = implode(', ', $cardIconStr);

        $this->notifyAllPlayers("notif_animatePileTaken", $isTaking ? '${player_name} ${ARROW_LEFT} ${CARD_ICONS_STR}' : '${player_name} ${ARROW_DOWN} ${CARD_ICONS_STR}${PILE_NUM}',
            array( 
                'LOG_CLASS' => 'take-pile-log',
                'preserve' => ['LOG_CLASS'],
                'player_id' => $activePlayerID,
                'player_name' => $this->getPlayerNameById($activePlayerID),
                'ARROW_LEFT' => '⇐',
                'ARROW_DOWN' => '↓',
                'CARD_ICONS_STR' => $cardIconStr, //needed for log icons
                'CARD_ICONS' => $cardIconsData, //needed for log icons
                'PILE_NUM' => ' (<span style="position: absolute;opacity: 0;width: 0px;height: 0px;">&nbsp;PILE</span><i class="fa fa-clone" style="transform: scaleX(-1);">&nbsp;</i> #'.($pileIndex + 1).' )',
                'card_icons_data' => $cardIconsData,
                'pile_index' => $pileIndex,
                'selected_card_data' => $selectedCard,
                'reason' => $possiblePiles['reason'],
                'new_score' => $newScore,
                'autoPlay' => $autoPlay
            ) 
        );

        $this->gamestate->nextState('nextPlayer');
    }

//////////////////////////////////////////////////////////////////////////////
//////////// Game state arguments
////////////
    
    public function argSelectCard(): array
    {
        $selectedCardIDs = $this->getCollectionFromDb("SELECT player_id, selected_card_id FROM player", true);
        $privateData = [];
        foreach($selectedCardIDs as $player_id => $selectedCardID)
            $privateData[$player_id]['selected_card_id'] = $selectedCardID;

        return ['_private' => $privateData];
    }

    function argTakePile(){ 
        return [
            'textPlayerID' => $this->getActivePlayerId(),
            'possible_piles' => $this->pileManager->getPossiblePiles()
        ]; 
    }

    /**
     * Compute and return the current game progression.
     *
     * The number returned must be an integer between 0 and 100.
     *
     * This method is called each time we are in a game state with the "updateGameProgression" property set to true.
     *
     * @return int
     * @see ./states.inc.php
     */
    public function getGameProgression()
    {
        $playerCount = $this->getPlayersNumber(true);
        $playerCardsCount = $this->tableManager->getRemainingPlayerCardsCount();
        $totalCardsCount = HAND_SIZE * $playerCount;
        $progression = ($totalCardsCount - $playerCardsCount) / $totalCardsCount;

        if($this->gamestate->state()['name'] == 'takePile'){
            $pileQueueCount = $this->pileManager->getPileQueueCount();
            if($pileQueueCount > 0){
                $pileQueueProgression = ($playerCount - $pileQueueCount) / $playerCount;
                $progression += ($pileQueueProgression - 1) / (HAND_SIZE * 2);
            }
        }
 
        return (int) ($progression * 100);
    }

    /**
     * Game state action, example content.
     *
     * The action method of state `nextPlayer` is called everytime the current game state is set to `nextPlayer`.
     */

    public function stSelectCard(): void {
        $preSelectedCards = $this->getCollectionFromDb("SELECT player_id, pre_selected_card_id FROM `player` WHERE pre_selected_card_id IS NOT NULL;", true);

        self::DbQuery("UPDATE player SET selected_card_id = NULL, pre_selected_card_id = NULL, made_card_selection_this_round = 'false'");
        $this->gamestate->setAllPlayersMultiactive();

        if($this->tableManager->isLastCards()){ // auto-play last cards of hands
            $playerCards = $this->getObjectListFromDB( "SELECT card_id, card_location_arg as player_id FROM cards WHERE card_location = 'player'" );
            foreach($playerCards as $index => $row)
                $this->actSelectCard($row['card_id'], $row['player_id']);

            return;
        }

        foreach($preSelectedCards as $playerID => $cardID)
            $this->actSelectCard($cardID, $playerID);
    }

    public function stDisplaySelectedCards(): void {
        $selectedCards = self::getCollectionFromDb("SELECT cards.card_id as card_id, suit, rank, player.player_zombie as is_zombie FROM player INNER JOIN cards ON cards.card_id = player.selected_card_id AND cards.card_location_arg = player.player_id");
        $sortedCardIDs = $this->tableManager->sortRockPaperScissors($selectedCards);

        foreach ($sortedCardIDs as $index => $cardData) {
            $cardData['card_location_arg'] = $index;
            self::DbQuery("UPDATE cards SET card_location = 'pile_queue', location_on_pile = $index WHERE card_id = ".$cardData['card_id']);
        }

        $pileQueue = $this->pileManager->getPileQueue();

        foreach($pileQueue as $index => $cardData){
            $this->incStat(($index + 1) / HAND_SIZE, 'avg_ranking_revealed_cards', $cardData['owner_id']);
            $this->incStat(($index + 1) / (HAND_SIZE * $this->getPlayersNumber()), 'avg_ranking_revealed_cards_divide_num_players', $cardData['owner_id']);
        }

        $cardsDataStr = []; //needed for the game replay page
        foreach($pileQueue as $cardIndex => $cardData)
            $cardsDataStr[] = $this->getPlayerNameById($cardData['owner_id']).' → '.$this->getCardLogHTML($cardData);
        $cardsDataStr = implode(', ', $cardsDataStr);

        $this->notifyAllPlayers('notif_animateSelectedCards', '${REVEALED_CARDS_DATA_STR}', array(
            'LOG_CLASS' => 'selected-cards-log',
            'preserve' => ['LOG_CLASS'],
            'REVEALED_CARDS_DATA' => $pileQueue,
            'REVEALED_CARDS_DATA_STR' => $cardsDataStr,
            'pile_queue_data' => $pileQueue, 
            'is_final_round' => $this->tableManager->arePlayerCardsFinished(), 
            'auto_play' => $this->tableManager->isLastCards()
        ));
        $this->gamestate->nextState('nextPlayer');
    }

    public function stTakePile(): void {
        $possiblePiles = $this->pileManager->getPossiblePiles();
        $activePlayerID = $this->getActivePlayerId();

        if($possiblePiles['reason'] == 'take'){
            if(count($possiblePiles['pile_indices']) == 1)
                $this->actTakePile($possiblePiles['pile_indices'][0], true);
            else if($this->globalsManager->getPref('auto_take_best_pile', $activePlayerID) == AUTO_TAKE_BEST_PILE_ON){
                $bestPileScore = -INF;
                $bestPileIndex = false;
                foreach($possiblePiles['pile_indices'] as $index => $pileIndex){
                    $pileSum = (int) $this->getUniqueValueFromDB("SELECT SUM(rank) FROM cards WHERE card_location = 'pile' AND card_location_arg = $pileIndex");
                    if($pileSum > $bestPileScore){
                        $bestPileScore = $pileSum;
                        $bestPileIndex = $pileIndex;
                    }
                }
                $this->actTakePile($bestPileIndex, true);
            }
        }

    }

    public function stNextPlayer(): void {
        $pileQueue = $this->pileManager->getPileQueue();

        if($pileQueue){
            if($this->shouldEndGameEarly($pileQueue)){
                $this->notifyAllPlayers("notif_endingGameNoCardCanBeTaken", clienttranslate('No more cards can be taken'), ['LOG_CLASS' => 'no-more-cards-log', 'preserve' => ['LOG_CLASS']]);

                $this->gamestate->nextState('gameEnd');
                return;
            }

            $this->gamestate->changeActivePlayer($pileQueue[0]['owner_id']);
            $this->gamestate->nextState('takePile');            
            return;
        }

        if(!$this->tableManager->arePlayerCardsFinished()){
            $this->gamestate->nextState('selectCard');
            return;
        }

        $this->gamestate->nextState('gameEnd');
    }

    /**
     * Migrate database.
     *
     * You don't have to care about this until your game has been published on BGA. Once your game is on BGA, this
     * method is called everytime the system detects a game running with your old database scheme. In this case, if you
     * change your database scheme, you just have to apply the needed changes in order to update the game database and
     * allow the game to continue to run with your new version.
     *
     * @param int $from_version
     * @return void
     */
    public function upgradeTableDb($from_version)
    {
//       if ($from_version <= 1404301345)
//       {
//            // ! important ! Use DBPREFIX_<table_name> for all tables
//
//            $sql = "ALTER TABLE DBPREFIX_xxxxxxx ....";
//            $this->applyDbUpgradeToAllDB( $sql );
//       }
//
//       if ($from_version <= 1405061421)
//       {
//            // ! important ! Use DBPREFIX_<table_name> for all tables
//
//            $sql = "CREATE TABLE DBPREFIX_xxxxxxx ....";
//            $this->applyDbUpgradeToAllDB( $sql );
//       }

        // $from_version is the current version of this game database, in numerical form.
        // For example, if the game was running with a release of your game named "140430-1345",
        // $from_version is equal to 1404301345
 
        if($from_version <= 2412011832) //to do: added on 2-12-2024
        {
            // ! important ! Use DBPREFIX_<table_name> for all tables

            $sql = "ALTER TABLE DBPREFIX_player ADD pre_selected_card_id INT NULL DEFAULT NULL;";
            self::applyDbUpgradeToAllDB($sql);
        }
    }

    /*
     * Gather all information about current game situation (visible by the current player).
     *
     * The method is called each time the game interface is displayed to a player, i.e.:
     *
     * - when the game starts
     * - when a player refreshes the game page (F5)
     */
    protected function getAllDatas()
    {
        $result = [];
        $result['version'] = intval($this->gamestate->table_globals[300]);

        // WARNING: We must only return information visible by the current player.
        $current_player_id = (int) $this->getCurrentPlayerId();

        // Get information about players.
        // NOTE: you can retrieve some extra field you added for "player" table in `dbmodel.sql` if you need it.
        $result["players"] = $this->getCollectionFromDb("SELECT player_id, player_no, player_score score FROM player");

        $result['pilesData'] = $this->pileManager->getAllPiles();
        $result['pileQueueData'] = $this->pileManager->getPileQueue();
        
        $myPlayerData = $this->getObjectFromDB( "SELECT sort_cards_by, COALESCE(pre_selected_card_id, selected_card_id) as selected_card_id FROM player WHERE player_id = $current_player_id" );
        if($myPlayerData){
            $result['my_hand'] = $this->handManager->getPlayerHand($current_player_id);
            $result['sort_cards_by'] = $myPlayerData['sort_cards_by'];

            $result['selectedCardID'] = $myPlayerData['selected_card_id'];
        }

        $result['played_cards'] = $this->tableManager->getPlayedCards();
        $result['pref_names'] = $this->globalsManager->userPrefs;

        return $result;
    }

    /**
     * Returns the game name.
     *
     * IMPORTANT: Please do not modify.
     */
    protected function getGameName()
    {
        return "ninjan";
    }

    /**
     * This method is called only once, when a new game is launched. In this method, you must setup the game
     *  according to the game rules, so that the game is ready to be played.
     */
    protected function setupNewGame($players, $options = [])
    {
        // Set the colors of the players with HTML color code. The default below is red/green/blue/orange/brown. The
        // number of colors defined here must correspond to the maximum number of players allowed for the gams.
        $gameinfos = $this->getGameinfos();
        $default_colors = $gameinfos['player_colors'];

        foreach ($players as $player_id => $player) {
            // Now you can access both $player_id and $player array
            $query_values[] = vsprintf("('%s', '%s', '%s', '%s', '%s')", [
                $player_id,
                array_shift($default_colors),
                $player["player_canal"],
                addslashes($player["player_name"]),
                addslashes($player["player_avatar"]),
            ]);
        }

        // Create players based on generic information.
        //
        // NOTE: You can add extra field on player table in the database (see dbmodel.sql) and initialize
        // additional fields directly here.
        static::DbQuery(
            sprintf(
                "INSERT INTO player (player_id, player_color, player_canal, player_name, player_avatar) VALUES %s",
                implode(",", $query_values)
            )
        );

        $this->reattributeColorsBasedOnPreferences($players, $gameinfos["player_colors"]);
        $this->reloadPlayersBasicInfos();

        // Init game statistics.
        self::initStat("table", "highest_point_from_pile", 0);
        self::initStat("table", "lowest_point_from_pile", 0);
        self::initStat("table", "max_card_on_a_pile", 1);

        self::initStat("player", "highest_point_from_pile", 0);
        self::initStat("player", "lowest_point_from_pile", 0);
        self::initStat("player", "cards_taken", 0);
        self::initStat("player", "piles_taken", 0);
        self::initStat("player", "avg_ranking_revealed_cards", 0);
        self::initStat("player", "avg_ranking_revealed_cards_divide_num_players", 0);

        //create cards Deck object
        $cardRows = array();
        for($i = 1; $i <= SUIT_COUNT; $i++){
            for($j = LOWEST_RANK; $j <= HIGHEST_RANK; $j++){
                if($j == 0)
                    continue;
                $cardRows[] = "(NULL, 'card', '0', 'returned_to_box', '0', '$i', '$j')";
            }
        }
        self::DbQuery("INSERT INTO cards (card_id, card_type, card_type_arg, card_location, card_location_arg, suit, rank) VALUES ".implode(',', $cardRows)); 

        $this->tableManager->shuffleAndDealCards();
    }

//////////////////////////////////////////////////////////////////////////////
//////////// Utility functions
////////////    

    function setSortCardsBy($isSuit){
        $current_player_id = $this->getCurrentPlayerId();
        $sortBy = $isSuit ? 'suit' : 'rank';

        self::DbQuery("UPDATE player SET sort_cards_by = '$sortBy' WHERE player_id = $current_player_id");
    }

    function getPlayersNumber($noZombies = false) {
        if ($noZombies)
            return (int) $this->getUniqueValueFromDB("SELECT count(*) as count FROM player WHERE player_zombie = 0");
        return parent::getPlayersNumber();
    }

    function zombifyCardsIfNeeded(){
        $zombiePlayers = $this->getCollectionFromDb("SELECT player_id FROM player WHERE player_zombie = 1");

        foreach($zombiePlayers as $zombiePlayerID => $row){
            self::DbQuery("UPDATE cards SET card_location = 'zombified' WHERE card_location_arg = $zombiePlayerID");
            self::DbQuery("UPDATE player SET selected_card_id = NULL WHERE player_id = $zombiePlayerID");
        }
    }

    function shouldEndGameEarly($pileQueue){
        if($this->tableManager->getRemainingPlayerCardsCount() > 0)
            return false;

        $cardsToCompare = [];
        foreach($pileQueue as $queueIndex => $queueCard){
            if($this->pileManager->getPossiblePiles($queueCard['owner_id'], $cardsToCompare)['reason'] == 'take')
                return false;
            
            $cardsToCompare[] = $queueCard;
        }
        return true;
    }

    function getCardLogHTML($cardData){
        $suitData = SUIT_DATA[(int) $cardData['suit']];
        return '<span style="color:#'.$suitData['colorCode'].';">'.$cardData['rank'].'&nbsp;<span style="position: absolute;opacity: 0;width: 0px;height: 0px;">'.$suitData['name'].'</span>'.$suitData['font-awesome'].'</span>';
    }

//////////////////////////////////////////////////////////////////////////////
//////////// Debug functions
////////////

    function message($txt, $desc = '', $color = 'blue')
    {
        if ($this->getBgaEnvironment() != "studio")
            return;

        if (is_array($txt))
            $txt = json_encode($txt);

        if($desc != '')
            $txt .= "   ".json_encode($desc);

        self::trace("Logging: <span style='color: $color;'>$txt</span>");
        self::notifyAllPlayers('plop',"<textarea style='height: 104px; width: 230px;color:$color'>$txt</textarea>",array());
    }

    public function loadBugReportSQL(int $reportId, array $studioPlayers): void {
        $prodPlayers = $this->getObjectListFromDb('SELECT player_id FROM player', true);
        if (count($prodPlayers) != count($studioPlayers))
            throw new BgaVisibleSystemException("Incorrect player count (bug report has $prodCount players, studio table has $studioCount players)");
        
        // Change for your game
        // We are setting the current state to match the start of a player's turn if it's already game over
        $sql = ['UPDATE global SET global_value=10 WHERE global_id=1 AND global_value=99'];
        foreach ($prodPlayers as $index => $prodId) {
            $studioPlayer = $studioPlayers[$index];

            // All games can keep this SQL
            $sql[] = "UPDATE player SET player_id=$studioPlayer WHERE player_id=$prodId";
            $sql[] = "UPDATE global SET global_value=$studioPlayer WHERE global_value=$prodId";
            $sql[] = "UPDATE stats SET stats_player_id=$studioPlayer WHERE stats_player_id=$prodId";

            // Add game-specific SQL update the tables for your game
            $sql[] = "UPDATE cards SET card_location_arg=$studioPlayer WHERE card_location_arg = $prodId";
        }
  
        foreach ($sql as $q) {
            $this->DbQuery($q);
        }
        
        $this->reloadPlayersBasicInfos();
    }

    /**
     * This method is called each time it is the turn of a player who has quit the game (= "zombie" player).
     * You can do whatever you want in order to make sure the turn of this player ends appropriately
     * (ex: pass).
     *
     * Important: your zombie code will be called when the player leaves the game. This action is triggered
     * from the main site and propagated to the gameserver from a server, not from a browser.
     * As a consequence, there is no current player associated to this action. In your zombieTurn function,
     * you must _never_ use `getCurrentPlayerId()` or `getCurrentPlayerName()`, otherwise it will fail with a
     * "Not logged" error message.
     *
     * @param array{ type: string, name: string } $state
     * @param int $active_player
     * @return void
     * @throws feException if the zombie mode is not supported at this game state.
     */
    protected function zombieTurn(array $state, int $active_player): void
    {
        $state_name = $state["name"];

        $selectedCardID = $this->getUniqueValueFromDB("SELECT selected_card_id FROM player WHERE player_id = $active_player");
        $this->zombifyCardsIfNeeded();

        if ($state["type"] === "activeplayer") {
            switch ($state_name) {
                case 'takePile':
                    if($selectedCardID)
                        $this->notifyAllPlayers("notif_animatePileTaken", '',
                            array( 
                                'player_id' => $active_player,
                                'pile_index' => 'zombie',
                                'selected_card_data' => ['card_id' => $selectedCardID],
                                'reason' => 'zombie',
                                'autoPlay' => true
                            ) 
                        );
                    $this->gamestate->nextState("zombiePass");
                    break;
                default:
                    $this->gamestate->nextState("zombiePass");
                    break;
            }

            return;
        }

        // Make sure player is in a non-blocking status for role turn.
        if ($state["type"] === "multipleactiveplayer") {
            $this->gamestate->setPlayerNonMultiactive($active_player, $state_name == 'selectCard' ? 'displaySelectedCards' : '');
            return;
        }

        throw new feException("Zombie mode not supported at this game state: \"{$state_name}\".");
    }
}
