class BaseModal extends PIXI.Container {
    constructor(ui, width, height) {
        super();

        const plane = new PIXI.mesh.NineSlicePlane(PIXI.Texture.from('dialog.png'), 12, 10, 12, 10);
        plane.position.x = (ui.screenWidth - width) / 2;
        plane.position.y = (ui.screenHeight - height) /2;
        plane.width = width;
        plane.height = height;
        this.plane = plane;

        const background = new PIXI.Sprite(PIXI.Texture.WHITE);
        background.alpha = 0;
        background.width = ui.screenWidth;
        background.height = ui.screenHeight;
        background.interactive = true; // 클릭을 방지한다
        background.mouseup = this.onClick.bind(this);
        
        this.addChild(background);
        this.addChild(plane);

        this.onclose = null;
    }

    addTitle(text) {
        const style = new PIXI.TextStyle({fontFamily : 'Arial', fontSize: 24, fill : 0xffffff, align : 'center' });
        const titleText = new PIXI.Text(text, style);
        const textMetrics = PIXI.TextMetrics.measureText(text, style);

        const width = this.plane.width - 24;
        const height = textMetrics.height + 16;

        // 타이틀을 여기에 추가한다
        const titlePlane = new PIXI.mesh.NineSlicePlane(PIXI.Texture.from('dialogtitle.png'), 12, 10, 12, 10);
        titlePlane.position.x = (this.plane.width - width) / 2;
        titlePlane.position.y = 12;
        titlePlane.width = width;
        titlePlane.height = height;
        
        titleText.anchor.x = 0.5;
        titleText.anchor.y = 0.5;
        titleText.position.x = width /2;
        titleText.position.y = height /2;

        titlePlane.addChild(titleText);
        this.plane.addChild(titlePlane);
    }

    onClick(event) {
        // 여기서 입력을 가로챈다
        event.stopped = true;
        
        // 창을 닫는다
        this.visible = false;

        if (this.onclose) {
            this.onclose();
        }
    }
}

class ChatBallon extends PIXI.Container {
    constructor(character, chatText) {
        super(); 

        // 한글자씩 나오는 애니메이션을 고민해보자
        this.follower = character;
        
        const MAX_CHAT_WIDTH = 180;

        const style = new PIXI.TextStyle({fontFamily : 'Arial', fontSize: 12, fill : 0, align : 'center', wordWrap: true, wordWrapWidth: MAX_CHAT_WIDTH });
        const textMetrics = PIXI.TextMetrics.measureText(chatText, style);

        // 캐릭터의 위치에 맞추어서 넣어야 한다
        
        const plane = new PIXI.mesh.NineSlicePlane(PIXI.Texture.from('chatballon.png'), 12, 10, 12, 10);
        plane.width = textMetrics.width + 36;
        plane.height = textMetrics.height + 36;
        this.plane = plane;

        const comma = new PIXI.Sprite(PIXI.Texture.from('chatballon_comma.png'));
        comma.position.y = plane.height - 5;
        this.comma = comma;

        const text = new PIXI.Text(chatText, style);
        text.anchor.x = 0.5;
        text.anchor.y = 0.5;
        text.position.x = plane.width / 2;
        text.position.y = plane.height / 2;
        

        this.addChild(plane);
        plane.addChild(comma);
        plane.addChild(text);

        this.updatePosition();
    }

    updatePosition() {
        const character = this.follower;
        const plane = this.plane;
        const comma = this.comma;

        const gpos = character.toGlobal(new PIXI.Point(0, 0));
        plane.position.x = Math.max(gpos.x - plane.width / 2, 0);
        plane.position.y = Math.max(gpos.y - character.height - plane.height - 36, 0);

        comma.position.x = plane.width / 2;
    }
}


