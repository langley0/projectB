import { DIRECTIONS } from './define';
import MoveEngine from './moveengine';
import PathFinder from './pathfinder';
import Tweens from './tweens';

import Tile from './tile/tile';
import Anvil from './tile/anvil';
import Gate from './tile/gate';
import Chest from './tile/chest';
import Prop from './tile/prop';
import InventoryProp from './tile/inventory-prop';
import Stove from './tile/stove';
import WorkTable from './tile/worktable';
import EventEmitter from 'events';

function hitTestRectangle(rect1, rect2) {
    return  (rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y);
};

function hitTestPoint(point, rect) {
    return (rect.x < point.x && 
    point.x < rect.x + rect.width &&
    rect.y < point.y && 
    point.y < rect.y + rect.height);
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
    constructor(name, width, height, tileWidth, tileHeight) {
        super();

        this.name = name;

        this.mapWidth = width;
        this.mapHeight = height;
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
        this.TILE_HALF_W = tileWidth / 2;
        this.TILE_HALF_H = tileHeight / 2;

        
        this.bottomMap = new Array(height * width);
        this.groundMap = new Array(height * width);
        this.objectMap = new Array(height * width);
        this.alphaTiles = [];
        this.nameTiles = [];
       
        this.mapContainer = new PIXI.Container();
        this.addChild(this.mapContainer);

        this.groundContainer = new PIXI.Container();
        this.groundOverlay = new PIXI.Container();
        this.objectContainer = new PIXI.Container();

        this.mapContainer.addChild(this.groundContainer);
        this.mapContainer.addChild(this.groundOverlay);
        this.mapContainer.addChild(this.objectContainer);

        
        this.interactive = true;

        this.pathFinder = new PathFinder(this.mapWidth, this.mapHeight);
        this.moveEngine = new MoveEngine(this);
        this.tweens = new Tweens();

        this.currentScale = 1.0;
            
        this.posFrame = { x : 0, y : 0, w : 980, h : 500 };
        this.externalCenter = {
            x : this.posFrame.w >> 1,
            y : this.posFrame.h >> 1
        };

        this.mapVisualWidthReal = this.getTilePosXFor(this.mapWidth - 1,this.mapHeight - 1) - this.getTilePosXFor(0,0);
	    this.mapVisualHeightReal = this.getTilePosYFor(this.mapWidth - 1,0) - this.getTilePosYFor(0,this.mapHeight - 1);

        this.currentFocusLocation = { x: this.mapWidth >> 1, y: this.mapHeight >> 1 };
        this.centralizeToPoint(this.externalCenter.x, this.externalCenter.y, true);
        
        // 맵에 따라서 이벤트를 바꾸어야 한다
        this.events = {};

        Object.assign(this, new EventEmitter());
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

    setBottomTile(x, y, src) {
        const tile = this.newTile(x, y, src);
        this.bottomMap[x + y * this.mapWidth] = tile;
    }

    setGroundTile(x, y, src) {
        const tile = this.newTile(x, y, src);
        this.groundMap[x + y * this.mapWidth] = tile;
    }

    setObjectTile(x, y, src) {
        const tile = this.newTile(x, y, src);
        const xsize = Math.max(src.xsize, 1);
        const ysize = Math.max(src.ysize, 1);

        for(let j = 0; j < ysize; ++j ) {
            for(let i = 0; i < xsize; ++i ) {
                this.objectMap[(x + i) + (y - j) * this.mapWidth] = tile;
            }
        }
    }
    
    newTile(x, y, tileData) {
        let tile;
        if (tileData.objectType === "gate") {
            tile = new Gate(x, y, tileData);
        } else if (tileData.objectType === "chest") {
            tile = new Chest(x, y, tileData);
        }  else if (tileData.objectType === "anvil") {
            tile = new Anvil(x, y, tileData);
        } else if (tileData.type === "inventory") {
            tile = new InventoryProp(x, y, tileData);
        } else if (tileData.type === "stove") {
            tile = new Stove(x, y, tileData);
        } else if (tileData.type === "worktable") {
            tile = new WorkTable(x, y, tileData);
        } 
        else if (tileData.type !== "groundtile") {
            tile = new Prop(x, y, tileData);
        } else {
            tile = new Tile(x, y, tileData);
        }
        tile.position.x = this.getTilePosXFor(x, y) - this.TILE_HALF_W;
        tile.position.y = this.getTilePosYFor(x ,y) + this.TILE_HALF_H;
        return tile;
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

    // 이것은 나중에 특정 타입의 타일을  얻어오도록 바꾸어야 한다.
    getObjectAt(x, y) {
        return this.objectMap[x + y*this.mapWidth];
    }

    build() {

        // 타일순서를 빌드한다

        // 타일을 순회할때는 밖에 타일부터 안쪽으로 껍질을 깎듯이 내려와야 한다.
        const forEachTile = (callback, layer) => {
            let yoffset = 0
            let xoffset = this.mapWidth - 1;

            while(yoffset < this.mapHeight && xoffset >= 0) {
                for (let y = yoffset; y <= this.mapHeight - 1; ++y) {
                    const x =  xoffset;
                    const index = x + y * this.mapWidth;
                    const tile = layer[index];
                    if (tile) {
                        callback(tile, x, y);
                    }
                }
                
                for (let x = xoffset - 1; x >= 0; --x) {
                    const y = yoffset;
                    const index = x + y * this.mapWidth;
                    const tile = layer[index];
                    if (tile) {
                        callback(tile, x, y);
                    }
                }

                ++yoffset;
                --xoffset;
            }
        }

        forEachTile((tile, x, y) => {
            this.groundContainer.addChild(tile);
        }, this.bottomMap);

        forEachTile((tile, x, y) => {
            this.groundContainer.addChild(tile);
            tile.highlightedOverlay.position = tile.position;

            this.groundOverlay.addChild(tile.highlightedOverlay);
            this.pathFinder.setCell(x, y, tile.movable);
        }, this.groundMap);

        const added = [];

        forEachTile((tile, x, y) => {
            if (added.indexOf(tile) < 0) {
                added.push(tile);
                this.objectContainer.addChild(tile);
            }
            this.pathFinder.setDynamicCell(x, y, tile.movable);
        }, this.objectMap);
    }

    onMouseUp(event) {
        this.checkForTileClick(event.data);
    }

    checkForTileClick(mdata) {
        // 오브젝트가 클릭되었는지 확인한다
        let selected = this.getObjectFromLocalPos(mdata.global);
        if (!selected) {
            // 오브젝트가 아니면 타일이 클릭된 것이다
            const localPoint = this.mapContainer.toLocal(mdata.global);
            selected = this.getTileFromLocalPos(localPoint);
        }

        if (selected && this.onTileSelected) {
            this.onTileSelected(selected.gridX, selected.gridY);
        }
    }

    getObjectFromLocalPos(point) {
        const props = [];
        // TODO : 오브젝트들중에 프랍들을 정렬시킨다
        // 이것을 하는 이유는 프랍이 겹쳤을때 위에 있는 프랍을 찾기 위해서 ..
        // 여기에 컨테이너에 추가된 순서로 정렬이 되어야 하는데 ... 이건 초기에 만들어두는것이 좋지 않을까?
        // --- 현재는 인터랙티브 프랍만 찾아서 필터링하고 있다
        for (const obj of this.objectMap) {
            if (obj instanceof Prop && obj.isInteractive && props.indexOf(obj) < 0 ) {
                props.push(obj);
            }
        }

        // 주어진 프랍의 위치 체크를 한다
        // TODO : 이미지의 픽셀 투명 체크를 해야하는데... 일단 프랍중에 투명체크가 필요할 정도로 투명영역이 큰 프랍이 없다.
        // 나중에 생기면 해야한다.
        for (const obj of props) {
            if (hitTestPoint(point, obj.getBounds())) {
                return obj;
            }
        }
        
        return null;
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
        this.arrangeDepthsFromLocation(character, x, y);
    }

    moveCharacter(character, x, y) {

        const target = this.getInteractiveTarget(x, y);
        const ignoreTarget = target ? true : false;

        // 다음 위치에서부터 시작을 한다
        const startX = character.currentTargetTile ? character.currentTargetTile.x : character.gridX;
        const startY = character.currentTargetTile ? character.currentTargetTile.y : character.gridY;
        const path  = this.pathFinder.solve(startX, startY, x, y, ignoreTarget);

        if (path) {
            // 아웃라인을 제거한다
            if (this.interactTarget instanceof Prop) {
                this.interactTarget.hideOutline();
            }

            if (path[0].x === x && path[0].y === y) {
                // 타겟을 설정한다
                this.interactTarget = target;
                // 아웃라인을 그린다
                if (target instanceof Prop) {
                    target.showOutline();
                }
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
        if (this.interactTarget && path.length === 1) {
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

        // 기존이름프랍들을 제거한다
        for(const prop of this.nameTiles) {
            prop.hideName();
        }
        this.nameTiles = [];
        // 주변에 프랍들을 검색해서 이름표를 띄운다
        const distance = 2;
        for (let j = Math.max(0, obj.gridY - distance); j <= Math.min(this.mapHeight-1, obj.gridY+distance); j++) {
            for (let i = Math.max(0, obj.gridX - distance); i <= Math.min(this.mapWidth-1, obj.gridX+distance); i++) {
                const obj = this.getObjectAt(i, j);
                if (obj instanceof Prop) {
                    obj.showName();
                    this.nameTiles.push(obj);
                }
            }
        }

        // 현재 지나고 있는 타일에 이벤트가 있는지 확인한다
        const tileEvent = this.events[obj.gridX + obj.gridY * this.mapWidth];
        if (tileEvent) {
            tileEvent.call();
            if (tileEvent.forceStop) {
                return;
            }
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

                if (interactTarget instanceof Prop) {
                    interactTarget.hideOutline();
                }
            }

            this.emit('moveend');
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
                    tile && tile.setHighlighted(false);
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
                    tile && tile.setHighlighted(true);
                }
            }
        }
    }

    checkForTileChange(obj)  {
        const pos = { x: obj.position.x, y: obj.position.y };
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
                this.arrangeDepthsFromLocation(obj, obj.gridX, obj.gridY);
            }
        }	
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
        for (const t of this.alphaTiles) {
            t.alpha = 1;
        }
        this.alphaTiles = [];

        for (let j = y; j < this.mapHeight; ++j) {
            for (let i = 0; i <= x; ++i) {
                const tile = this.objectMap[i + j * this.mapWidth];// || [];

                //for (const tile of tiles) {
                    if (tile && tile !== obj && tile.transperancy) {
                        // 충돌체크를 한다
                        const hit = hitTestRectangle(tile.getBounds(true), obj.getBounds(true));
                        if (hit) {
                            tile.alpha = 0.75;
                            this.alphaTiles.push(tile);
                        }
                    }
                //}
            }
        }
    }
        
    arrangeObjLocation(obj, x, y) {
        this.removeObjRefFromLocation(obj);
        this.addObjRefToLocation(obj, x, y);
    }
    
    arrangeDepthsFromLocation(obj, gridX, gridY) {
        let targetIndex = null;
        for (let y = gridY; y < this.mapHeight; y++) {
            for (let x = gridX; x >= 0 ; x--) {
                const tile = this.objectMap[x + y * this.mapWidth];
                if (tile) {
                    const i = this.objectContainer.getChildIndex(tile);
                    targetIndex = targetIndex !== null ? Math.min(i, targetIndex) : i;
                }
            }
        }
        if (targetIndex !== null) {
            this.objectContainer.addChildAt(obj, targetIndex);
        } else {
            this.objectContainer.addChild(obj);
        }
    }

    removeObjRefFromLocation(obj) {
        const index = obj.gridX + obj.gridY * this.mapWidth;
        this.objectMap[index] = null;
        this.objectContainer.removeChild(obj);
    }
    
    addObjRefToLocation(obj, x, y) {
        
        obj.gridX = x;
        obj.gridY = y;
      

        const index = x + y * this.mapWidth;
        this.objectMap[index] = obj;
        this.objectContainer.addChild(obj);
    }

    update() {
        this.moveEngine.update();
        this.tweens.update();
    }
}