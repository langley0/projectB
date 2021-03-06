import EventEmitter from 'events';

import { DIRECTIONS } from './define';
import MoveEngine from './moveengine';
import PathFinder from './pathfinder';
import TiledMap from "./tiledmap";

import Tile from './tile';
import Prop from './prop';

import { Portal3, NextFloorPortal, Portal4, Portal5 } from './event/portal';
import Loader from './loader';

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
        if (y1 < y2) { return DIRECTIONS.SW; }
        else if (y1 > y2) { return DIRECTIONS.NE; }
    }
    else if (y1 === y2) {
        if (x1 < x2) { return DIRECTIONS.SE; }
        else if (x1 > x2)	{ return DIRECTIONS.NW; }
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

function isBoxInFront(box1, box2) {
    // test for intersection x-axis
    if (box1.xmin > box2.xmax) {
        return true;
    } else if (box2.xmin > box1.xmax) {
        return false;
    }
    
    // test for intersection y-axis
    if (box1.ymin > box2.ymax) {
        return true;
    } else if (box2.ymin > box1.ymax) {
        return false;
    }
};

function isBoxInFrontX(box1, box2) {
    // test for intersection x-axis
    if (box1.xmin > box2.xmax) {
        return true;
    } else if (box2.xmin > box1.xmax) {
        return false;
    } else {
        return 0;
    }
};

function isBoxInFrontY(box1, box2) {
    if (box1.ymin > box2.ymax) {
        return true;
    } else if (box2.ymin > box1.ymax) {
        return false;
    }

    if (box1.xmin > box2.xmax) {
        return true;
    } else if (box2.xmin > box1.xmax) {
        return false;
    }
    return 0;
};

// [정리] 지금 Stage쪽이 아주 난잡하고 별에 별 많은것이 섞여있다.. 몬스터 움직임 처리라던가..
export default class Stage extends PIXI.Container {
    constructor(neighbor) {
        super();
        this.neighbor = neighbor;
    }

    // 로딩함수를 시험적으로 비동기로 만들어보자
    // TODO : 일단 만들어보는것이기 때문에 다른곳에도 적용할지는 천천히 고민해보자
    async $load(name) {
        const resourcePath = "assets/mapdata/";
        
        const loader = new Loader();
        loader.add('stage', resourcePath + name + ".json");

        const mapData = (await loader.asyncLoad()).stage.data;

        // 맵데이터로부터 필요한 리소스를 전부 가져온다
        // 나중에 클래스로 만들어야 할 것 같은데!?
        for(const tileset of mapData.tilesets) {
            if (tileset.image) {
                // 타일셋이 이미지 하나를 타일링 해서 쓰고 있는 경우이다
                loader.add(tileset.image, resourcePath + tileset.image);
            }
            if (tileset.tiles) {
                // 타일마다 개별 이미지를 쓰는 경우도 있다
                for(const tile of tileset.tiles) {
                    if (tile.image) {
                        loader.add(tile.image, resourcePath + tile.image);
                    }
                }
            }
        }

        // 기타 리소스들을 읽어온다
        await loader.asyncLoad();

        const map = new TiledMap(mapData);
        
        //호영 테스트 변수
        this.doorCount = 0; // 스테이지 문 갯수
        this.widewallCount = 0; // 넓은 벽 갯수
        this.doorTarget = []; // 스테이지 문 타겟
        //END 호영 테스트 변수

        this.name = name;
        this.mapWidth = map.width;
        this.mapHeight = map.height;
        this.TILE_WIDTH = map.tileWidth;
        this.TILE_HEIGHT = map.tileHeight;
        this.TILE_HALF_W = map.tileWidth / 2;
        this.TILE_HALF_H = map.tileHeight / 2;

        const arraySize = this.mapWidth * this.mapHeight;
        this.bottomMap = new Array(arraySize);
        this.groundMap = new Array(arraySize);
        this.objectMap = new Array(arraySize);
        this.eventMap = new Array(arraySize);
        this.lightMap = new Array(arraySize);

        this.alphaTiles = [];
        this.nameTiles = [];
       
        this.mapContainer = new PIXI.Container();
        this.addChild(this.mapContainer);

        this.bottomContainer = new PIXI.Container();
        this.groundContainer = new PIXI.Container();
        this.groundOverlay = new PIXI.Container();
        this.objectContainer = new PIXI.Container();

        this.mapContainer.addChild(this.bottomContainer);
        this.mapContainer.addChild(this.groundContainer);
        this.mapContainer.addChild(this.groundOverlay);
        this.mapContainer.addChild(this.objectContainer);

        this.monsters = [];
        this.player = null;
        this.footSound = false;
        
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
        
          // 타일셋의 레이어는 총 4종류이다.
          for (const groupName in map.groups) {
            const group = map.groups[groupName];
            for (const layer of group.layers) {
                // 레이어에 맞게 설정한다
                this.loadLayer(layer, group.name, map.width, map.height);
            }
        }

        // object 들의 렌더링 순서대로 빌드한다
        this.buildObjectRederOrder();
    }
    
    loadLayer(layer, group, width, height) {
        // 타일맵을 설정한다
        for (let y = 0; y < height;++y) {
            for (let x = 0; x < width;++x) {
                const tile = layer[x +y * width];
                
                if (tile) {
                    if (group === "bottom") {
                        this.setBottomTile(x, y, tile);
                    } else if (group === "ground") {
                        this.setGroundTile(x, y, tile);
                    } else if (group === "object") {
                        this.setObjectTile(x, y, tile);
                    } else if (group === "event") {
                        this.setEventTile(x, y, tile);
                    } else if (group === "light") {
                        this.setLightTile(x, y, tile);
                    } else {
                        throw Error("invalid group :" + group);
                    }
                }
            }
        }
    }

    setTags(tags) {
        this.tags = tags;
    }

    setBottomTile(x, y, src) {
        const tile = this.newTile(x, y, src);
        if (!this.bottomMap[x + y * this.mapWidth]) {
            this.bottomMap[x + y * this.mapWidth] = tile;
        }
        this.bottomContainer.addChild(tile);
    }

    setGroundTile(x, y, src) {
        for(let j = 0; j < src.xsize; ++j ) {
            for(let i = 0; i < src.ysize; ++i ) {
                const cx = x - i;
                const cy = y - j;
                if (cx >= 0 && cy >= 0) {
                    
                    // 나중에 하이라이트와 픽킹 부분을 따로처리한다
                    const tile = this.newTile(cx, cy, src);
                    tile.highlightedOverlay.position = tile.position;
                    
                    this.groundOverlay.addChild(tile.highlightedOverlay);
                    this.pathFinder.setCell(cx, cy, tile.movable);
                    this.groundMap[cx + cy*this.mapWidth] = tile;

                    // 텍스쳐는 최초 하나만 설정한다
                    if (i === 0 && j === 0) {
                        this.groundContainer.addChild(tile);
                    }
                }
            }
        }
    }

    // [정리] 미리 생성된 맵을 사용하는 경우, 층을 올라가는 경우, 그밖의 경우가 전부 다르게 짜여저 있어서 포탈 Class도 여러개인데.. 어떻게 처리해야할까
    setEventTile(x, y, tile) {
        if (tile.name === 'up' || tile.name === 'down' || tile.name === 'left' || tile.name === 'right') {
            if (this.neighbor.output === tile.name) {
                this.eventMap[x + y * this.mapWidth] = new NextFloorPortal(x, y, tile);
            } else if (this.neighbor[tile.name]) {
                this.eventMap[x + y * this.mapWidth] = new Portal3(x, y, tile);
            } else {
                this.eventMap[x + y * this.mapWidth] = new Portal4(x, y, tile);
            }
        } else if(tile.name === 'portalway') {
            this.eventMap[x + y * this.mapWidth] = new Portal4(x, y, tile);
        } else if (tile.name === 'nextFloor') {
            this.eventMap[x + y * this.mapWidth] = new NextFloorPortal(x, y, tile);
        } else {
            this.eventMap[x + y * this.mapWidth] = new Portal5(x, y, tile);
        }
        this.pathFinder.setCell(x, y, true);
    }

    setLightTile(x, y, src) {
        let findPos = {
            x: x,
            y: y
        };

        while (!this.groundMap[findPos.x + findPos.y * this.mapWidth]) {
            findPos.x++;
            findPos.y++;
        }

        const tile = this.newTile(findPos.x, findPos.y, src);
        for(let j = 0; j < src.xsize; ++j ) {
            for(let i = 0; i < src.ysize; ++i ) {
                const cx = findPos.x - i;
                const cy = findPos.y - j;
                if (cx >= 0 && cy >= 0) {
                    this.lightMap[cx + cy * this.mapWidth] = tile;
                }
            }
        }
    }

    setObjectTile(x, y, src) {
        const tile = this.newTile(x, y, src);
        for(let j = 0; j < src.xsize; ++j ) {
            for(let i = 0; i < src.ysize; ++i ) {
                const cx = x - i;
                const cy = y - j;
                if (cx >= 0 && cy >= 0) {
                    this.objectMap[cx + cy * this.mapWidth] = tile;
                    this.setObjectEmitter(tile);
                }
            }
        }
    }
    
    newTile(x, y, tileData) {
        let tile;
        //호영 테스트
        if( tileData.type == "random_wall" ){ // 랜덤 벽일때
            
            tileData.randomImage = new Array(tileData.imgCount?tileData.imgCount:0); // 이미지 숫자로 랜덤이미지의 배열을 선언
            for(var i=0; i < tileData.imgCount; i++){
                tileData.randomImage[i] = eval('tileData.random_image'+i); // 카운트된 수의 랜덤 이미지 넘버를 각각의 배열에 넣는다.
            }
            tileData.doorImage = new Array(tileData.doorCount?tileData.doorCount:0); // 이미지 숫자로 랜덤이미지의 배열을 선언
            for(var i=0; i < tileData.doorCount; i++){
                tileData.doorImage[i] = eval('tileData.door_image'+i); // 카운트된 수의 랜덤 이미지 넘버를 각각의 배열에 넣는다.
            }
            tileData.stairImage = new Array(tileData.stairCount?tileData.stairCount:0); // 이미지 숫자로 랜덤이미지의 배열을 선언
            for(var i=0; i < tileData.stairCount; i++){
                tileData.stairImage[i] = eval('tileData.stair_image'+i); // 카운트된 수의 랜덤 이미지 넘버를 각각의 배열에 넣는다.
            }

            let wallCount = Math.floor( Math.random() * (tileData.randomImage.length)); // 랜덤하게 이미지를 선택한다.
            let doorCount = Math.floor( Math.random() * (tileData.doorImage.length)); // 랜덤하게 이미지를 선택한다.
            let stairCount = Math.floor( Math.random() * (tileData.stairImage.length)); // 랜덤하게 이미지를 선택한다.

            var randomProperties = {
                id: wallCount,
                imageArray: tileData.randomImage,
                type: 'wall'
            }; // 랜덤수 초기화

            if( tileData.widewall == true ) { // 그리는 벽이 넓은 벽일때
                // 벽이면 체크하고, 없으면 랜덤벽 만들자.
                if (tileData.name === 'castle_wall_door1' && (this.neighbor.up || this.neighbor.input == 'up')) {
                    // up
                    randomProperties.id = doorCount; // 문을 선택. 문은 항상 random_image0 값에 들어있다.
                    randomProperties.imageArray = tileData.doorImage;
                    randomProperties.type = 'door';
                } else if (tileData.name === 'castle_wall_door2' && this.neighbor.down) {
                    // down
                    // randomProperties.id = doorCount;
                    randomProperties.id = 0; // 문을 선택. 문은 항상 random_image0 값에 들어있다.
                    randomProperties.imageArray = tileData.doorImage;
                    randomProperties.type = 'door';
                } else if (tileData.name === 'castle_wall_door3' && (this.neighbor.left || this.neighbor.input == 'left')) {
                    // left
                    randomProperties.id = doorCount; // 문을 선택. 문은 항상 random_image0 값에 들어있다.
                    randomProperties.imageArray = tileData.doorImage;
                    randomProperties.type = 'door';
                } else if (tileData.name === 'castle_wall_door4' && this.neighbor.right) {
                    // right
                    // randomProperties.id = doorCount;
                    randomProperties.id = 0; // 문을 선택. 문은 항상 random_image0 값에 들어있다.
                    randomProperties.imageArray = tileData.doorImage;
                    randomProperties.type = 'door';
                } else if( tileData.name === 'castle_wall_door2' && this.neighbor.input == 'down' ){
                    randomProperties.id = 1;
                    randomProperties.imageArray = tileData.doorImage;
                    randomProperties.type = 'door';
                } else if( tileData.name === 'castle_wall_door4' && this.neighbor.input == 'right' ){
                    randomProperties.id = 1;
                    randomProperties.imageArray = tileData.doorImage;
                    randomProperties.type = 'door';
                } else if(tileData.name === 'castle_wall_door3' && this.neighbor.output == 'left') {
                    randomProperties.id = stairCount; // 문을 선택. 문은 항상 random_image0 값에 들어있다.
                    randomProperties.imageArray = tileData.stairImage;
                    randomProperties.type = 'door';
                } else if(tileData.name === 'castle_wall_door1' && this.neighbor.output == 'up') {
                    randomProperties.id = stairCount; // 문을 선택. 문은 항상 random_image0 값에 들어있다.
                    randomProperties.imageArray = tileData.stairImage;
                    randomProperties.type = 'door';
                }

                if ( randomProperties.type === 'door'){ // 문의 갯수가 4개보다 작고 선택된 벽이 문일때
                    this.doorTarget.push(tileData.name);
                }
            }
            
            if(randomProperties.imageArray[randomProperties.id] === undefined ){ // 이미지가 1개이고 문이 선택되지 않았을때
                tileData.texture = false; //이미지를 그리지 않는다.
                tileData.movable = true;
            } else {
                tileData.texture = PIXI.Texture.fromFrame(randomProperties.imageArray[randomProperties.id]); // 선택된 이미지를 그린다.
                
                const isWindow = randomProperties.imageArray[randomProperties.id].indexOf('window') >= 0;
                const flip = randomProperties.imageArray[randomProperties.id].indexOf('flip') >= 0;
                if (isWindow) {
                    let pos = {};
                    let light = {
                        type: "light",
                        xsize: 1,
                        ysize: 1,
                        blendMode: 'OVERLAY',
                        offsetX: 0,
                        offsetY: 14
                    };
                    if (flip) {
                        light.texture = PIXI.Texture.fromFrame('castle_window_light_left.png');
                        pos.x = x+1;
                        pos.y = y-3;
                        light.offsetX = -14;
                    } else {
                        light.texture = PIXI.Texture.fromFrame('castle_window_light_right.png');
                        pos.x = x-4;
                        pos.y = y+1;
                        light.offsetX = -55;
                        light.offsetY = 20;
                    }
                    const lightTile = this.newTile(pos.x, pos.y, light);
                    this.lightMap[pos.x + pos.y * this.mapWidth] = lightTile;
                }
            }
            
            tile = Prop.New(tileData.type, x, y, tileData);
        } else if( tileData.type == "door_portal"){
            if ( this.doorTarget.indexOf(tileData.target) < 0 ){
                tileData.texture = false;
            }
            tile = Prop.New(tileData.type, x, y, tileData);
        } else if( tileData.type == "door_object"){
            if ( this.doorTarget.indexOf(tileData.target) < 0 || tileData.name === this.neighbor.input ){
                if( tileData.stair ){
                    if( tileData.direction != this.neighbor.input ){
                        tileData.texture = false;
                    }
                }
            } else {
                tileData.texture = false;
            }
            tile = Prop.New(tileData.type, x, y, tileData);
        } 
        else if( tileData.type == "random_object" ) {
            
            tileData.randomImage = new Array(tileData.imgCount?tileData.imgCount:0); // 이미지 숫자로 랜덤이미지의 배열을 선언
            for(var i=0; i < tileData.imgCount; i++){
                tileData.randomImage[i] = eval('tileData.random_image'+i); // 카운트된 수의 랜덤 이미지 넘버를 각각의 배열에 넣는다.
            }
            
            tileData.recipeImage = new Array(tileData.recipeCount?tileData.recipeCount:0); // 이미지 숫자로 랜덤이미지의 배열을 선언
            for(var i=0; i < tileData.recipeCount; i++){
                tileData.recipeImage[i] = eval('tileData.recipe_image'+i); // 카운트된 수의 랜덤 이미지 넘버를 각각의 배열에 넣는다.
            }

            let objectCount = Math.floor( Math.random() * (tileData.randomImage.length)); // 랜덤하게 이미지를 선택한다.
            let recipeCount = Math.floor( Math.random() * (tileData.recipeImage.length));
            
            var randomProperties = {
                id: objectCount,
                imageArray: tileData.randomImage,
                type: 'object'
            }; // 랜덤수 초기화

            if( tileData.freeFlip == true ){
                var randomFlip = Math.floor( Math.random() * (2)); 

                if( randomFlip < 1 ){
                    tileData.flipX = true;
                }
            }

            
            if( tileData.recipeCount == 1 ) {
                var randomRecipe = Math.floor( Math.random() * (2)); 

                if( randomRecipe < 1 ){
                    randomProperties.id = recipeCount;
                    randomProperties.imageArray = tileData.recipeImage;
                    randomProperties.type = 'recipe';

                    if ( randomProperties.type === 'recipe'){
                        this.doorTarget.push(tileData.name);
                    }
                }
            }

            

            if(randomProperties.imageArray[randomProperties.id] === undefined ){ // 이미지가 1개이고 문이 선택되지 않았을때
                tileData.texture = false; //이미지를 그리지 않는다.
                tileData.movable = true;
            } else {
                tileData.texture = PIXI.Texture.fromFrame(randomProperties.imageArray[randomProperties.id]); // 선택된 이미지를 그린다.
            }

            tile = Prop.New(tileData.type, x, y, tileData);
        } else if (tileData.type === "light") {
            tileData.imageOffset = {
                x: Number(tileData.offsetX),
                y: Number(tileData.offsetY)
            };
            tile = Prop.New(tileData.type, x, y, tileData);
        }
        else if (tileData.type !== "groundtile") {
            if (this.neighbor && this.neighbor.output && tileData.type === 'stair_portal') {
                if (tileData.ysize > 1 && this.neighbor.output === "left") {
                    tileData.texture = false;
                } else if (tileData.xsize > 1 && this.neighbor.output === "up") {
                    tileData.texture = false;
                }
            }
            tile = Prop.New(tileData.type, x, y, tileData);
        } else {
            tile = new Tile(x, y, tileData);
        }
        tile.position.x = this.getTilePosXFor(x, y) - this.TILE_HALF_W;
        tile.position.y = this.getTilePosYFor(x ,y) + this.TILE_HALF_H;
        
        
        return tile;
        
    }

   
    getTilePosXFor = function(c, r) {
        return (c - r ) * this.TILE_HALF_W;
    };

    getTilePosYFor = function(c, r) {
        return (r +c ) *  this.TILE_HALF_H;
    }
    
    getGroundTileAt(x, y) {
       return this.groundMap[x + y*this.mapWidth];
    }

    // 이것은 나중에 특정 타입의 타일을  얻어오도록 바꾸어야 한다.
    getObjectAt(x, y) {
        return this.objectMap[x + y*this.mapWidth];
    }

    buildObjectRederOrder() {
        const objects = {};
        for (let y = 0; y < this.mapHeight;++y) {
            for (let x = 0; x < this.mapWidth;++x) {
                const tile = this.objectMap[x + y * this.mapWidth];
                if (tile) {
                    if (objects[tile.groupId]) {
                        tile.xmin = Math.min(tile.xmin, x);
                        tile.xmax = Math.max(tile.xmax, x);
                        tile.ymin = Math.min(tile.ymin, y);
                        tile.ymax = Math.max(tile.ymax, y);
                    } else {
                        objects[tile.groupId] = tile;
                        tile.xmin = tile.xmax = x;
                        tile.ymin = tile.ymax = y;
                    }
                    this.pathFinder.setDynamicCell(x, y, tile.movable);
                }
            }
        }

        const sortedObjects = [];
        for (const groupId in objects) {

            const obj = objects[groupId];
            for (let i = 0; i < sortedObjects.length; i++) {
                if (isBoxInFront(obj, sortedObjects[i])) {
                    sortedObjects.splice(i, 0, obj);
                    break;
                } 
            }

            // 마지막까지 왔는데 추가되지 못했다
            if (sortedObjects.indexOf(obj) < 0) {
                sortedObjects.push(obj);
            }
        }

        for (let y = 0; y < this.mapHeight;++y) {
            for (let x = 0; x < this.mapWidth;++x) {
                const light = this.lightMap[x + y * this.mapWidth];
                if (light) {
                    sortedObjects.splice(0,0,light);
                }
            }
        }

        for (const obj of sortedObjects.reverse()) {
            // 역순으로 뒤에 있는 것을 먼저 추가한다
            this.objectContainer.addChild(obj);
            
        }
    }

    applyTag(tag) {
        // 각 프랍들에게 tag 를 적용한다
        for(const prop of this.objectMap) {
            if (prop) {
                prop.applyTag(tag);
            }
        }
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
            if (obj && obj.isInteractive && props.indexOf(obj) < 0 ) {
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
                        return this.eventMap[index] || this.groundMap[index];
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
        this.player = character;

        character.position.x = px;
        character.position.y = py;

        character.container.position.x = - this.TILE_HALF_W;
        character.container.position.y = this.TILE_HALF_H;

        this.addObjRefToLocation(character, x, y);
        this.arrangeDepthsFromLocation(character, x, y);
    }

    removeCharacter(character) {
        this.stopObject(character);
        this.removeObjRefFromLocation(character);
    }

    moveCharacter(character, x, y) {
        const target = this.getInteractiveTarget(x, y);
        const ignoreTarget = target ? true : false;

        // 다음 위치에서부터 시작을 한다
        const startX = character.currentTargetTile ? character.currentTargetTile.x : character.gridX;
        const startY = character.currentTargetTile ? character.currentTargetTile.y : character.gridY;
        let path = this.pathFinder.solve(startX, startY, x, y, ignoreTarget);
        if (target) {
            // 타겟이 있다면 타겟의 사이즈만큼을 계산해서 가장 가까운 곳으로 이동한다
            for(let j = target.ymin; j <= target.ymax; ++j ) {
                for(let i = target.xmin; i < target.xmax; ++i ) {
                    const candidate = this.pathFinder.solve(startX, startY, i, j, ignoreTarget);
                    if(!candidate) {
                        // do nothing
                    } else if (!path) {
                        path = candidate;
                    } else if (candidate.length < path.length) {
                        path = candidate;
                    }
                }
            }
        }

        if (path) {
            // 아웃라인을 제거한다
            if (this.interactTarget && this.interactTarget.isInteractive) {
                this.interactTarget.hideOutline();
            }

            if (target) {
                // 타겟을 설정한다
                this.interactTarget = target;
                // 아웃라인을 그린다
                if (target && target.isInteractive) {
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
        } else {
            return this.eventMap[x + y * this.mapWidth];
        }
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

        if (this.interactTarget && this.interactTarget.isInteractive && path.length === 1) {
            this.stopObject(obj);
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
        this.highlightPath(obj.currentPath, null);
        obj.currentPath = null;
        obj.path = undefined;
        obj.newPath = undefined;
        obj.currentTarget = null;
        obj.currentTargetTile = null;
        obj.isMoving = false;
        obj.animate('idle',true);
        obj.currentPathStep = 0;
        this.moveEngine.removeMovable(obj);
    }

    onObjMoveStepBegin(obj, x, y) {
        // Note that mapPos is being updated prior to movement
        obj.currentDirection = getDirection(obj.gridX, obj.gridY, x, y);
        obj.isMoving = true;
        obj.changeVisualToDirection(obj.currentDirection);
       
        this.moveEngine.setMoveParameters(obj, x, y);
        this.moveEngine.addMovable(obj); 
        this.footSound = !this.footSound;
        if (this.footSound) {
            Sound.playSound('foot_step.wav', { singleInstance: true });
        }
        return true;
      
    }

    onObjMoveStepEnd(obj) {
        obj.currentPathStep--;
        obj.currentTarget = null;
        obj.currentTargetTile = null;
        const pathEnded = (0 > obj.currentPathStep);
        this.moveEngine.removeMovable(obj);

        // 기존이름프랍들을 제거한다
        for(const prop of this.nameTiles) {
            prop.hideName();
        }
        this.nameTiles = [];
        // 주변에 프랍들을 검색해서 이름표를 띄운다
        const distance = 5;
        for (let j = Math.max(0, obj.gridY - distance); j <= Math.min(this.mapHeight-1, obj.gridY+distance); j++) {
            for (let i = Math.max(0, obj.gridX - distance); i <= Math.min(this.mapWidth-1, obj.gridX+distance); i++) {
                const obj = this.getObjectAt(i, j);
                if (obj && obj.isInteractive) {
                    obj.showName();
                    this.nameTiles.push(obj);
                }
            }
        }

        
        if (!pathEnded) {
            this.moveObjThrough(obj, obj.currentPath.slice(0, obj.currentPath.length-1));
        }
        else if(obj.newPath) {
            this.moveObjThrough(obj, obj.newPath);
        } else {
            // reached to the end of the path
            this.footSound = false;
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

                if (interactTarget && interactTarget.isInteractive) {
                    interactTarget.hideOutline();
                }
            }

            // 마지막 타일의 선택을 지운다
            this.highlightPath(obj.currentPath, null);
            this.emit('moveend');
        }

        // 던전의 포털 밟았는가.
        const index = obj.gridX + obj.gridY * this.mapWidth;
        if (this.eventMap[index] && obj.currentPath && obj.currentPath.length <= 2) {
            if (this.onEvent) {
                this.onEvent(this.eventMap[index]);
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
                //this.arrangeObjTransperancies(obj, obj.gridX, obj.gridY, obj.currentTargetTile.x, obj.currentTargetTile.y);
                this.arrangeDepthsFromLocation(obj, obj.gridX, obj.gridY);
            }
        }	
    }

    checkForFollowCharacter(obj, instantFollow) {
        if (true) {
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

    /*arrangeObjTransperancies(obj, prevX, prevY, x, y) {
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
    }*/
        
    arrangeObjLocation(obj, x, y) {
        this.removeObjRefFromLocation(obj);
        this.addObjRefToLocation(obj, x, y);
    }
    
    arrangeDepthsFromLocation(obj, gridX, gridY) {
        let targetIndex = null;
        for (let y = gridY; y < this.mapHeight; y++) {
            for (let x = gridX; x < this.mapWidth ; x++) {
                let prop = this.objectMap[x + y * this.mapWidth];

                if (prop) {
                    const i = this.objectContainer.getChildIndex(prop);
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
        let deleteFlag = true;
        while (deleteFlag) {
            const index = this.objectMap.indexOf(obj);

            if (index >= 0) {
                this.objectMap[index] = null;
            } else {
                deleteFlag = false;
            }
        }
        
        this.objectContainer.removeChild(obj);
    }
    
    addObjRefToLocation(obj, x, y) {
        
        obj.gridX = x;
        obj.gridY = y;
      

        const index = x + y * this.mapWidth;
        this.objectMap[index] = obj;
        this.objectContainer.addChild(obj);
    }

    findEventByName(name) {
        for(let i = 0; i <  this.eventMap.length; ++i) {
            const event = this.eventMap[i];
            if (event && event.name === name) {
                return event;
            }
        }
        return null;
    }

    update() {
        this.moveEngine.update();
        this.tweens.update();
    }

    // 심대수 작성 ===================================================================================
    // [정리] 미리 생성된 맵에 포탈을 달아주기 위해 있는부분이다.
    setStagePortal(portals) {
        const outDir = {
            up: 'down',
            left: 'right',
            right: 'left',
            down: 'up'
        }
        this.eventMap.forEach((event) => {
            if(event) {
                event.targetStage = portals[event.name];
                event.to = outDir[event.name];
            }
        });
    }

    getTileMovable(x, y) {
        let result = true;

        if (this.groundMap[x + y * this.mapWidth]) {
            result = result && this.groundMap[x + y * this.mapWidth];
        }
        
        return result;
    }

    // Emitter가 있는 obj일 경우, emitter 설정해준다.
    setObjectEmitter(obj) {
        if (obj.hasEmitter && !obj.hasListener) {
            obj.hasListener = true;
            obj.on('delete', () => {
                // 같은 그룹 ID 모두 제거하며, 해당 좌표의 그라운드가 있는지 판별하여 movable 넣어준다. => 어떤 때 문제가 발생할 수 있을까..?
                this.deleteObj(obj);
            });
            obj.on('deleteList', () => {
                const isMonsterIndex = this.monsters.indexOf(obj);
                if (isMonsterIndex >= 0) {
                    this.monsters.splice(isMonsterIndex, 1);
                }
            });
            obj.on('move', () => {
                const path = this.getRandomPath(obj);
                this.moveMonster(obj, path);
            });
        }
    }

    // [정리] 몬스터의 움직임을 처리하기 위해 존재한다. 여기 있는것이 맞는가?
    getRandomPositions(xsize, ysize, tileSet) {
        const tileList = [];

        for (let key in tileSet) {
            const directionTiles = tileSet[key];

            directionTiles.forEach((tile) => {
                let emptyFlag = true;
    
                for (let y = 0; y < ysize; y++) {
                    for (let x = 0; x < xsize; x++) {
                        if (!this.pathFinder.isMovable(tile.gridX - x, tile.gridY - y)) {
                            emptyFlag = false;
                        }
                    }
                }
    
                for (let y = -1; y < ysize+1; y++) {
                    for (let x = -1; x < xsize+1; x++) {
                        if (this.eventMap[(tile.gridX - x) + (tile.gridY - y) * this.mapWidth] && !(this.eventMap[(tile.gridX - x) + (tile.gridY - y) * this.mapWidth] instanceof Portal4)) {
                            emptyFlag = false;
                        }
                    }
                }
    
                // 해당 좌표에 오브젝트가 없고, 해당 좌표의 무버블이 1이여야함. => 움직일 수 있는 좌표를 찾아본다.
                if (tile && emptyFlag) {
                    tileList.push({key:key, tile: tile});
                }
            });
        }

        const tileData = tileList[Math.round(Math.random() * (tileList.length - 1))];

        if (tileData) {
            return {
                x: tileData.tile.gridX,
                y: tileData.tile.gridY,
                direction: tileData.key
            };
        } else {
            return false;
        }
    }

    // [정리] 몬스터의 움직임 경로를 찾아내기위해 존재하는데.. 여기있는게 맞나 싶다.
    getRandomPath(obj) {
        const tileList = [];
        let toTile = null;

        this.groundMap.forEach((tile) => {
            if (tile) {
                tileList.push(tile);
            }
        });

        toTile = tileList[Math.round(Math.random() * (tileList.length-1))];
        let path = [].concat(this.pathFinder.solve(obj.gridX, obj.gridY, toTile.gridX, toTile.gridY, false));

        if (path && path[0] === null) {
            path = [];
        }

        return path.reverse();
    }

    // [정리] 오브젝트가 플레이어에게 가는 Path를 구한 뒤, 끝에 Path 3개 를 붙이고 리버스 하는 이유는, 초기에 움직이기 전, Delay를 주기 위함이다.
    getPlayerPath(obj) {
        let path = [].concat(this.pathFinder.solve(obj.gridX, obj.gridY, this.player.gridX, this.player.gridY, false));

        if (path && path[0] === null) {
            path = [];
        } else {
            path.splice(0, 1);
        }
        // 플레이어에게 향하기 전, 잠시 딜레이를 주기위해 제자리걸음 3칸 한다.
        path.push({x:obj.gridX, y:obj.gridY});
        path.push({x:obj.gridX, y:obj.gridY});
        path.push({x:obj.gridX, y:obj.gridY});

        return path.reverse();
    }

    // [정리] 몬스터의 움직임을 처리한다. 계속해서 움직이고, 플레이어 발견 시, 정지하고 플레이어에게 걸어간다.
    moveMonster(obj, path, callback) {
        if (obj.isStop) {
            return;
        }
        if (path.length === 0) {
            if (callback) {
                callback();
            } else {
                obj.move();
            }
            return;
        }
        

        // 여기에서 플레이어 전투 판정.. => 플레이어를 바라보고, 전투를 시작한다.
        if (this.player) {
            const dist = Math.sqrt((this.player.gridX - obj.gridX)**2 + (this.player.gridY - obj.gridY)**2);

            // 범위안에 들어왔으니 전투씬 진입.
            if (dist <= 5 && !obj.battle) {
                this.leave();
                obj.changeVisualToDirection(obj.currentDirection);
                obj.tileTexture.isMoving = true;
                obj.isStop = false;
                obj.battle = true;
                obj.showBattleIcon();
                this.stopObject(this.player);
                this.interactTarget = null;
                this.onObjMoveStepEnd(this.player);
                this.player.position.x = this.getTilePosXFor(this.player.gridX, this.player.gridY);
                this.player.position.y = this.getTilePosYFor(this.player.gridX, this.player.gridY);

                this.emit('seePlayer');
                Sound.playSound('alert_1.mp3', { singleInstance: true });
                path = this.getPlayerPath(obj);
                callback =  () => {
                    obj.currentDirection = getDirection(obj.gridX, obj.gridY, this.player.gridX, this.player.gridY);
                    obj.tileTexture.isMoving = false;
                    obj.tileTexture.changeVisualToDirection(obj.currentDirection);

                    this.player.changeVisualToDirection(getDirection(this.player.gridX, this.player.gridY, obj.gridX, obj.gridY));
                    this.leave();
                    this.emit('battle', obj);
                };
            }
        }
        
        obj.currentDirection = getDirection(obj.gridX, obj.gridY, path[0].x, path[0].y);
        obj.tileTexture.isMoving = true;
        obj.tileTexture.changeVisualToDirection(obj.currentDirection);

        // 해당자리 Movable변경,
        const groundTile = this.getGroundTileAt(obj.gridX, obj.gridY);
        this.pathFinder.setDynamicCell(obj.gridX, obj.gridY, groundTile?groundTile.movable:false);
        this.pathFinder.setDynamicCell(path[0].x, path[0].y, false);

        const to = {
            x: this.getTilePosXFor(path[0].x, path[0].y) - this.TILE_HALF_W,
            y: this.getTilePosYFor(path[0].x, path[0].y) + this.TILE_HALF_H
        };

        this.arrangeObjLocation(obj, path[0].x, path[0].y);
        this.arrangeDepthsFromLocation(obj, path[0].x, path[0].y);
        path.splice(0, 1);
        // Monster Speed
        const speed = 0.3;

        this.tweens.addTween(obj.position, speed, { x: to.x, y: to.y }, 0, "linear", true , () => {
            obj.tileTexture.isMoving = false;
            this.moveMonster(obj, path, callback);
        });
    }

    deleteObj(obj) {
        const isMonsterIndex = this.monsters.indexOf(obj);
        if (isMonsterIndex >= 0) {
            this.monsters.splice(isMonsterIndex, 1);
        }
        for (let y=obj.ymin; y<=obj.ymax; y++) {
            for (let x=obj.xmin; x<= obj.xmax; x++) {
                const groundTile = this.getGroundTileAt(x, y);
                this.pathFinder.setDynamicCell(x, y, groundTile?groundTile.movable:false);
            }
        }
        this.removeObjRefFromLocation(obj);
    }

    // [정리] 각 스테이지에 Enter되었을 때 발생하는 상황들인데. 하드코딩 되어있다. 따로 뺄 수 있을 것 같은데..
    enter() {
        // 중간보스룸 컷씬
        if (this.name === 'castle_boss-final') {
            if (this.monsters.length > 0) {
                this.emit('playcutscene', 9);
            } else {
            }
        } else if (this.name === 'castle_boss-middle') {
            this.monsters.forEach((monster) => {
                monster.currentDirection = getDirection(monster.gridX, monster.gridY, monster.gridX, monster.gridY + 1);
                monster.changeVisualToDirection(monster.currentDirection);
            });

            // 밀루다층 하드코딩.
            if (this.tags.indexOf('hasarcher') >= 0) {
                if (this.monsters.length > 0) {
                    this.emit('playcutscene', 8);
                }
            } else {
                if (this.monsters.length > 0) {
                    this.emit('playcutscene', 6);
                } else {
                    this.emit('playcutscene', 7);
                }
            }
        } else {
            this.monsters.forEach((monster) => {
                monster.move();
            });
        }
    }

    leave() {
        this.monsters.forEach((monster) => {
            monster.stop();
        });
    }

    // 몬스터를 해당 좌표에 찍어낸다. 어디서 호출해야 하는가?
    // 최초 Map Generator에서 생성 시, 몬스터를 찍어내도록 하는것은 어떨까?..
    addMonster(monster, monsterOptions) {
        // 임시 하드코딩. 다음엔 Generate 된 몬스터 파티를 받도록 하자.
        const spawnPos = monsterOptions.pos?monsterOptions.pos:this.getRandomPositions(1, 1, { ne:this.groundMap });
        const options = {  type: monsterOptions.type, src: monster };

        const prop = this.newTile(spawnPos.x, spawnPos.y, options);
        this.pathFinder.setDynamicCell(prop.gridX, prop.gridY, false);

        this.addObjRefToLocation(prop, spawnPos.x, spawnPos.y);
        this.arrangeDepthsFromLocation(prop, spawnPos.x, spawnPos.y);
        this.setObjectEmitter(prop);
        
        this.monsters.push(prop);
    }

    // 상자를 배치하기 위해 만들어진 함수인데.. 제약사항이 너무 많다. 생성 요청 시 생성되지 않을때도 있다. 찍어낼 수 있는 좌표가 없을때가 있다.
    addProp(options, directions) {
        const tiles = this.getPropPositions({
            xMin: 2,
            yMin: 2
        },{
            xSize: options.xsize,
            ySize: options.ysize,
            directions: directions?directions:{
                ne: true,
                nw: true,
                se: true,
                sw: true,
            }
        });
        let spawnPos = this.getRandomPositions(options.xsize, options.ysize, tiles);

        if (spawnPos) {
            options.direction = spawnPos.direction;
            const prop = this.newTile(spawnPos.x, spawnPos.y, options);
            for (let y=0;y<options.ysize;y++) {
                for (let x=0;x<options.xsize;x++) {
                    this.pathFinder.setDynamicCell(prop.gridX - x, prop.gridY - y, false);
                }
            }
    
            this.addObjRefToLocation(prop, spawnPos.x, spawnPos.y);
            this.arrangeDepthsFromLocation(prop, spawnPos.x, spawnPos.y);
            this.setObjectEmitter(prop);
        }
    }

    // 오브젝트가 위치할 수 있는 맵의 타일을 읽어온다. 문제는 방향이 미리 정해져 있어야 한다는 것 이다.
    getPropPositions(offset, options) {
        const mapData = {
            xMin: null,
            yMin: null,
            xMax: null,
            yMax: null,
            centerX: null,
            centerY: null
        };

        this.groundMap.forEach((tile) => {
            if (tile && (mapData.xMin > tile.gridX || mapData.xMin === null)) {
                mapData.xMin = tile.gridX;
            }
            if (tile && (mapData.xMax < tile.gridX || mapData.xMax === null)) {
                mapData.xMax = tile.gridX;
            }
            if (tile && (mapData.yMin > tile.gridY || mapData.yMin === null)) {
                mapData.yMin = tile.gridY;
            }
            if (tile && (mapData.yMax < tile.gridY || mapData.yMax === null)) {
                mapData.yMax = tile.gridY;
            }
        });
        let mapOffset = Object.assign({
            xMin: 0,
            xMax: 0,
            yMin: 0,
            yMax: 0
        }, offset);

        for (let key in mapOffset) {
            mapData[key] += mapOffset[key];
        }

        mapData.centerX = Math.floor((mapData.xMin + mapData.xMax) / 2);
        mapData.centerY = Math.floor((mapData.yMin + mapData.yMax) / 2);
        
        const resultTiles = {ne:[], nw:[], se:[], sw:[]};
        // 모서리는 각 xMin, xMax, yMin, yMax의 타일이다.
        this.groundMap.forEach((tile) => {
            // 모서리 타일 추가.
            if (tile && tile.gridX <= mapData.xMax && tile.gridX >= mapData.xMin && tile.gridY === mapData.yMin && options && options.xSize >= options.ySize && options.directions.ne) {
                resultTiles.ne.push(tile);
            } else if (tile && tile.gridX <= mapData.xMax && tile.gridX >= mapData.xMin && tile.gridY === mapData.yMax && options.xSize >= options.ySize && options.directions.sw) {
                resultTiles.sw.push(tile);
            } else if (tile && tile.gridY <= mapData.yMax && tile.gridY >= mapData.yMin && tile.gridX === mapData.xMin && options.xSize <= options.ySize && options.directions.nw) {
                resultTiles.nw.push(tile);
            } else if (tile && tile.gridY <= mapData.yMax && tile.gridY >= mapData.yMin && tile.gridX === mapData.xMax && options.xSize <= options.ySize && options.directions.se) {
                resultTiles.se.push(tile);
            }
        });

        return resultTiles;
    }

    // [정리] 스토리 몬스터의 경우 컷씬으로 반드시 배틀 범위안에 둔 후, 나중에 move를 호출하여, 배틀에 진입하게 만들었는데..
    // 이런 방식 말고, 바로 전투를 진행하도록 해야할 것 같은데.. 사실 그러면 함수명도 바뀌어야 맞는 것 같다. 
    storyBattle() {
        this.monsters.forEach((monster) => {
            monster.move(this);
        });
    }

    // [정리] 맵 진입 시, 이벤트를 가지면 실행하려고 만들었는데.. 애매하다..
    monsterEvent() {
        this.monsters.forEach((monster) => {
            if(monster.event) {
                monster.event(this);
            }
        });
    }

    // 현재 위치로부터 x, y pixel 떨어진 위치를 바라보기 위해 만든 함수이다.
    lookAt(x, y, instantFollow, callback) {
        if (true) {
            const px = this.externalCenter.x - (this.player.position.x + x) * this.currentScale;
            const py = this.externalCenter.y - (this.player.position.y + y) * this.currentScale;
            
            if (instantFollow) {
                this.mapContainer.position.x = px;
                this.mapContainer.position.y = py;
            } else {
                this.tweens.addTween(this.mapContainer.position, 1.5, { x: px, y: py }, 0, "easeOut_ex", true, callback);
            }
        }
    }
}