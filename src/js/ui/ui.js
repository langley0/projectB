import { EventEmitter } from "events";

import Button from './component/button';
import Modal from "./component/modal";
import SystemModal from "./systemmodal";
import Dialog from "./dialog";
import RecipeUI from "./recipeui";
import ProgressUI from "./progressui";
import Inventory from "./inventory";
import ItemImage from "./component/itemimage";
import CharacterSelect from "./characterSelect";
import CharacterDetail from "./characterDetail";
import MakeDom from "./component/makedom";
import Minimap from "./minimap";
import PartyUI from "./partyui";
import ItemAcquire from "./itemAcquire";
import Profile from "./profile";
import QuestList from "./quest";
import QuestModal from "./questModal";


export default class DomUI extends EventEmitter {
    constructor() {
        super();
        
        this.gamePane = document.getElementById('canvas');
        this.screenWidth = this.gamePane.screenWidth;
        this.screenHeight = this.gamePane.screenHeight;
        
        // theatreUI 를 설정한다
        this.theaterUI = new MakeDom('div');
        this.theaterUI.id = 'theater';
        this.theaterUI.style.top = this.gamePane.offsetTop + 'px';

        // 메인 ui 를 설정한다
        this.gnbContainer = new MakeDom('div', 'gnbContainer');
        this.gnbContainer.style.top = this.gamePane.offsetHeight + this.gamePane.offsetTop - 100 + 'px';
        this.gnbContainer.style.opacity = '0';

        // 스테이지타이틀, 튜토리얼 툴팁용 레이어
        this.displayLayer = new MakeDom('div', 'container');
        this.displayLayer.style.top = this.gamePane.offsetTop + 'px';

        this.profile = new MakeDom('div', 'gnb-profile');
        this.gnbContainer.appendChild(this.profile);

        const gnb = new MakeDom('div', 'gnb-navi');
        this.gnbContainer.appendChild(gnb);

        this.minimapDOM = document.createElement('canvas');
        this.minimapDOM.classList.add('minimap');
        this.minimapDOM.style.width = '165px';
        this.minimapDOM.style.height = '106px';
        this.minimapDOM.style.display = 'none';
        
        this.displayLayer.appendChild(this.minimapDOM);
        this.minimap = new Minimap(165, 106, this.minimapDOM);
        const menuData = [
            {name:'캐릭터', event: "characterselect"},
            {name:'보관함', event: "inventory"},
            {name:'파티', event: "party"},
            {name:'퀘스트', event: "quest"}
            // {name:'설정', event: "options"}
        ];
        
        menuData.forEach(menu => {
            let btn = new Button(menu.name, 'nav');
            gnb.appendChild(btn.dom);
            btn.dom.addEventListener('click', () => {
                this.emit(menu.event);
            });
        });

        document.body.appendChild(this.gnbContainer);
        document.body.appendChild(this.displayLayer);
        document.body.appendChild(this.theaterUI);

        // 스테이지 정보
        this.stageInfo = new MakeDom('div', 'stageInfo');
        this.displayLayer.appendChild(this.stageInfo);

        this.questStatus = new MakeDom('div', 'questStatus');
        this.displayLayer.appendChild(this.questStatus);

        // game data
        this.player = null;
        this.character = null;
        this.playerInvenData = null;
        this.characters = null;
    }

    showQuestStatus(currentQuest) {
        this.questStatus.innerHTML = '';

        if (currentQuest.success) {
            console.log('완료된 보상압니다. 퀘스트상세창에서 보상을 확인하세요. ');
            this.emit('quest');
            return;
        }


        const frag = document.createDocumentFragment();
        const title = new MakeDom('p', 'quest_name');
        const status = new MakeDom('p', 'quest_status');

        frag.appendChild(title);
        frag.appendChild(status);

        if (currentQuest && !currentQuest.success) {
            this.questStatus.style.opacity = '1';
            title.innerText = currentQuest.origin.title;
            status.innerText = `${currentQuest.objectives[0].count} / ${currentQuest.objectives[0].maxCount}`;
        }
        this.questStatus.appendChild(frag);
    }