class Dialog extends PIXI.Container {
    constructor(ui, width, height) {
        super();

        const plane = new PIXI.mesh.NineSlicePlane(PIXI.Texture.from('dialog.png'), 12, 10, 12, 10);
        plane.position.x = (ui.screenWidth - width) / 2;
        plane.position.y = (ui.screenHeight - height) - 12;
        plane.width = width;
        plane.height = height;
        this.plane = plane;

        const background = new PIXI.Sprite(PIXI.Texture.WHITE);
        background.alpha = 0;
        background.width = ui.screenWidth;
        background.height = ui.screenHeight;
        background.interactive = true; // 클릭을 방지한다
        background.mouseup = this.onClick.bind(this);

        // 다이얼로그안에 내부 사이즈를 구한다
        this.innerWidth = width - 32;
        
        this.addChild(background);
        this.addChild(plane);

        this.onclose = null;
    }

    onClick(event) {
        // 여기서 입력을 가로챈다
        event.stopped = true;
        
        // 창을 닫는다
        this.visible = false;

        if (this.onclose) {
            this.onclose();
        }
    }

    setText(text) {
        if (this.text) {
            this.plane.removeChild(this.text);
        }

        // 텍스트를 화면에 뿌린다
        const dialogText = new PIXI.Text(text,{fontFamily : 'Arial', fontSize: 24, fill : 0xffffff, align : 'center', wordWrap: true, wordWrapWidth: this.innerWidth });
        // 화면중앙에 배치를 한다
        dialogText.anchor.x = 0.5;
        dialogText.anchor.y = 0.5;
        dialogText.position.x = this.plane.width /2;
        dialogText.position.y = this.plane.height /2;
        this.text = dialogText;

        this.plane.addChild(dialogText);

    }
}

class StageTitle extends PIXI.Container {
    constructor(ui, text) {
        super();
        const style = new PIXI.TextStyle({fontFamily : 'Arial', fontSize: 48, fill : 0xffffff, align : 'center', dropShadow: true });
        const title = new PIXI.Text(text, style);
        // 화면중앙에 배치를 한다
        title.anchor.x = 0.5;
        title.anchor.y = 0.5;
        title.position.x = ui.screenWidth/2;
        title.position.y = ui.screenHeight * 0.25;
        this.addChild(title);

        const textMetrics = PIXI.TextMetrics.measureText(text, style);
        const underline = new PIXI.Sprite(PIXI.Texture.WHITE);
        underline.width = textMetrics.width + 8;
        underline.height = 4;
        underline.anchor.x = 0.5;
        underline.anchor.y = 0.5;
        underline.position.y = textMetrics.height/2 + 4;

        title.addChild(underline);
        

        this.title = title;
    }

    set titleScale(value) {
        this.title.scale.x = value;
    }

    get titleScale() {
        return this.title.scale.x;
    }
}

class InventoryUI extends PIXI.Container {
    constructor(ui) {
        super();

        const base = new PIXI.Sprite(PIXI.Texture.fromFrame("inventory.png"));
        // 위치는 일단 가운데 ...
        base.anchor.x = 0.5;
        base.anchor.y = 0.5;
        base.position.x = ui.screenWidth / 2;
        base.position.y = ui.screenHeight / 2;
        this.addChild(base);

        this.base = base;
    }

    update(playerInventory) {
        this.base.removeChildren();
        // 인벤토리에 있는 아이템을 화면에 표시한다
        let index = 0;
        const inventoryWidth = 4;
        playerInventory.eachItem((item) => {
            // 열쇠를 찍는다
            const x = index % inventoryWidth;
            const y = Math.floor(index / inventoryWidth);
            
            const itemSpr = new PIXI.Sprite(PIXI.Texture.fromFrame("item3.png"));
            itemSpr.position.x = x * 85 + 17 - this.base.width/2;
            itemSpr.position.y = y * 85 + 60 - this.base.height/2;

            this.base.addChild(itemSpr);

            ++index;
        });
    }
}

