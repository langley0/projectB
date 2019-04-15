import { DIRECTIONS } from './define';
import MoveEngine from './moveengine';
import PathFinder from './pathfinder';
import Tile from './tile';
import Tweens from './tweens';

function hitTestRectangle(rect1, rect2) {
    return  (rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y);
};


// 
class Gate extends Tile {
    constructor(x, y, tileData) {
        super(x, y, tileData);

        // 철망을 붙인다
        const base = (tileData.direction === DIRECTIONS.SW) ?
                PIXI.Texture.fromFrame("stealBarL.png") : 
                PIXI.Texture.fromFrame("stealBarR.png");

        this.base = base;
        this.bar1 = new PIXI.Sprite(new PIXI.Texture(base, new PIXI.Rectangle(0, 0, base.width, 50)));
        this.bar2 = new PIXI.Sprite(new PIXI.Texture(base, new PIXI.Rectangle(0, 50, base.width, 40)));
        this.bar3 = new PIXI.Sprite(new PIXI.Texture(base, new PIXI.Rectangle(0, 90, base.width, base.height - 90)));
        this.addChild(this.bar1);
        this.addChild(this.bar2);
        this.addChild(this.bar3);

        // 초기값을 설정할 수 있어야 한다
        this.openRatio = 1; // 기본으로 닫아놓는다
        
        // 열쇠로 열수 있는지 확인한다
        if (tileData.tags && tileData.tags.indexOf("key") >= 0) {
            this.needsKey = true;
        }
    }

    set openRatio(value) {
        // 0이면 닫힌거고 1 이면 열린것
        this.bar1.position.y = -this.base.height;
        
        this.bar2.position.y = this.bar1.position.y + this.bar1.height;
        this.bar2.height = value * 40;
        
        this.bar3.position.y = this.bar1.position.y + 50 + this.bar2.height;

        this._openRatio = value;
        this.duration = 0.5;
    }

    open(tweens) {
        if (tweens) {
            // 열쇠가 돌아가는 시간을 조금 벌어야 한다. 바로 열리면 뭔가 이상하다
            tweens.addTween(this, this.duration, { openRatio: 0 }, 0.5, "easeInOut", true);
        } else {
            this.openRatio = 0;
        }
    }

    close(tweens) {
        if (tweens) {
            
            tweens.addTween(this, this.duration, { openRatio: 1 }, 0, "easeInOut", true);
        } else {
            this.openRatio = 1;
        }
    }

    get openRatio() {
        return this._openRatio;
    }

    get isOpened() {
        return this._openRatio <= 0;
    }

    get isInteractive() {
        if (this.isOpened) {
            // 열린문은 인터랙트 하지 않아도 된다
            // 다시 닫을 일이 있을까?
            return false;
        } else {
            return true;
        }
    }

    touch(game) {
        // 다이얼로그를 연다
        if (!this.isOpened) {
            if (this.needsKey) {
                // 열쇠를 가지고 있는지 검사한다
                const keyItem = game.player.inventory.getItemByType(3);
                if (keyItem) {
                    game.ui.showDialog("문을 열었다!");
                    this.open(game.tweens);
                    // 열쇠를 파괴한다
                    game.player.inventory.deleteItem(keyItem.itemId);
                } else {
                    game.ui.showDialog("문을 열기 위해서 열쇠가 필요하다");
                }
                
            } else {
                game.ui.showDialog("이 문은 열리지 않을 것 같다\n\n다른 문을 찾아보자");
            }
        }
    }
    
}   

class Chest extends Tile {
    constructor(x, y, tileData) {
        super(x, y, tileData);

        this.isInteractive = true;
        this.isOpened = false;

        // 자신의 타일 모양을 바꾸어야 한다
        this.animations = tileData.animations;
    }

    open() {
        // TODO : 애니메이션을 플레이 해야한다
        // 텍스쳐 변경
        this.setTexture(PIXI.Texture.fromFrame(this.animations[1].textureName));

        this.isOpened = true;
    }

