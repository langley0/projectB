import Panel from "./component/panel";
import Modal from "./component/modal";
import ItemImage from "./component/itemimage";
import MakeDom from "./component/makedom";
import Button from "./component/button";

export default class CharacterDetail extends Panel {
  constructor(pane, input, result) {
    super();
    
    pane.classList.add('screen');

    this.selected = input;
    this.statItem = null; 
    this.isActive = null; // 장비, 스킬 아이콘 같이 체크해야함.
    this.pauseData = null; // 캔슬할때 임시로 데이터 담아두기
    this.callback = result;
    this.tempEquipData = null;
    
    // 모달
    const modal = new Modal(pane, 800, 440);
    modal.dom.classList.add('characterDetail');
    modal.addTitle('캐릭터 정보');
    modal.addCloseButton();
    modal.closeBtn.addEventListener('click', this.closeModal.bind(this, 'close'));
    this.dom = modal.dom;

    // 모달 내부 컨텐츠 영역
    const contentsWrap = new MakeDom('div', 'contents');
    contentsWrap.classList.add('flexWrap');

    const leftBox = new MakeDom('div', 'flex-left');
    leftBox.classList.add('characterStat');
    leftBox.classList.add('list-detail');

    // const characterStat = new MakeDom('div', 'characterStat')
    // characterStat.classList.add('list-detail');
    // leftBox.appendChild(characterStat);

    const rightBox = new MakeDom('div', 'flex-right');
    rightBox.classList.add('characterDesc');

    contentsWrap.appendChild(leftBox);
    contentsWrap.appendChild(rightBox);

    const titleWrap = new MakeDom('div', 'titleWrap');
    const infoWrap = new MakeDom('div', 'infoWrap');

    this.descName = new MakeDom('span', 'stat_name');
    this.level = new MakeDom('span', 'stat_level');
    this.level.style.paddingRight = '10px';

    this.class = new MakeDom('p', 'stat_class');
    this.dps = new MakeDom('p', 'stat_dps');
    this.dps.style.paddingTop = '10px';
    this.dps.style.fontSize = '18px';
    
    // 캐릭터 정보
    this.portrait = new MakeDom('img', 'profile');
    this.portrait.style.display = 'block';
    this.portrait.style.margin = '30px auto 10px';

    titleWrap.appendChild(this.level);
    titleWrap.appendChild(this.descName);
    infoWrap.appendChild(this.class);
    infoWrap.appendChild(this.dps);


    // 장비
    this.equipItems = document.createElement('ul');
    this.equipItems.className = 'equipItems';

    // 스킬
    this.skillItems = document.createElement('ul');
    this.skillItems.className = 'skillItems';

    const descBox = new MakeDom('div', 'descBox');
    this.description = new MakeDom('p', 'description');

    const buttonWrap = new MakeDom('div');
    this.equipBtn = new Button('장비장착', 'button_small');
    this.equipBtn.dom.style.display = 'none';
    this.equipBtn.moveToRight(10);
    this.equipBtn.moveToBottom(10);

    this.cancelBtn = new Button('취소', 'button_small');
    this.cancelBtn.dom.style.display = 'none';
    this.cancelBtn.moveToRight(90);
    this.cancelBtn.moveToBottom(10);

    if (this.equipBtn.dom) {
      this.equipBtn.dom.addEventListener('click', (e)=>{
        this.equipCallback(e.target);
      });
    }

    if (this.cancelBtn.dom) {
      this.cancelBtn.dom.addEventListener('click', (e)=>{
        this.equipCallback(e.target);
      });
    }
    
    buttonWrap.appendChild(this.cancelBtn.dom);
    buttonWrap.appendChild(this.equipBtn.dom);

    descBox.appendChild(buttonWrap);
    descBox.appendChild(this.description);
    //.left

    this.statWrap = new MakeDom('ul', 'statWrap');
    const mainStats = new MakeDom('div', 'mainStat');

    this.statDps = new MakeDom('span', 'stat', `공격력 : ${this.selected.strongFigure}`);
    this.statArmor = new MakeDom('span', 'stat', `방어력 : ${this.selected.armorFigure}`);

    // 장착가능 아이템 슬롯 
    this.equipInven = new MakeDom('div', 'equipInven');
    this.equipInven.style.display = 'none';
    
    // 스크롤영역 사이즈
    let scrollHeight = '200px';

    const scrollView = document.createElement('div');
    scrollView.classList.add('scrollView');
    scrollView.style.height = scrollHeight;

    const scrollBlind = document.createElement('div');
    scrollBlind.className = 'scrollBlind';
    scrollBlind.style.height = scrollHeight;

    this.storageContent = document.createElement('ul');
    this.storageContent.classList.add('slot-list-box');
    this.storageContent.classList.add('scrollbox');
    this.storageContent.style.height = scrollHeight;

    scrollView.appendChild(scrollBlind);
    scrollBlind.appendChild(this.storageContent);
    this.equipInven.appendChild(scrollView);
    
    mainStats.appendChild(this.statDps);
    mainStats.appendChild(this.statArmor);

    rightBox.appendChild(descBox);
    leftBox.appendChild(titleWrap);
    leftBox.appendChild(infoWrap);

    rightBox.appendChild(this.equipItems);
    rightBox.appendChild(this.skillItems);

    // TODO :  stat 바뀌는건 가운데 영역으로 
    // rightBox.appendChild(mainStats);
    // rightBox.appendChild(this.statWrap);

    rightBox.appendChild(this.equipInven);

    this.dom.appendChild(contentsWrap);
    this.init();
  }

