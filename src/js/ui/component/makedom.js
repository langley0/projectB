
export default class MakeDom {
  constructor(element, classname, value) {
    const dom = document.createElement(element);

    if (classname) {
      dom.classList.add(classname);
    }
    if (value) {
      dom.innerHTML = value;
    }
    
    this.dom = dom;
    
    return this.dom;
  }
}