    hideQuestStatus() {
        this.questStatus.style.opacity = '0';
    }

    showQuestComplete(quest){
        const comment = new MakeDom('h3', 'notificationText');
        
        let tt = this.displayLayer.querySelector('.notificationText');
        let text = `${quest.origin.title} 퀘스트가 완료되었습니다.`;

        if(this.displayLayer.querySelector('.notificationText')) {
            comment.innerText = text; 
            this.displayLayer.removeChild(tt);
            this.displayLayer.appendChild(comment);   
        } else {
            this.displayLayer.appendChild(comment);   
            comment.innerText = text; 
        }
    }

    showQuest() {
        let questlist = [];
        
        for (const qid in this.player.quests) {
            questlist.push(this.player.quests[qid]);
        }
        const questWrap = new QuestList(questlist, (result)=>{
            if(result === 'showQuestModal') {
            } else {
                this.showQuestStatus(result);
            }
            this.emit('quest');
        });

        questWrap.dom.addEventListener('click', ()=>{
            questWrap.dom.classList.toggle('open');
        });
        this.displayLayer.appendChild(questWrap.dom);
    }
    
    hideQuest(){
        const quest = this.displayLayer.querySelector('.questWrap');
        if(quest) {
            this.displayLayer.removeChild(quest);
        }
    }

    showProfile(player){
        if (this.player_profile)  {
            this.updateProfile();
            return;
        } 

        this.player_profile = new Profile(player, () => {
            this.emit('characterselect');
        });

        this.player_profile.updateAvatar(player.controlCharacter, this.player);
        this.profile.appendChild(this.player_profile.dom);
    }

    updateProfile(){
        // dps, gold 변할 때 같이 호출되야함.
        this.player_profile.updateAvatar(this.player.controlCharacter, this.player);
    }

    createContainer() {
        const container = document.createElement('div');
        container.className = 'uiContainer';
        container.style.top = this.gamePane.offsetTop + 'px';
        document.body.appendChild(container);

        return container;
    }
    
    removeContainer(pane) {
        document.body.removeChild(pane);
    }

    showMenu() {
        // 기본 ui 를 보여준다
        this.gnbContainer.style.opacity = '1';
        this.gnbContainer.style.display = 'block';

        // 퀘스트목록, 퀘스트진행창 보여줌 - 나중에 디자인 교체
        this.showQuest();
    }

    hideMenu() {
        // 기본 ui 를 가린다
        this.gnbContainer.style.opacity = '0';
        this.gnbContainer.style.display = 'none';
        
        // 임시
        this.hideQuest();
        this.hideQuestStatus();
    }

    showTheaterUI(){
        this.theaterUI.classList.add('show');
    }

    hideTheaterUI(){
        this.theaterUI.classList.remove('show');
    }

    showMinimap() {
        this.minimapDOM.style.display = 'block';
        this.stageInfo.style.opacity = '1';
    }

    hideMinimap() {
        this.minimapDOM.style.display = 'none';
        this.stageInfo.style.opacity = '0';
    }
    
    hasModal() {
        const currentUI = document.querySelector('.uiContainer');
        if (currentUI) {
            return true;
        }
        return false;
    }

    showStageInfo(text) {
        this.stageInfo.style.opacity = '1';
        this.stageInfo.innerText = text;
    }

    showStageTitle(text) {
        let tt = this.displayLayer.querySelector('.stageTitle');
        const stageTitle = new MakeDom('h2', 'stageTitle');

        if(this.displayLayer.querySelector('.stageTitle')) {
            stageTitle.innerText = text; 
            this.displayLayer.removeChild(tt);
            this.displayLayer.appendChild(stageTitle);   
        } else {
            this.displayLayer.appendChild(stageTitle);   
            stageTitle.innerText = text; 
        }
        this.showStageInfo(text);
    }
    