class CombineUI extends PIXI.Container {
    constructor(ui) {
        super();

        // 투명 백그라운드를 만들어서 클릭하면 닫히게 한다
        const background = new PIXI.Sprite(PIXI.Texture.WHITE);
        background.alpha = 0;
        background.width = ui.screenWidth;
        background.height = ui.screenHeight;
        background.interactive = true; // 클릭을 방지한다
        background.mouseup = (event) => { 
            event.stopped = true;
            this.visible = false; 
        };
        this.addChild(background);


        const base = new PIXI.Sprite(PIXI.Texture.fromFrame("combine.png"));
        // 위치는 일단 가운데 ...
        base.anchor.x = 0.5;
        base.anchor.y = 0.5;
        base.position.x = ui.screenWidth / 2;
        base.position.y = ui.screenHeight / 2;
        base.interactive = true;
        base.mouseup = (evt) => { evt.stopped = true; };
        this.addChild(base);

      
        // 조합하기 버튼을 그린다. 그리고 tint 를 사용해서 비활성화한다. 
        const button = new PIXI.Sprite(PIXI.Texture.fromFrame("combine_button.png"));
        button.tint = 0x404040;
        button.position.x = -105;
        button.position.y = 115;
        button.mouseup = (event) => {
            event.stopped = true;
            // 조합이 완성되면 버튼을 클릭해서 조합을 가능하게 한다
            // 아이템이 인벤토리에 있으면 지우고 새로운 아이템을 생성하고 팝업을 알린다
            const itemA = ui.game.player.inventory.getItemByType(1);
            const itemB = ui.game.player.inventory.getItemByType(2);
            if (itemA && itemB) {
                ui.game.player.inventory.deleteItem(itemA.itemId);
                ui.game.player.inventory.deleteItem(itemB.itemId);

                // 12번을 제거하고 3번을 추가한다
                ui.game.player.inventory.addItem(100, 3);
                this.visible = false;
                ui.showItemAcquire(3, () => {
                    ui.showDialog("잠긴 문을 열 수 있게 되었다");
                });
            }
        };
        base.addChild(button)

        this.base = base;
        this.button = button;
    }

    update(game) {
        this.showRecipe(game);
    }

    showRecipe(game) {
        let clicked = false;
        this.base.removeChildren();
        this.base.addChild(this.button); // 버튼은 달아야 한다

      

        // 레시피를 화면 그린다.
        const recipe = new PIXI.Sprite(PIXI.Texture.fromFrame("combine_listitem.png"));
        recipe.position.x = 80;
        recipe.position.y = -108;
        const style = new PIXI.TextStyle({fontFamily : 'Arial', fontSize: 16, fill : 0xffffff, align : 'center' });
        const text = new PIXI.Text("출구 열쇠", style);
        recipe.addChild(text);

        text.position.x = 15;
        text.position.y = (recipe.height - text.height) / 2;

        this.base.addChild(recipe);

        recipe.interactive = true;
        recipe.mouseup = (event) => {
            event.stopped = true;

            // 마우스 클릭했을때의 이벤트
            // 일단 하드코딩. 여기서 인벤토리를 검사해서 각 레시피를 재표를 채운다
            if (!clicked) {
                const itemA = game.player.inventory.getItemByType(1);
                const itemB = game.player.inventory.getItemByType(2);
                // 아이템 1번과 2번이 존재하면 흰색 아니면 회색으로 표시한다
                const colorA = itemA ? 0xffffff : 0x808080;
                const colorB = itemB ? 0xffffff : 0x808080;

                const styleA = new PIXI.TextStyle({fontFamily : 'Arial', fontSize: 16, fill : colorA, align : 'center' });
                const textA = new PIXI.Text("열쇠 조각 A", styleA);
                textA.position.x = -280;
                textA.position.y = -96;

                const styleB = new PIXI.TextStyle({fontFamily : 'Arial', fontSize: 16, fill : colorB, align : 'center' });
                const textB = new PIXI.Text("열쇠 조각 B", styleB);
                textB.position.x = -280;
                textB.position.y = -23;

                const styleC = new PIXI.TextStyle({fontFamily : 'Arial', fontSize: 16, fill : 0x40FF40, align : 'center' });
                const textC = new PIXI.Text("출구 열쇠", styleC);
                textC.position.x = -280;
                textC.position.y = 72;


                // 각각의 레시피를 화면에 출력한다
                this.base.addChild(textA);
                this.base.addChild(textB);
                this.base.addChild(textC);

                // 모든 아이템이 준비되면 조합버튼을 활성화한다
                if (itemA && itemB) {
                    this.button.tint = 0xffffff;
                    this.button.interactive = true;
                } else {
                    this.button.tint = 0x404040;
                    this.button.interactive = false;
                }

                clicked = true;
            } 
        }
        
    }
}