    touch(game) {
        if (this.isOpened) {
            game.ui.showDialog("상자는 비어있다.");
        } else {
            this.open();
            // TODO : 아이템 아이디가 어딘가 있어야 하는데.. 일단 1,2번이 열쇠조각, 3번이 열쇠이다
            let itemType;
            if (!game.player.inventory.getItemByType(1))  {
                game.player.inventory.addItem(1, 1);
                itemType = 1;
            } else if (!game.player.inventory.getItemByType(2))  {
                game.player.inventory.addItem(2, 2);
                itemType = 2;
            }
            
            // 두번째상자에서 몬스터가 나오게 한다
            if (itemType === 2) {
                game.battleMode.callback = () => {
                    this.onItemAdded(game, itemType);
                };
                game.enterStage('assets/mapdata/map2.json', "battle");
            } else {
                this.onItemAdded(game, itemType);
            }
        }
    }

    onItemAdded(game, itemType) {
        game.ui.showItemAcquire(itemType, () => {
            // TODO:  모달 클로즈 이벤트를 만들어야 한다
            // 트리거를 만들어야 한다!!

            if (game.player.inventory.getItemByType(1) && 
                game.player.inventory.getItemByType(2)) {

                game.ui.showChatBallon(game.player, "열쇠조각은 모두 모았어!!\n아까 모루를 본 것 같은데 \n그쪽으로 가보자", 4);
            } else {
                game.ui.showChatBallon(game.player, "열쇠조각이다! 나머지 조각도 어딘가 있을거야", 4);
            }
        });
    }
}

class Anvil extends Tile {
    constructor(x, y, tileData) {
        super(x, y, tileData);

        this.isInteractive = true;
        this.firstTouch = true;
    }

    touch(game) {
        if (this.firstTouch) {
            this.firstTouch = false;
            game.ui.showDialog("모루를 발견하였다\n\n새로운 아이템을 조합할 수 있게 되었다", () => {
                game.ui.showCombine();
            });
        } else {
            game.ui.showCombine();
        }
    }
}


function getDirection(x1, y1, x2, y2) {
    if (x1 === x2) {
        if (y1 < y2) { return DIRECTIONS.SE; }
        else if (y1 > y2) { return DIRECTIONS.NW; }
    }
    else if (y1 === y2) {
        if (x1 < x2) { return DIRECTIONS.NE; }
        else if (x1 > x2)	{ return DIRECTIONS.SW; }
    }
    return null;
}

function isInPolygon(gp, vertices) {
	const testy = gp.y;
	const testx = gp.x;
	const nvert = vertices.length;
	let c = false;
	for (let i = 0, j = nvert - 1; i < nvert; j = i++) {
		if ( ((vertices[i][1] > testy) !== (vertices[j][1] > testy)) && 
			(testx < (vertices[j][0] - vertices[i][0]) * (testy - vertices[i][1]) / (vertices[j][1] - vertices[i][1]) + vertices[i][0]) )
		{
			c = !c;
		}
	}
	return c;
};

export default class Stage extends PIXI.Container {
    constructor(width, height, tileWidth, tileHeight) {
        super();

        this.mapWidth = width;
        this.mapHeight = height;
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
        this.TILE_HALF_W = tileWidth / 2;
        this.TILE_HALF_H = tileHeight / 2;

        this.tiles = {}
        this.groundMap = new Array(height * width);
        this.objectMap = new Array(height * width);
       
        this.mapContainer = new PIXI.Container();
	    this.addChild(this.mapContainer);

        this.groundContainer = new PIXI.Container();
        this.objectContainer = new PIXI.Container()
        this.overlayContainer = new PIXI.Container()

        this.mapContainer.addChild(this.groundContainer);
        this.mapContainer.addChild(this.objectContainer);
        this.mapContainer.addChild(this.overlayContainer);
        
        this.interactive = true;

        this.pathFinder = new PathFinder(this.mapWidth, this.mapHeight);
        this.moveEngine = new MoveEngine(this);
        this.tweens = new Tweens();

        this.currentScale = 1.0;
        this.currentZoom = 0;
    
        this.posFrame = { x : 0, y : 0, w : 980, h : 500 };
        this.externalCenter = {
            x : this.posFrame.w >> 1,
            y : this.posFrame.h >> 1
        };

        this.mapVisualWidthReal = this.getTilePosXFor(this.mapWidth - 1,this.mapHeight - 1) - this.getTilePosXFor(0,0);
	    this.mapVisualHeightReal = this.getTilePosYFor(this.mapWidth - 1,0) - this.getTilePosYFor(0,this.mapHeight - 1);

        this.currentFocusLocation = { x: this.mapWidth >> 1, y: this.mapHeight >> 1 };
		this.centralizeToPoint(this.externalCenter.x, this.externalCenter.y, true);
    }