    showDialog(script, callback) {
        const pane = this.createContainer();
        const dialog = new Dialog(pane, 700, 140, script);
    
        dialog.setText(script[0].text);
        
        dialog.speakers = this.characters;
        if (script[0].speaker) {
            dialog.showSpeaker(script[0].speaker);
        }

        dialog.onComplete = callback;
    }

    // 기본 노티모달 : 텍스트 + 확인/취소 버튼 cancelable === true -> 취소버튼 
    showConfirmModal(text, cancelable, result) {
        const pane = this.createContainer();
        const confirmModal = new SystemModal(pane, 300, 200, text, cancelable, result);
        confirmModal.dom.style.top = '50%';
        confirmModal.dom.style.marginTop = 200 * -0.5 + 'px';
        confirmModal.contents.style.margin = '10% auto';
        confirmModal.contents.style.fontSize = '1.1rem';
    }

    showUseItemModal(text, items, result) {
        const pane = this.createContainer();
        const confirmModal = new SystemModal(pane, 300, 240, text, true, result);

        confirmModal.dom.style.top = '50%';
        confirmModal.dom.style.marginTop = 240 * -0.5 + 'px';
        confirmModal.contents.style.margin = '10% auto';
        confirmModal.contents.style.fontSize = '1.1rem';

        const options = new MakeDom('div', 'contents-option');
        let option = new ItemImage(items.data.image.texture, items.data.image.x, items.data.image.y);
        options.appendChild(option.dom);
        let name = new MakeDom('p', 'name', items.data.name);
        options.appendChild(name);

        confirmModal.contents.appendChild(options);
    }

    showCombineItemList(inputs, callback) { // 제작하기 버튼 콜백
        const pane = this.createContainer();
        pane.classList.add('screen');
    
        this.recipeUI = new RecipeUI(pane, 360, 460, callback);
        
        for (const input of inputs) {
            this.recipeUI.tabs.push({category: input.category});
            this.recipeUI.inputs = inputs;
        }
    
        if (inputs.length > 0) {
            this.recipeUI.select(inputs[0].category);
        }
        this.recipeUI.moveToLeft(150);
    }

    showCraftUI(itemId, result) {
        const pane = this.createContainer();
        pane.classList.add('screen');

        let domHeight = 240;
        
        const modal = new Modal(pane, 360, domHeight);
        modal.addTitle('아이템 조합중');
        modal.dom.style.top = '50%';
        modal.dom.style.marginTop = domHeight * -0.5 + 'px';

        const itemText = document.createElement('div');
        itemText.className = 'contents';
        itemText.innerText = "아이템을 조합중입니다.";
        itemText.style.top = '60px';

        const interval = 4;
        const loading = new ProgressUI(modal.dom, interval, (onComplete)=>{
            itemText.innerText = "아이템 조합 성공!"
            this.removeContainer(pane);
            result(itemId);
        });
    
        loading.moveToCenter(130);
        
        modal.dom.appendChild(itemText);
        modal.dom.appendChild(loading.dom);
    }

    showBlackScreen() {
        console.log('showBlackScreen');
        this.displayLayer.style.backgroundColor = 'rgba(0,0,0,1)';
    }
    hideBlackScreen() {
        console.log('hideBlackScreen');
        this.displayLayer.style.backgroundColor = 'transparent';
    }

    // 아이템 획득
    showItemAcquire(text, inputs, result) {
        const pane = this.createContainer();
        const acquire = new ItemAcquire(pane, text, inputs, (response) => {
            this.removeContainer(pane);

            if (result) {
                result();
            }
        });
    }
    
    // 퀘스트 모달
    showQuestModal(inputs){
        const pane = this.createContainer();
        const questModal = new QuestModal(pane, inputs, (result) => {
            console.log(result);
        });
    }