class BattleUI extends PIXI.Container {
    constructor(ui) {
        super();
        this.battleUi = {
            playersPortraits: [],
            enemiesPortraits: []
        };

        this.players = [];
        this.enemies = [];

        this.ui = ui;

        this.playerUi = new PIXI.Container();
        this.enemyUi = new PIXI.Container();

        this.playerUi.visible = false;
        this.enemyUi.visible = false;

        this.addChild(this.playerUi);
        this.addChild(this.enemyUi);
    }

    setBattleUi(players, enemies) {
        this.battleUi = {
            playersPortraits: [],
            enemiesPortraits: []
        };

        this.removeChild(this.playerUi);
        this.removeChild(this.enemyUi);

        this.playerUi = new PIXI.Container();
        this.enemyUi = new PIXI.Container();

        this.makePlayerUi(players);
        this.makeEnemiesUi(enemies);

        this.playerUi.visible = false;
        this.enemyUi.visible = false;

        this.addChild(this.playerUi);
        this.addChild(this.enemyUi);
    }

    makePlayerUi(players) {
        this.players = players;

        players.forEach((player, i) => {
            // player정보 읽어서 뭔가 초상화 이런거 가져오겠지..
            const newBattleUi = {
                portrait: player.portrait,
                skillA: player.skillAIcon,
                skillB: player.skillBIcon
            }

            newBattleUi.portrait.x = 25 + i * 94;
            newBattleUi.portrait.y = this.ui.screenHeight - 57 - newBattleUi.portrait.height;
            newBattleUi.portrait.interactive = true;
            this.playerUi.addChild(newBattleUi.portrait);

            newBattleUi.skillA.x = newBattleUi.portrait.x + newBattleUi.portrait.width / 2 - newBattleUi.skillA.width - 3;
            newBattleUi.skillA.y = newBattleUi.portrait.y + newBattleUi.portrait.height;
            newBattleUi.skillA.interactive = true;
            this.playerUi.addChild(newBattleUi.skillA);

            newBattleUi.skillB.x = newBattleUi.portrait.x + newBattleUi.portrait.width / 2 + 3;
            newBattleUi.skillB.y = newBattleUi.portrait.y + newBattleUi.portrait.height;
            newBattleUi.skillB.interactive = true;
            this.playerUi.addChild(newBattleUi.skillB);
            
            const style = new PIXI.TextStyle();
            style.dropShadow = true;
            style.dropShadowDistance = 1;
            style.fontSize = 15;
            style.fill = "#ffffff";
            
            const text = new PIXI.Text(player.name, style);
            text.position.x = Math.round(newBattleUi.portrait.x + (newBattleUi.portrait.width/2) - text.width/2);
            text.position.y = newBattleUi.portrait.y - text.height;
            this.playerUi.addChild(text);

            this.battleUi.playersPortraits.push(newBattleUi);
        });
    }

