import items from "./items";
import { parsingOption } from "./utils";
import ScriptParser from "./scriptparser";

// 이 함수에 하나씩 콘솔 명령어를 하나씩 추가하면 된다

export default class DevConsole {
    constructor() {
        const names = Object.getOwnPropertyNames(DevConsole.prototype);
        for(const name of names) {
            if (name !== 'constructor') {
                window[name] = this[name].bind(this);
            }
        }
    }

    setGame(game) {
        this.game = game;
    }

    setZoom(num) {
        this.game.stage.zoomTo(num, true);
    }
    
    parsing() {
        for (let key in items) {
            const item = items[key];

            if (item.options.length > 0) {
                item.options.forEach((option) => {
                    console.log(parsingOption(option));
                });
            }
        }
    }

    resetPlayer() {
        if (this.game && this.game.storage) {
            this.game.storage.clear();
            // 강제 페이지 리로드
            window.location.reload();
        }
    }

    addItem(id, count) {
        const inven = this.game.player.inventory;
        inven.addItem(id.toString(), count);
        return true;
    }

    addGameItem(id, count) {
        this.game.addItem(id.toString(), count);
        return true;
    }
    
    addItems(...args) {
        this.game.addItems(...args)
        return true;
    }

    onNotify(...args) {
        this.game.onNotify(...args);
    }

    setScale(scale) {
        this.game.stage.zoomTo(scale,false);
    }

    printQuest() {
        // 현재 퀘스트 상태를 출력한다
        return this.game.getAllQuests();
    }

    devEmit(string) {
        this.game.emit(string);
    }

    setMainAvatar(...args) {
        // 현재 퀘스트 상태를 출력한다
        this.game.setMainAvatar(...args);
    }

    addQuest(id) {
        this.game.addQuest(id);
    }

    completeQuest(Id) {
        // for (const questId in this.game.player.quests) {
            this.game.completeQuest(Id);
        // }

        return this.game.player.quests;
    }

    equipItem(...args) {
        this.game.equipItem(...args);
    }

    playBGM(...args) {
        Sound.playBGM(...args);
    }

    levelUp() {
        for (let key in this.game.player.characters) {
            this.game.player.characters[key].increaseExp(8700);
        }
    }

    showQuest() {
        console.log(this.game.getAllQuests());
    }

    killCharacter(key) {
        this.game.player.characters[key].health = 0;
    }

    getItem() {
        for (let key in items) {
            const item = items[key];
            if (item.category === 'material' || item.category === 'recipes') {
                this.game.player.inventory.addItem(item.id, Number(50));
            }
        }
        this.levelUp();
        this.game.addGold(50000);
    }
    
    addCharacter(id) {
        this.game.game.addCharacter(id, { level: 1, exp: 0, equips: {}});
    }

    setVolume(...args) {
        this.game.setVolume(...args);
    }
}