    showInventory(inputs, inven_gold) {
        const pane = this.createContainer();
        const inventory = new Inventory(pane, inputs);
    
        if (inven_gold) {
            inventory.gold.innerText = inven_gold;
        }

        inventory.moveToRight(70);
        inventory.onTabSelected(inventory.tabs[0].category);
    }

    showParty(inputs, partyinputs){
        const pane = this.createContainer();
        const party = new PartyUI(pane, inputs, partyinputs, (id, result) => {
            if (id === 'buttoncallback') {
                this.emit(result);
            } else {
                this.emit('setParty', id, result);
            }
        });
    }

    showCharacterSelect(inputs) {
        const avatar = this.player.controlCharacter;
        const pane = this.createContainer();
        const characterSelect = new CharacterSelect(pane, inputs, avatar, (result, option) => {
            if(result === 'characterDetail') {
                this.showCharacterDatail(option);
            } else if(result === 'setMainAvatar'){
                this.emit('setMainAvatar', option);
                characterSelect.avatar = this.player.controlCharacter;

                
            }
        });
        
        // consumables
        this.emit('playerInvenData', {category: 'consumables'});
        characterSelect.consumablesData = this.playerInvenData;

        const useItem = ((selected) => {
            if (selected !== null) {
                this.showUseItemModal('포션을 사용하시겠습니까?', selected, (confirmed) => {
                    if (confirmed === "ok") {
                        if( characterSelect.selected.health === characterSelect.selected.maxHealth) {
                            this.showConfirmModal('full--hp.....', false, ()=>{});
                            console.log('full--hp');
                        } else {
                            this.emit('useItem', selected.data.id, 1, characterSelect.selected);
                            characterSelect.updateStatus(characterSelect.selected);
                            this.emit('playerInvenData', {category:'consumables'});
                            characterSelect.consumablesData = this.playerInvenData;

                            characterSelect.createConsumablesItem(useItem);
                        }
                    } 
                });
            }
        });
        characterSelect.createConsumablesItem(useItem);
    }

    showCharacterDatail(player) {
        const pane = this.createContainer();
        const characterDetail = new CharacterDetail(pane, player, (result, option) => {
            
            if (option === 'close') {
                // 시뮬레이션 취소하고-캐릭터 선택창 이동 
                this.emit('cancelSimulate');
                this.emit('characterselect');
                return;
            } else {
                this.emit('playerInvenData', {category:result.category, class: player.data.class} );
            }
            
            if (characterDetail.pauseData !== null) {
                this.emit('playerInvenData', {category:characterDetail.pauseData, class: player.data.class} );
            }

            if (result.data !== null) {
                if (option === 'simulationEquip') {
                    // console.log('아이템 고르기 - 시뮬레이션');
                    this.emit('simulateEquip', result.data.category, result.item, player.id);
                } else if (option === 'cancel') {
                    // console.log('시뮬레이션 취소');
                    this.emit('cancelSimulate');
                    characterDetail.statItem.data = null;
                } else if (option === 'equip') {
                    // console.log('장비 장착');
                    this.emit('equipItem', result.data.category, result.item, player.id);
                    characterDetail.statItem.data = null;
                    characterDetail.updateEquip();
                    characterDetail.showEquipInfo();
                    characterDetail.pauseData = null;
                } else {
                    // console.log('장비 해제');
                    this.emit('unequipItem', result.data.category, player.id);
                    characterDetail.statItem.data = null;
                    characterDetail.updateEquip();
                    characterDetail.pauseData = null;
                }

                characterDetail.selected = this.character;
                characterDetail.updateStat();

            } else {
                if (this.playerInvenData.length !== 0) {
                    characterDetail.tempEquipData = this.playerInvenData;
                    characterDetail.showEquipInven();
                } else {
                    this.showConfirmModal('장착가능한 장비가 없습니다.', false, ()=>{
                        // TODO: 나중엔 상점으로 연결하면 되려나.
                    });
                }
            }
        });
    }
}