  init() {
    const path = '/src/assets/';

    this.class.innerText = this.selected.class;
    this.descName.innerText = this.selected.displayName;
    this.portrait.src = path + this.selected.data.portrait;
    this.level.innerText = 'Lv.' + this.selected.level;

    // 캐릭터 정보 업데이트
    this.updateEquip();
    this.updateSkill();
    this.updateStat();
  }

  updateStat() {
    this.statWrap.innerHTML = '';
    this.dps.innerText = `총 전투력 : ${this.selected.totalPowerFigure}`;
    this.statDps.innerText = `공격력 : ${this.selected.strongFigure}`;
    this.statArmor.innerText = `방어력 : ${this.selected.armorFigure}`;
    
    // console.log(this.selected.data);

    for (let base in this.selected.data.base) {
      if ( base !== 'regist') {
        let baseStat = document.createElement('li');
        let plusStat = document.createElement('span');

        let text = base.charAt(0).toUpperCase() + base.slice(1);
        let baseStatText = 'base' + text;
        let plusStatText = 'simulated' + text; //simulated
        
        if ( base === 'health') {
          baseStatText = 'baseMax' + text;
          plusStatText = 'simulatedMax' + text;
        }
        baseStat.innerText = `${base} : ${this.selected[baseStatText]}`;
        plusStat.innerText = `( + ${this.selected[plusStatText]} )`;
        plusStat.style.paddingLeft = '10px';
        plusStat.style.color = '#ffd800';
        baseStat.appendChild(plusStat);
        this.statWrap.appendChild(baseStat);
      }
    }
  }

  updateEquip(){
    this.equipItems.innerHTML = '';
    let index = -1;
    let equipItemsData = [
      {data: null, category: 'armor', displayName: '갑옷'},
      {data: null, category: 'weapon', displayName: '무기'},
      {data: null, category: 'accessory', displayName: '악세사리'}
    ];
    equipItemsData[0].data = this.selected.equipments.armor;
    equipItemsData[1].data = this.selected.equipments.weapon;
    equipItemsData[2].data = this.selected.equipments.accessory;
    
    equipItemsData.forEach(d => {
      ++index;
      let liWrap = new MakeDom('li');
      let descText = new MakeDom('span', 'descText', '');
      liWrap.appendChild(descText);
      liWrap.index = index;

      if (d.data !== null) {
        let item = d.data.data;
        let itemIcon = new ItemImage(item.image.texture, item.image.x, item.image.y);
        itemIcon.dom.style.display = 'inline-block';
        descText.innerText = d.displayName;
        liWrap.appendChild(itemIcon.dom);
      } else {
        liWrap.classList.add('empty');
        descText.innerText = d.displayName;
      }

      this.equipItems.appendChild(liWrap);

      liWrap.addEventListener('click', (e) => {
        if (this.isActive) {
          this.isActive.classList.remove('active');
          this.isActive = liWrap;
        }
        liWrap.classList.add('active');
        this.isActive = liWrap;
        this.statItem = equipItemsData[liWrap.index];
      });
      
      liWrap.addEventListener('click', this.showEquipInfo.bind(this));
    });
  }

