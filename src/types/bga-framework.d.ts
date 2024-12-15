declare var gameui: GameGui;
declare var g_replayFrom: number | undefined;
declare var g_gamethemeurl: string;
declare var g_themeurl: string;
declare var g_archive_mode: boolean;
declare function _(str: string): string;
declare function __(lang: string, str: string): string;

declare const define;
declare const ebg;
declare const dojo;
declare const $;
declare const dijit;

declare class GameGui {
    page_is_unloading: any;
    game_name: string;
    instantaneousMode: any;
    player_id: string;
    interface_min_width: number;
    gamedatas: any;
    prefs: any;
    notifqueue: any;
    scoreCtrl: any;

    isCurrentPlayerActive(): boolean;
    getBoundingClientRectIgnoreZoom(node: HTMLDivElement): any;
    dontPreloadImage(imageFileName: string): void;
    addActionButton(id: string, label: string, callback: (event?: any) => void);
    checkAction(action: any);
    ajaxcall(url: string, args: object, bind: GameGui, resultHandler: (result: any) => void, allHandler: any);
    bgaPerformAction(action: string, args?: object, params?: object);
    getActivePlayerId(): number;

    setup(gamedatas: any): void;
    onEnteringState(stateName: string, args: any): void;
    onLeavingState(stateName: string ): void;
    onUpdateActionButtons(stateName: string, args: any): void;
    setupNotifications(): void;
    addTooltipHtml( nodeID: string, html: string, delay: number ):void;

    placeOnObject(mobileObj: HTMLDivElement, targetObj: HTMLDivElement): void;
    isInterfaceLocked(): boolean;
    confirmationDialog(message: string, yesHandler: (param: any) => void, noHandler?: (param: any) => void, param?: any): void;

    onScriptError(msg: string, url?: string, linenumber?: number);
    inherited(args: any);
}