    // Obj를 흔들어주는 function 이런건 유틸쪽으로 빼야할까..?..
    // set Timeout 을 사용하는게 맞는가..? MovieClip Timeline이 있는데
    vibrateObj(obj, strength, callback) {
        var size = strength ? strength : 4;
        var x = obj.position.x;
        var y = obj.position.y;

        var vibrate = () => {
            setTimeout(() => {
                obj.position.x = x;
                obj.position.y = y;
                if (size < -1 || size > 1) {
                    obj.position.x += size;
                    obj.position.y += size;
                    size = size / -4 * 3;
                    vibrate();
                } else {
                    callback ? callback() : null;
                }
            }, 30);
        };

        vibrate();
    }

    zoomTo(scale, instantZoom) {
        
        this.externalCenter = this.externalCenter ? this.externalCenter : { x: (this.mapVisualWidthScaled >> 1), y: 0 };
        const diff = { x: this.mapContainer.position.x + (this.mapVisualWidthScaled >> 1) - this.externalCenter.x, y: this.mapContainer.position.y - this.externalCenter.y };
        const oldScale = this.currentScale;
        
        this.setScale(scale, instantZoom);
        
        const ratio = this.currentScale / oldScale;
        this.centralizeToPoint(this.externalCenter.x + diff.x * ratio, this.externalCenter.y + diff.y * ratio, instantZoom);
    }

    setScale(s, instantZoom) {
        this.currentScale = s;
        this.mapVisualWidthScaled = this.mapVisualWidthReal * this.currentScale;
        this.mapVisualHeightScaled = this.mapVisualHeightReal * this.currentScale;
        
        if (instantZoom) {
            this.mapContainer.scale.set(this.currentScale);
        } else {
            this.tweens.addTween(this.mapContainer.scale, 0.5, { x: this.currentScale, y: this.currentScale }, 0, "easeInOut", true );
        }
    }

    centralizeToPoint(px, py, instantRelocate) {
        if (instantRelocate) {
            this.mapContainer.position.x = px;
            this.mapContainer.position.y = py;
        }
        else {
            this.tweens.addTween(this.mapContainer.position, 0.5, { x: px, y: py }, 0, "easeInOut", true );
        }
    }

    addTile(id, textureName, options) {
        options = options || {};
        options.textureName = textureName;
        this.tiles[id] = options;
            
    }

    generateTile(x, y, tileId) {
        const tileData = this.getTileData(tileId);
        let tile;
        if (tileData.objectType === "gate") {
            tile = new Gate(x, y, tileData);
        } else if (tileData.objectType === "chest") {
            tile = new Chest(x, y, tileData);
        }  else if (tileData.objectType === "anvil") {
            tile = new Anvil(x, y, tileData);
        }
        else {
            tile = new Tile(x, y, tileData);
        }
        tile.position.x = this.getTilePosXFor(x, y) - this.TILE_HALF_W;
        tile.position.y = this.getTilePosYFor(x ,y) + this.TILE_HALF_H;
        return tile;
    }

    setGroundTile(x, y, tileId) {
        if (tileId > 0) {
            this.groundMap[x + y * this.mapWidth] = this.generateTile(x, y, tileId);
        }
    }

    setObjectTile(x, y, tileId) {
        if (tileId > 0) {
            this.objectMap[x + y * this.mapWidth] = this.generateTile(x, y, tileId);

        }
    }

    getTilePosXFor = function(c, r) {
        return (c * this.TILE_HALF_W) + (r * this.TILE_HALF_W);
    };

