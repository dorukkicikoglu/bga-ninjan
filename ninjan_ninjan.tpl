{OVERALL_GAME_HEADER}

<!-- 
--------
-- BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
-- Ninjan implementation : © Doruk Kicikoglu <doruk.kicikoglu@gmail.com>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-------

    ninjan_ninjan.tpl
    
    This is the HTML template of your game.
    
    Everything you are writing in this file will be displayed in the HTML page of your game user interface,
    in the "main game zone" of the screen.
    
    You can use in this template:
    _ variables, with the format {MY_VARIABLE_ELEMENT}.
    _ HTML block, with the BEGIN/END format
    
    See your "view" PHP file to check how to set variables and control blocks
    
    Please REMOVE this comment before publishing your game on BGA
-->

<link rel="preload" href="https://fonts.gstatic.com/s/roboto/v20/KFOmCnqEu92Fr1Mu4mxK.woff2" as="font" type="font/woff2" crossorigin="anonymous">

<div class="my-hand-container">
    <div class="my-hand-title"></div>
    <div class="cards-container"></div>
    <a class="bgabutton order-cards-button bgabutton_gray bgabutton_small"></a>
</div>

<div class="piles-row">
    <div class="pile-queue-container">
        <div class="remaining-cards-wrapper"></div>
        <div class="queue-arrows-container">
            <i class="a-queue-arrow fa6 fa-caret-right"></i>
            <i class="a-queue-arrow fa6 fa-caret-right"></i>
            <i class="a-queue-arrow fa6 fa-caret-right"></i>
        </div>
    </div>
    <div class="piles-container"></div>
</div>

<script type="text/javascript">

</script>  

{OVERALL_GAME_FOOTER}
