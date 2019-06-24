import Panel from "./component/panel";
import Modal from "./component/modal";
import MakeDom from "./component/makedom";
import Button from "./component/button";
import Doll from "./component/doll";
import ListBox from "./component/listbox";

const PARTY_SIZE = 6;

export default class PartyUI extends Panel {
  constructor(pane, inputs, partyinputs, result) {
    super();
    
    pane.classList.add('screen');

    this.inputs = inputs; // input 캐릭터 데이터
    this.party = partyinputs; // input 파티 데이터
    this.result = result; // 콜백
    this.selected = null; // 리스트에서 선택된 캐릭터

    this.members = []; 

    // this.isPartyMember = -1; // 현재 파티 구성원인 경우 인덱스값 저장..
    const modal = new Modal(pane, 800, 460, null);
    this.dom = modal.dom;
    this.dom.classList.add('party');
    
    modal.addTitle('파티 조합');
    modal.addCloseButton();
    
    // 전체 컨텐츠 wrapper
    const wrapper = document.createElement('div');
    wrapper.classList.add('contents');
    wrapper.classList.add('flexWrap');
    wrapper.style.top = '70px';
    
    // todo 변수명을 바꿔야할듯.
    // 캐릭터 리스트 wrap
    this.ownedCharacters = new MakeDom('div', 'ownedCharacters');
    this.ownedCharacters.classList.add('flex-right');
    this.ownedCharacters.style.height = '340px';
    this.ownedCharacters.style.position = 'relative';

    this.totaldps = new MakeDom('p', 'totaldps');

    // 확인 버튼 콜백
    const submitButton = new Button('파티구성', 'submit');
    submitButton.moveToCenter(15);
    submitButton.moveToBottom(15);

    submitButton.dom.addEventListener('click', (ok)=> {
      pane.parentNode.removeChild(pane);
      return this.result(this.members);
    });

    this.ownedCharacters.appendChild(submitButton.dom);
    this.ownedCharacters.appendChild(this.totaldps);

    // 파티 리스트
    // characterList
    const characterListWrap = new MakeDom('div', 'characterListWrap');
    characterListWrap.classList.add('flex-left');

    this.characterList = new MakeDom('div', 'characterList');
    this.characterList.classList.add('party');
    this.characterList.style.width = '410px';

    characterListWrap.appendChild(this.characterList);
    
    wrapper.appendChild(characterListWrap);
    wrapper.appendChild(this.ownedCharacters);
    this.dom.appendChild(wrapper);

    pane.appendChild(this.dom);

    this.initMembers();
    this.initList();
  }
  
  
  initList(){
    // 캐릭터 리스트 
    this.list = new ListBox(280, 260, this.select.bind(this));
    this.list.dom.style.top = '100px';
    this.ownedCharacters.appendChild(this.list.dom);
    this.list.update(this.inputs, 'character');
  }

  initMembers(){
    let index = -1;
    // 좌표만 가지고 있는 비교용 데이터 배열...이 필요..
    for (let i = 0; i < PARTY_SIZE; i++) {
      this.members[i] = {
          character: null,
          x: i % 3,
          y: Math.floor(i / 3)
      };
    }

    let partymebers = this.party.getBattleAllies();

    partymebers.forEach(member => {
      ++index;
      // if (this.partymember[index].x === member.x && this.partymember[index].y === member.y) {
      //   this.members[index] = member;
      // }
      this.members[index] = member;
    });

    this.updateMembers();
  } 
  
  updateMembers(){
    let selectedDoll = null;
    
    console.log(this.party.totalPowerFigure);

    this.totaldps.innerText = `${this.party.totalPowerFigure}`;
    this.characterList.innerHTML = '';
    
    this.members.forEach(member => {
      let doll = new Doll(member.character);
      if(doll.dom.hasChildNodes('img')) {
        doll.dom.classList.remove('empty');
      }
      // if (index === 0) {
      //   doll.dom.classList.add('active');
      //   selectedDoll = doll.dom;
      // }
      // ++index;

      this.characterList.appendChild(doll.dom);

      doll.dom.addEventListener('click', function(){
        if(selectedDoll) {
          selectedDoll.classList.remove('active');

          if (selectedDoll.classList.contains('isCrew')) {
            doll.dom.innerHTML = '';
            doll.dom.classList.remove('isCrew');
            doll.dom.classList.add('empty');
            member.character = null;
            // this.result.bind(this, this.members);
          }
        }

        doll.dom.classList.add('active');
        selectedDoll = doll.dom;
      });

      doll.dom.addEventListener('click', this.compose.bind(this, member));
    });
  }

  select(data) {
    if(this.selected !== null) {
      this.selected.character = data;

      this.members.forEach(member => {
        if (member.x === this.selected.x && member.y === this.selected.y) {
          member = this.selected;
        }
      });
      this.result(this.members);
      this.updateMembers();
    }
  }


  compose(member) {
    // 현재 선택된 멤버의 좌표를 저장-
    if(member.character === null) {
      this.result(this.members);
      this.totaldps.innerText = `${this.party.totalPowerFigure}`;
    }
    // console.log('x: ' + member.x + ' / ' + 'y: ' + member.y);
    this.selected = member;
  }
}


