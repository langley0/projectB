import Panel from "./panel";
// import ItemImage from "./itemimage";

export default class Button extends Panel {
    constructor(value, type) {
        super();
        const button = document.createElement('button');
        button.innerText = value;
        
        if (type !== undefined) {
            button.classList.add(`${type}`);
            
        } else {
            button.classList.add('button');
        }
        
        this.dom = button;
        // ui에 button 클릭 사운드 이펙트 추가        
        this.dom.addEventListener('click', ()=>{
            Sound.playSound('click_menu.mp3');
        });
    }
}

  