    getTilePosYFor = function(c, r) {
        return (r * this.TILE_HALF_H) - (c * this.TILE_HALF_H);
    }
    
    getGroundTileAt(x, y) {
        return this.groundMap[x + y*this.mapWidth];
    }

    getObjectAt(x, y) {
        return this.objectMap[x + y*this.mapWidth];
    }

    getTileData(tileid) {
        return this.tiles[tileid];
    }

    build() {
        for (let y = 0; y < this.mapHeight; y++ ) {
            for (let x = this.mapWidth - 1; x >= 0; --x) {
                const index = x + y * this.mapWidth;
                const groundTile = this.groundMap[index];

                if (groundTile) {
                    this.groundContainer.addChild(groundTile);
                    this.pathFinder.setCell(x, y, groundTile.movable);
                }

                const objectTile = this.objectMap[index];
                if (objectTile) {
                    this.objectContainer.addChild(objectTile);   
                    this.pathFinder.setDynamicCell(x, y, objectTile.movable);
                }
                
            }
        }
    }

    onMouseUp(event) {
        this.checkForTileClick(event.data);
    }

    checkForTileClick(mdata) {
        const localPoint = this.mapContainer.toLocal(mdata.global);
        const selectedTile = this.getTileFromLocalPos(localPoint);
        if (selectedTile) {
           if (this.onTileSelected) {
                this.onTileSelected(selectedTile.gridX, selectedTile.gridY);
           }
        }
    }

    getTileFromLocalPos(point) {
        // 화면의 좌표를 구하는 방식을 역산한다.
        // 중앙 센터포지션을 중심으로 바닥 타일을 감싸는 사각형을 그린다
        // 이 사각형들은 겹쳐있기 때문에 여러개의 중첩되어서 나오게 된다.
        // 이 중첩된 사각형중에 하나를 찾으면 된다.

        // 찾기 귀찮으니 모든 타일을 검사하자..
        for (let y = 0; y < this.mapHeight; ++y) {
            for (let x = 0; x < this.mapWidth; ++x) {
                // 중앙 포지션을 구한다
                const cx = this.getTilePosXFor(x, y);
                const cy = this.getTilePosYFor(x ,y);

                if (cx - this.TILE_HALF_W <= point.x && point.x < cx + this.TILE_HALF_W && 
                    cy - this.TILE_HALF_H <= point.y && point.y < cy + this.TILE_HALF_H) {

                    // 타일마름모 안에 있는지 확인한다
                    if (Math.abs(point.x - cx) * this.TILE_HALF_H / this.TILE_HALF_W + Math.abs(point.y - cy) <= this.TILE_HALF_H) {
                        const index = x + y * this.mapWidth;
                        return this.groundMap[index];
                    }
                }
            }
        }
        return null;
    }

    addCharacter(character, x, y) {
        // 해당 좌표에 오브젝트를 추가한다
        // 오브젝트가 없는 곳에만 오브젝트를 추가할수 있다 (현재는)
        const px = this.getTilePosXFor(x, y);
        const py = this.getTilePosYFor(x, y);

        character.position.x = px;
        character.position.y = py;

        character.container.position.x = - this.TILE_HALF_W;
        character.container.position.y = this.TILE_HALF_H;

        this.addObjRefToLocation(character, x, y);
        this.arrangeDepthsFromLocation(x, y);
    }

    moveCharacter(character, x, y) {

        const target = this.getInteractiveTarget(x, y);
        const ignoreTarget = target ? true : false;

        // 다음 위치에서부터 시작을 한다
        const startX = character.currentTargetTile ? character.currentTargetTile.x : character.gridX;
        const startY = character.currentTargetTile ? character.currentTargetTile.y : character.gridY;
        const path  = this.pathFinder.solve(startX, startY, x, y, ignoreTarget);

        if (path) {
            if (path[0].x === x && path[0].y === y) {
                // 타겟을 설정한다
                this.interactTarget = target;
            } else {
                this.interactTarget = null;
            }
            
            // 길을 찾는다
            if (character.isMoving) {
                character.newPath = path;
            } else {
                this.moveObjThrough(character, path);
            }
        }
    }