    makeEnemiesUi(enemies) {
        this.enemies = enemies;
        enemies.forEach((enemy, i) => {
            const newBattleUi = {
                portrait: enemy.portrait
            }

            newBattleUi.portrait.x = 970 - ((enemies.length - i) * 94);
            newBattleUi.portrait.y = 10;
            newBattleUi.portrait.interactive = true;
            this.enemyUi.addChild(newBattleUi.portrait);
            
            const style = new PIXI.TextStyle();
            style.dropShadow = true;
            style.dropShadowDistance = 1;
            style.fontSize = 15;
            style.fill = "#ffffff";
            
            // 우선 레벨 하드코딩..
            const text = new PIXI.Text('Lv.1', style);
            text.position.x = Math.round(newBattleUi.portrait.x + (newBattleUi.portrait.width/2) - text.width/2);
            text.position.y = newBattleUi.portrait.y + newBattleUi.portrait.height + 3;
            this.enemyUi.addChild(text);

            this.battleUi.enemiesPortraits.push(newBattleUi);
        });
    }

    showUi() {
        this.playerUi.visible = true;
        this.enemyUi.visible = true;
    }

    hideUi() {
        this.playerUi.visible = false;
        this.enemyUi.visible = false;
    }

    updateStatus(character) {
        if (character.hp <= 0) {
            const playerIndex = this.players.indexOf(character);
            const enemyIndex = this.enemies.indexOf(character);

            if (playerIndex >= 0) {
                this.battleUi.playersPortraits[playerIndex].portrait.tint = 0xFF5555;
            } else {
                this.battleUi.enemiesPortraits[enemyIndex].portrait.tint = 0xFF5555;
            }
        }
    }

    disableInteractive() {
        this.players.forEach((player, index) => {
            this.battleUi.playersPortraits[index].skillA.interactive = false;
            this.battleUi.playersPortraits[index].skillB.interactive = false;
            this.battleUi.playersPortraits[index].skillA.removeAllListeners();
            this.battleUi.playersPortraits[index].skillB.removeAllListeners();
        });
    }

    getCommand(callback) {
        this.players.forEach((player, index) => {
            // 이 조건문 마음에 들지 않음..
            if (player.hp > 0) {
                this.battleUi.playersPortraits[index].portrait.tint = 0xBBBBBB;
            }
            if (player.status === 'idle') {
                this.battleUi.playersPortraits[index].portrait.tint = 0xFFFFFF;
                this.battleUi.playersPortraits[index].skillA.interactive = true;
                this.battleUi.playersPortraits[index].skillB.interactive = true;

                this.battleUi.playersPortraits[index].skillA.on('mouseup', (event) => {
                    this.battleUi.playersPortraits[index].portrait.tint = 0xBBBBBB;
                    callback(player, 'selectA');
                    this.disableInteractive();
                });

                this.battleUi.playersPortraits[index].skillB.on('mouseup', (event) => {
                    this.battleUi.playersPortraits[index].portrait.tint = 0xBBBBBB;
                    callback(player, 'selectB');
                    this.disableInteractive();
                });
            }
        });
    }
}

export default class UI extends PIXI.Container {
    constructor(game) {
        super();

        this.game = game;
        this.game.foreground.addChild(this);

        this.screenWidth = game.screenWidth;
        this.screenHeight = game.screenHeight;


        this.dialog = new Dialog(this, 700, 150);
        this.dialog.visible = false;
        this.addChild(this.dialog);

        this.theater = new PIXI.Sprite(PIXI.Texture.fromFrame("theater.png"));
        this.theater.visible =false;
        this.addChild(this.theater);

        this.chatBallons = [];

        this.inventory = new InventoryUI(this);
        this.addChild(this.inventory);
        this.inventory.visible = false;

        this.combine = new CombineUI(this);
        this.addChild(this.combine);
        this.combine.visible = false;
        
        this.battleUi = new BattleUI(this);
        this.addChild(this.battleUi);
    }
    
    showDialog(text, closeCallback) {
        this.dialog.setText(text);
        this.dialog.visible = true;
        this.dialog.onclose = closeCallback;
    }

