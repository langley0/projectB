import Panel from "./component/panel";
import NineBox from './component/ninebox';

export default class Dialog extends Panel {
    constructor(pane, width, height, script) {
        super();
    
        this.pane = pane;
    
        const dialog = new NineBox(this.pane, width, height, 'dialog');
        dialog.dom.className = 'dialog';
        dialog.moveToBottom(20);
        this.dom = dialog.dom;
        this.speakers = null;

        // dialogText
        const dialogText = document.createElement('p');
        this.dialogText = dialogText;
        this.dialogText.classList.add('contents');
        this.dom.appendChild(this.dialogText);
    
        // 캐릭터
        this.speakerImg = document.createElement('img');
        this.speakerImg.className = 'dialog-speaker';
        dialog.dom.appendChild(this.speakerImg);
        
        // 캐릭터이름
        this.speakerName = document.createElement('span');
        this.speakerName.className = 'name';
        dialog.dom.appendChild(this.speakerName);
        
        // 프람프트 
        const prompt = document.createElement('div');
        prompt.className = 'dialog-prompt';
        dialog.dom.appendChild(prompt);
        this.prompt = prompt;
    
        if (script !== null) {
            this.data = script;
            this.endIndex = this.data.length;
            this.currentIndex = 0;
        }
    
        this.onComplete = null;
        this.dom.addEventListener('click', this.nextDialog.bind(this));
    }

    nextDialog(event) {
        event.preventDefault();
        
        if (this.currentIndex < 0) {
            return;
        }
    
        if (this.dialogText.classList.contains('blinkAnim')) {
            return;
        } else {
            ++this.currentIndex;
            if (this.currentIndex === this.endIndex) {
                this.hideDialog();
        
                if (this.onComplete !== null) {
                    this.onComplete();
                    this.onComplete = null;
                }
                this.currentIndex = -1;
                this.dom.removeEventListener('click', this.nextDialog, true);
                return;
            }

            this.setText(this.data[this.currentIndex].text);
            const speaker = this.data[this.currentIndex].speaker;
            if(speaker) {
                this.showSpeaker(speaker);
            } else {
                this.dom.classList.remove('portrait');
                this.speakerImg.style.display = 'none';
            }
        }
    }

    hidePrompt() {
        this.prompt.style.display = 'none';
    }
    
    showPrompt() {
        this.prompt.style.display = 'block';
    }
    
    showSpeaker(id) {
        let speaker = this.speakers[id];
        
        this.dom.classList.add('portrait');
        this.speakerImg.src = `/src/assets/${speaker.portrait}`;
        this.speakerImg.style.display = 'block';
        this.speakerName.innerText = `${speaker.displayname}`;
    }
    
    setText(text) {
        this.dialogText.classList.add('blinkAnim');
        this.hidePrompt();
        this.dialogText.innerText = text;
    
        setTimeout(() => {
            if (this.dialogText.classList.contains('blinkAnim')) {
            this.dialogText.classList.remove('blinkAnim');
            this.showPrompt();
            }
        }, 700);
    }
    
    hideDialog() {
        this.pane.parentNode.removeChild(this.pane);
    }
}