    getInteractiveTarget(x, y) {
        const target = this.getObjectAt(x, y);
        if (target && target.isInteractive) {
            return target;
        }
        return null;
    }

    moveObjThrough(obj, path) {
        if (obj.currentTarget) {
            this.stopObject(obj);
        }

        if (obj.newPath) {
            path = obj.newPath;
            obj.newPath = undefined;
        }

        if (path.length == 0) {
            this.onObjMoveStepEnd(obj);
            return;
        }

        const isControlCharacter = true;
        if (isControlCharacter & this.showPathHighlight) {
            this.highlightPath(obj.currentPath, path);
        }

        obj.currentPath = path;
        obj.currentPathStep = obj.currentPath.length - 1;
        obj.currentTargetTile = obj.currentPath[obj.currentPathStep];
        obj.speedMagnitude = 2;

        this.onObjMoveStepBegin(obj, obj.currentTargetTile.x, obj.currentTargetTile.y);
    }

    stopObject(obj)  {
        obj.currentPath = null;
        obj.currentTarget = null;
        obj.currentTargetTile = null;
        this.moveEngine.removeMovable(obj);
    }

    onObjMoveStepBegin(obj, x, y) {
        // Note that mapPos is being updated prior to movement
        obj.currentDirection = getDirection(obj.gridX, obj.gridY, x, y);
        obj.isMoving = true;
        obj.changeVisualToDirection(obj.currentDirection);
       
        this.moveEngine.setMoveParameters(obj, x, y);
        this.moveEngine.addMovable(obj); 
        return true;
      
    }

    onObjMoveStepEnd(obj) {
        obj.currentPathStep--;
        obj.currentTarget = null;
        obj.currentTargetTile = null;
        const pathEnded = (0 > obj.currentPathStep);
        this.moveEngine.removeMovable(obj);
        let forceStop = false;

        // 현재 지나고 있는 타일에 이벤트가 있는지 확인한다
        // 하드코딩으로 이벤트를 지나게 한다
        if (this.onTilePassing) {
            forceStop = this.onTilePassing(obj);
        }

        // 만약에 인터랙티브 타겟이 있고, 길이가 하나 남았으면 정지시킨다.
        if (this.interactTarget && obj.currentPathStep === 0) {
            forceStop = true;
        }
        
        if (!pathEnded && !forceStop) {
            this.moveObjThrough(obj, obj.currentPath.slice(0, obj.currentPath.length-1));
        }
        else {
            // reached to the end of the path
            obj.isMoving = false;
            obj.changeVisualToDirection(obj.currentDirection);

            // 인터랙션 타겟이 있었나?
            if (this.interactTarget) {
                // 캐릭터가 해당 물체를 클릭하였다
                const interactTarget = this.interactTarget;
                this.interactTarget = null; // 먼저 null 로 만들어주어야 한다
                if (this.onTouchObject) {
                    this.onTouchObject(interactTarget);
                }
            }
        }
    }

    highlightPath(currentPath, newPath) {
        if (currentPath)
        {
            for (let i=0; i < currentPath.length; i++)
            {
                const pathItem = currentPath[i];
                if (!newPath || newPath.indexOf(pathItem) === -1)
                {
                    const tile = this.getGroundTileAt(pathItem.x, pathItem.y);
                    tile.setHighlighted(false);
                }
            }
        }
        if (newPath)
        {
            for (let i=0; i < newPath.length; i++)
            {
                const pathItem = newPath[i];
                if (!currentPath || currentPath.indexOf(pathItem) === -1)
                {
                    const tile = this.getGroundTileAt(pathItem.x, pathItem.y);
                    tile.setHighlighted(true);
                }
            }
        }
    }