  updateSkill() {
    this.skillItems.innerHTML = '';
    let skillItemsData = [];
    skillItemsData.push(this.selected.skillA);
    skillItemsData.push(this.selected.skillB);
    skillItemsData.push(this.selected.skillExtra);
    
    let index = -1;

    skillItemsData.forEach(d => {
      ++index;
      let liWrap = new MakeDom('li');
      liWrap.index = index;

      if (d !== null) {
        let skillIcon = new ItemImage('items.png', 20, 1);
        skillIcon.dom.style.display = 'inline-block';

        let descText = new MakeDom('span', 'descText', skillItemsData[liWrap.index].data.name);
        liWrap.appendChild(skillIcon.dom);
        liWrap.appendChild(descText);

        this.skillItems.appendChild(liWrap);
      } 

      liWrap.addEventListener('click', () => {
        if (this.isActive) {
          this.isActive.classList.remove('active');
          this.isActive = liWrap;
        }
        liWrap.classList.add('active');
        this.isActive = liWrap;
        this.statItem = skillItemsData[liWrap.index];
      });
      liWrap.addEventListener('click', this.showSkillInfo.bind(this));
    });
  }

  showSkillInfo (){
    this.description.innerHTML = '';
    this.equipBtn.dom.style.display = 'none';
    this.cancelBtn.dom.style.display = 'none';

    if (this.statItem) {
      this.description.innerText = this.statItem.data.name; 
      const desctext = new MakeDom('p', 'desc-text');
      this.description.appendChild(desctext);
      desctext.innerText = this.statItem.data.description; 
    }
  }

  showEquipInfo() {
    this.description.innerHTML = '';
    this.equipBtn.dom.style.display = 'none';
    this.cancelBtn.dom.style.display = 'none';
    
    const desctext = new MakeDom('p', 'desc-text');
    let status = null;

    if (this.statItem.data !== null) {
      if(this.tempEquipData !== null) { // 시뮬레이션 데이터
        status = 'tempEquip';
      } else { // 실제 장비를 장착하고 잇는 중. 
        status = 'unEquip';
      }
      this.description.innerText = this.statItem.data.name; 
      desctext.innerText = this.statItem.data.description;
    } else {
      desctext.innerText = '장착된 장비 정보가 없습니다.';
      status = 'simulationEquip';
    }
    this.updateInfo(status);
    this.description.appendChild(desctext);
  }

  updateInfo(_status){
    this.equipBtn.dom.style.display = 'none';
    this.cancelBtn.dom.style.display = 'none';

    if( _status === 'simulationEquip' ||  _status === 'cancel' ) {
      this.equipBtn.dom.style.display = 'block';
      this.cancelBtn.dom.style.display = 'none';
      this.equipBtn.dom.innerText = '장비장착';
      this.equipBtn.dom.setAttribute('value', 'simulationEquip');

    } else if(_status === 'unEquip') {
      this.equipBtn.dom.style.display = 'block';
      this.equipBtn.dom.innerText = '장비해제';
      this.equipBtn.dom.setAttribute('value', 'unEquip');

    } else if(_status === 'tempEquip') {
      this.equipBtn.dom.style.display = 'block';
      this.cancelBtn.dom.style.display = 'block';
      this.equipBtn.dom.innerText = '확인';
      this.equipBtn.dom.setAttribute('value', 'equip');
      this.cancelBtn.dom.setAttribute('value', 'cancel');
    } 
  }

  showEquipInven() {
    this.storageContent.innerHTML = '';
    this.equipInven.style.display = 'block';
    this.slotSize = 14;

    let isActive = null;
    let index = -1;

    this.tempEquipData.forEach(item => {
      ++index;

      let liWrap = new MakeDom('li', 'slot');
      liWrap.style.width = '55px';
      liWrap.style.height = '55px';

      let itemIcon = new ItemImage(item.data.image.texture, item.data.image.x, item.data.image.y);
      itemIcon.dom.style.display = 'inline-block';
      liWrap.appendChild(itemIcon.dom);
      liWrap.addEventListener('click', ()=>{
        if(isActive) {
          isActive.classList.remove('active');
        }
        isActive = liWrap;
        liWrap.classList.add('active');
        
        this.statItem = item;
        this.showEquipInfo();
      });

      liWrap.addEventListener('click', this.equipCallback.bind(this, null));
      this.storageContent.appendChild(liWrap);
    });
  }

  hideEquipInven() {
    this.equipInven.style.display = 'none';
  }

  equipCallback(attr) {
    let flag = null;

    if (attr === null) {
      flag = 'simulationEquip';
    } else {
      flag = attr.value;
      
      if (flag === 'equip') {
        this.hideEquipInven();
        this.tempEquipData = null;
      } else if (flag === 'cancel') {
        this.pauseData = this.statItem.data.category;
        this.tempEquipData = null;
        this.hideEquipInven();
      } else if (flag === 'unEquip'){ 
        flag = 'unEquip';
      } 
    }
    this.updateInfo(flag);
    this.callback(this.statItem, flag);
    this.showEquipInfo();
  }

  closeModal(){
    this.callback(this.statItem, 'close');
  }
}


