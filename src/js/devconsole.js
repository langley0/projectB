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

    addItem(id, count) {
        const inven = this.game.player.inventory;
        inven.addItem(id.toString(), count);
        return true;
    }
}