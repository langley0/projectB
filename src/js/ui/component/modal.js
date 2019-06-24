import Panel from "./panel";
import NineBox from "./ninebox";
import Button from "./button";
import Tab from './tab';


export default class Modal extends Panel {
    constructor(pane, width, height, callback) {
        super();
        this.pane = pane;
        const modal = new NineBox(this.pane, width, height);
        this.dom = modal.dom;
        this.dom.classList.add('modal');
        this.confirm_callback = callback;

        const closeBtn = new Button('', 'closeBtn');
        this.closeBtn = closeBtn.dom;
        this.closeBtn.style.display = 'none';
        this.closeBtn.addEventListener('click', this.closeModal.bind(this));

        this.dom.appendChild(this.closeBtn);
    }
    
    addCloseButton() {
        this.closeBtn.style.display = 'block';
        
    }
    
    addConfirmButton(text) {
        const confirmBtn = new Button(text, 'submit');
        this.dom.appendChild(confirmBtn.dom);
        this.confirmBtn = confirmBtn;
        confirmBtn.moveToCenter(0);
        confirmBtn.moveToBottom(20);
        confirmBtn.dom.addEventListener('click', this.onConfirm.bind(this));
    }
    
    onConfirm(){
        if (this.confirm_callback) {
            this.confirm_callback();
        }
    }
    
    addTitle(text) {
        const title = document.createElement('h1');
        title.innerText = text;
        title.className = 'title';
        this.dom.appendChild(title);
    
        this.subTitle = document.createElement('h2');
        this.subTitle.innerText = text;
        this.subTitle.className = 'sub-title';
        this.dom.appendChild(this.subTitle);
        this.subTitle.style.display = 'none';
    }
    
    setSubTitle(text) {
        this.subTitle.innerText = text;
        this.subTitle.style.display = 'block';
    }
    
    closeModal() {
        this.pane.removeChild(this.dom);
        this.remove(this.pane);
    }
    
    addTab(tabs, category, tab_callback) {
        if (this.dom.querySelector('.tabPane') !== null) {
            return;
        }   
        const tabPane = document.createElement('ul');
        tabPane.classList.add('tabPane');
        this.dom.appendChild(tabPane);
    
        tabPane.style.zIndex = '1';
        tabPane.style.width = '100px;'
        
        let selected = null;
        tabs.forEach(tab => {
            let tabButton = new Tab(tab, tab_callback);
            tabButton.dom.classList.add('tabBtn');
            tabButton.active = false;
        
            tabPane.appendChild(tabButton.dom);
        
            if (tab.category === category) {
                tabButton.dom.classList.add('active');
                selected = tabButton.dom;
            }
        
            tabButton.dom.addEventListener('click', function() {
                if (selected) {
                    selected.classList.remove('active');
                }
                tabButton.dom.classList.add('active');
                selected = tabButton.dom;
            });
        });
    }
}