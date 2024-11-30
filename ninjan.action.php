<?php
/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * Ninjan implementation : © Doruk Kicikoglu <doruk.kicikoglu@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on https://boardgamearena.com.
 * See http://en.doc.boardgamearena.com/Studio for more information.
 * -----
 *
 * ninjan.action.php
 *
 * Ninjan main action entry point
 *
 *
 * In this file, you are describing all the methods that can be called from your
 * user interface logic (javascript).
 *
 * If you define a method "actMyAction" here, then you can call it from your javascript code with:
 * this.bgaPerformAction("actMyAction", ...)
 *
 */
declare(strict_types=1);

/**
 * @property Ninjan $game
 */
class action_ninjan extends APP_GameAction
{
    /**
     * This is the constructor. Do not try to implement a `__construct` to bypass this method.
     */
    public function __default()
    {
        if ($this->isArg("notifwindow"))
        {
            $this->view = "common_notifwindow";
            $this->viewArgs["table"] = $this->getArg("table", AT_posint, true);
        }
        else
        {
            $this->view = "ninjan_ninjan";
            $this->trace("Complete re-initialization of board game.");
        }
    }

    public function setSortCardsBy()
    {
        self::setAjaxMode();
        $isSuit = self::getArg("isSuit", AT_bool, true);
        $this->game->setSortCardsBy($isSuit);
        self::ajaxResponse();
    }

    public function actSelectCard()
    {
        self::setAjaxMode();
        $cardID = self::getArg("cardID", AT_posint, true);
        $this->game->actSelectCard($cardID);
        self::ajaxResponse();
    }

    public function actRevertCardSelection()
    {
        self::setAjaxMode();
        $this->game->actRevertCardSelection();
        self::ajaxResponse();
    }

    public function actSelectCardPreSelection()
    {
        self::setAjaxMode();
        $cardID = self::getArg("cardID", AT_posint, true);
        $this->game->actSelectCardPreSelection($cardID);
        self::ajaxResponse();
    }

    public function actRevertCardSelectionPreSelection()
    {
        self::setAjaxMode();
        $this->game->actRevertCardSelectionPreSelection();
        self::ajaxResponse();
    }

    public function actTakePile()
    {
        self::setAjaxMode();
        $pileIndex = self::getArg("pileIndex", AT_posint, true);
        $this->game->actTakePile($pileIndex);
        self::ajaxResponse();
    }
}