    hideDialog() {
        this.dialog.visible = false;
    }

    showStageTitle(text, delay) {
        // 스테이지 이름을 애니메이션 하면서 보여준다
        const title = new StageTitle(this, text);
        title.titleScale = 0;
        title.alpha = 0;

        this.addChild(title);

        this.game.tweens.addTween(title, 1, { titleScale: 1, alpha: 1 }, delay | 0, "easeInOut", true, () => {
            this.game.tweens.addTween(title, 1, { alpha: 0 }, 1, "easeInOut", false, () => {
                this.removeChild(title);
            });
        });
    }

    showStatUI() {
        // 여기서 스탯 ui 를 만든다
        
    }

    showTheaterScreen(duration) {
        // 위아래의 극장 스크린을 보여준다
        const theater = this.theater;
        theater.visible = true;

        if (duration > 0) {
            theater.alpha = 0;
            this.game.tweens.addTween(theater, duration, { alpha: 1 }, 0, "easeInOut", true);
        } else {
            theater.alpha = 1;
        }
    }

    hideTheaterScreen(duration) {
        const theater = this.theater;
        theater.visible = true;

        if (duration > 0) {
            this.game.tweens.addTween(theater, duration, { alpha: 0 }, 0, "easeInOut", true, () => {
                theater.visible = false;
            });
        } else {
            theater.alpha = 0;
            theater.visible = false;
        }
    }


    showItemAcquire(itemId, closeCallback) {
        
        const itemAcquire = new BaseModal(this, 400, 300);
        itemAcquire.addTitle("아이템 획득");
        itemAcquire.onclose = () => {
            // 자신을 부모로부터 제거한다
            this.removeChild(itemAcquire);
            
            if (closeCallback) {
                closeCallback();
            }
        }
        this.addChild(itemAcquire);
        
        const itemSprite = new PIXI.Sprite(PIXI.Texture.fromFrame("item3.png"));
        itemSprite.anchor.x = 0.5;
        itemSprite.anchor.y = 0.5;
        itemSprite.position.x = itemAcquire.width / 2;
        itemSprite.position.y = itemAcquire.height / 2 - 20;
        itemAcquire.addChild(itemSprite);
        
        
        let acquireText;
        if (itemId === 1) {
            acquireText = "[열쇠조각A]를 얻었다";
        } else if (itemId === 2) {
            acquireText = "[열쇠조각B]를 얻었다";
        } else if (itemId === 3) {
            acquireText = "[철문열쇠]를 얻었다";
        }

        const itemText = new PIXI.Text(acquireText ,{fontFamily : 'Arial', fontSize: 16, fill : 0xffffff, align : 'center', wordWrap: true, wordWrapWidth: itemAcquire.width /2 });
        itemText.anchor.x = 0.5;
        itemText.anchor.y = 0.5;
        itemText.position.x = itemAcquire.width / 2;
        itemText.position.y = itemSprite.position.y + itemSprite.height / 2 + 32;
        itemAcquire.addChild(itemText);
    }

    showChatBallon(character, text, duration) {
        // 일정시간동안 보였다가 사라지게 한다.
        const chat = new ChatBallon(character, text);
        this.addChild(chat);
        this.chatBallons.push(chat);
        duration = duration || 3;

        setTimeout(() => {
            this.removeChild(chat);
            const index = this.chatBallons.indexOf(chat);
            if (index >= 0) {
                this.chatBallons.splice(index, 1);
            }
        }, duration * 1000);
    }

    update() {
        // 풍선들을 관리한다
        for (const chat of this.chatBallons) {
            chat.updatePosition();
        }
    }

    showInventory() {
        this.inventory.visible = true;
        this.inventory.update(this.game.player.inventory);
    }

    hideInventory() {
        this.inventory.visible = false;
    }

    showCombine() {
        this.combine.visible = true;
        this.combine.update(this.game);
    }

    hideCombine() {
        this.combine.visible = false;
    }
}