    checkForTileChange(obj)  {
        const pos = { x: obj.position.x, y: obj.position.y };
        // var tile = this.tileArray[obj.mapPos.r][obj.mapPos.c];
        const tile = this.getGroundTileAt(obj.currentTargetTile.x, obj.currentTargetTile.y);
        // move positions to parent scale
        const vertices = [];
        for (let i=0; i < tile.vertices.length; i++)
        {
            vertices[i] = [tile.vertices[i][0] + tile.position.x, tile.vertices[i][1] + tile.position.y];
        }
        
        if (obj.currentTargetTile.x !== obj.gridX || obj.currentTargetTile.y !== obj.gridY)
        {
            if (isInPolygon(pos, vertices))
            {
                this.arrangeObjLocation(obj, obj.currentTargetTile.x, obj.currentTargetTile.y);
                this.arrangeObjTransperancies(obj, obj.gridX, obj.gridY, obj.currentTargetTile.x, obj.currentTargetTile.y);
                this.arrangeDepthsFromLocation(obj.gridX, obj.gridY);
            }
        }	
    }

    focusBattleCenter() {
        if (true) {
            const px = this.externalCenter.x - this.mapVisualWidthReal / 2 * this.currentScale;
            const py = this.externalCenter.y - this.mapVisualHeightReal / 20 * this.currentScale;

            this.tweens.addTween(this.mapContainer.position, 0.5, { x: px, y: py }, 0, "easeInOut", true);
        }
    }

    focusBattleObject(obj) {
        this.currentFocusLocation = { c: obj.gridX, r: obj.gridY };
        const px = this.externalCenter.x - obj.position.x * this.currentScale;
        const py = this.externalCenter.y - obj.position.y * this.currentScale + 20;

        setTimeout(() => {
            this.tweens.addTween(this.mapContainer.position, 0.5, { x: px, y: py }, 0, "easeInOut", true);
        }, 500)
    }

    checkForFollowCharacter(obj, instantFollow) {
        if (true) {
            this.currentFocusLocation = { c: obj.gridX, r: obj.gridY };
            const px = this.externalCenter.x - obj.position.x * this.currentScale;
            const py = this.externalCenter.y - obj.position.y * this.currentScale;
            
            if (instantFollow) {
                this.mapContainer.position.x = px;
                this.mapContainer.position.y = py;
            } else {
                this.tweens.addTween(this.mapContainer.position, 0.1, { x: px, y: py }, 0, "easeOut_ex", true );
            }
        }
    }

    

    arrangeObjTransperancies(obj, prevX, prevY, x, y) {
        if (true) {
            for (let i = 0; i < this.objectMap.length; ++i) {
                const a = this.objectMap[i];
                if (a) {
                    a.alpha = 1;
                }
            }

            for (let j = y; j < this.mapHeight; ++j) {
                for (let i = 0; i <= x; ++i) {
                    const tile = this.objectMap[i + j * this.mapWidth];
                    if (tile && tile !== obj) {
                        // 충돌체크를 한다
                        const hit = hitTestRectangle(tile.getBounds(), obj.getBounds());
                        if (hit) {
                            tile.alpha = 0.75;
                        }
                    }
                }
            }
        }
    }

    changeObjAlphasInLocation(value, x, y) {
        const a = this.objectContainer[x + y * this.mapWidth];
        if (a) {
            a.alpha = value;
        }
    }
        
    arrangeObjLocation(obj, x, y) {
        this.removeObjRefFromLocation(obj);
        this.addObjRefToLocation(obj, x, y);
    }
    
    arrangeDepthsFromLocation(gridX, gridY) {
        for (let y = gridY; y < this.mapHeight; y++) {
            for (let x = gridX - 1; x >= 0; x--) {
                const a = this.objectMap[x + y * this.mapWidth];
                if (a) {
                    this.objectContainer.addChild(a);
                }
            }
        }
    }

    removeObjRefFromLocation(obj) {
        //const index = obj.gridX + obj.gridY * this.mapWidth;
        //this.objectMap[index] = null;
        this.objectContainer.removeChild(obj);
    }
    
    addObjRefToLocation(obj, x, y) {
        
        obj.gridX = x;
        obj.gridY = y;
      

        //const index = x + y * this.mapWidth;
        //this.objectMap[index] = obj;
        this.objectContainer.addChild(obj);
    }

    update() {
        this.moveEngine.update();
        this.tweens.update();
    }
}