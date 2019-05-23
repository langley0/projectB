import { getDirectionFromName } from "../utils";
import Cutscene from "../cutscene";

// 포탈 이벤트
export class Portal2 {
    constructor(x,y, src) {
        this.name = src.name;
        this.gridX = x;
        this.gridY = y;

        this.direction = getDirectionFromName(src.direction);
        this.targetStage = src.targetstage
        this.from = src.name;
        this.to = src.target;
        this.forceStop = true;
    }


    touch(game) {
        // 월드 진입컷신을 만들어서 넣어준다.
        game.playCutscene([
            { command: "leavestage", arguments: [this.from] },
            { command: "enterstage", arguments: [this.targetStage, this.to] },
        ]);
    }
}

// 포탈 이벤트
export default class Portal {
    constructor(game, from, to) {
        this.game = game;
        this.from = from;
        this.to = to;
        this.forceStop = true;
    }


    call() {
        // 이벤트가 호출되었다
        // 포탈이동용 컷신을 플레이한다.
        // TODO : 포탈이동용 컷신은 여러개가 있을수 있는데... 어떻게 하는게 좋을까
        // 일단은 지금은 하나이니까 하나로 하드코딩

        // TODO : 포탈에서 나가는 컷신은!?!! 

        
        // 월드 진입컷신을 만들어서 넣어준다.
        this.game.playCutscene([
            { command: "leavestage", arguments: [this.from] },
            { command: "enterstage", arguments: [this.to.stage, this.to] },
        ]);
    }
}