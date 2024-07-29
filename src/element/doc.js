import { Line, Rect, Collision} from "../js/geometry.js";

const DEBUG = true;


function findSuitableTerminal($doc, startRect, endRect){
  Collision
  // 1) 가능한 row 사이를 지나간다.  column 은 사이즈에 따라서 
}

function drawLine($doc, $svg, $start, $end, style, options){
  const doc_rect = $doc.getBoundingClientRect();

  let start_rect = $start.getBoundingClientRect();
  let end_rect = $end.getBoundingClientRect();

  let start_x = (start_rect.left + start_rect.right) / 2 - doc_rect.x;
  let start_y = start_rect.bottom - doc_rect.y;

  let end_x = (end_rect.left + end_rect.right) / 2 - doc_rect.x;
  let end_y = end_rect.top - doc_rect.y;

  let d = `M${ start_x } ${ start_y }L${ end_x } ${ end_y }`;
  const newLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  newLine.setAttribute('id', options['uid']);
  newLine.setAttribute('d', d);
  
  newLine.setAttribute("stroke", style['stroke'])
  newLine.setAttribute("stroke-width", style['stroke-width'])

  $svg.appendChild(newLine);
}

// https://stackoverflow.com/a/26423749/6652082
function getRelativePos(parent, child){
  const parentPos = parent.getBoundingClientRect();
  const childPos  = child.getBoundingClientRect();
  const relativePos = {};

  relativePos.top    = childPos.top - parentPos.top,
  relativePos.right  = childPos.right - parentPos.right,
  relativePos.bottom = childPos.bottom - parentPos.bottom,
  relativePos.left   = childPos.left - parentPos.left;
  return relativePos;
}

// https://gist.github.com/ionurboz/51b505ee3281cd713747b4a84d69f434
function throttle(fn, threshhold, scope) {
  threshhold || (threshhold = 250);
  var last,
      deferTimer;
  return function () {
    var context = scope || this;

    var now = +new Date,
        args = arguments;
    if (last && now < last + threshhold) {
      // hold on to it
      clearTimeout(deferTimer);
      deferTimer = setTimeout(function () {
        last = now;
        fn.apply(context, args);
      }, threshhold);
    } else {
      last = now;
      fn.apply(context, args);
    }
  };
}


class DBase extends HTMLElement{
  static count = 0;       

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    DBase.count += 1;
    this.uid = "u_" + DBase.count;
  }
}


class DDoc extends DBase{
  constructor() {
    super();
    this._edge_by_node = {};
    this._ro = null;  // for ResizeObserver
    this._io_by_node = {};  // for IntersectionObserver each node
    this._createReObserver();
    this._repos_node_set = new Set();
    this._reposition_event = new Event("reposition");
  }

  connectedCallback() {
    const tag = DEBUG?"d-doc": "";
    const uid = this.uid;
    this.root.innerHTML = `
      <style>
      .svg{
        pointer-events: none;
      }
      .back-svg{
        z-index: -1;
      }
      .front-svg{
        z-index: 1;
      }
      </style>
      
      <div class="doc" part="doc"  d-id="${ uid }">
        <div class="doc-back-svg" part="doc-back-svg" >
          <svg class='svg back-svg' xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
          </svg>
        </div>
        <div class="doc-front-svg" part="doc-front-svg" >
          <svg class='svg front-svg' xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
          </svg>
        </div>
        <slot></slot>
      </div>
      `;
    
      this.addEventListener('reposition', _.debounce(() => {
        console.log("== event reposition ==")
        this._reposition();
      }, 250))
  }

  _reposition(){
    const root = this.shadowRoot.querySelector(".doc");
    const repos_edge_set = new Set();
    for(const node of this._repos_node_set){
      this._easyIObserver(root, node);
      const edge_list = this._edge_by_node[node.uid];
      if(!edge_list || edge_list.lenght == 0)
        continue
      for(const edge of edge_list){
        repos_edge_set.add(edge);
      }

    }

    for(const edge of repos_edge_set){
      edge.doPositioning()
    }
    this._repos_node_set.clear();
  }

  _createReObserver(){
    let is_first = true;
    this._ro = new ResizeObserver((entries, observer) => {
      if(is_first){
        is_first = false;
        return;
      }
      entries.forEach(entry => {
        console.log("ResizeObserver event");
        this._repos_node_set.add(entry.target)
        this.dispatchEvent(this._reposition_event);
      })
    })
  }

  addNode(node){
    // const debug = node.hasAttribute("debug-border");
    // if(!debug)
    //   return;

    this._ro.observe(node);

    const root = this.shadowRoot.querySelector(".doc");
    this._easyIObserver(root, node);
  }

  addEdge(edge, start, end){
    this._addEdge(edge, start);
    this._addEdge(edge, end);
  }

  _addEdge(edge, node){
    const node_uid = node.uid;
    if(!node_uid) return;

    if(this._edge_by_node.hasOwnProperty(node_uid) == false){
      this._edge_by_node[node_uid] = [];
    }
    this._edge_by_node[node_uid].push(edge);
  }

  _easyIObserver(root, target){
    let margin = this._getMarginFrom(root, target);
  
    let options = {
      root: root,
      rootMargin: margin,
      threshold: [0, 0.9, 0.95, 1.0],       
    };

    let target_uid = target.uid;

    if(this._io_by_node.hasOwnProperty(target_uid)){
      const old_io = this._io_by_node[target_uid];
      old_io.unobserve(target);
      old_io.disconnect();
    }
  
    let is_first = true;
    const io = new IntersectionObserver(entries => {
      // When loading, the two sizes are exactly the same, so the rootmargin was set properly.
      const checkValid = JSON.stringify(entries[0].boundingClientRect)  == JSON.stringify(entries[0].rootBounds);
      // if(entries[0].intersectionRatio >= 1.0)
      //   return
      if(is_first){
        is_first = false;
        return;
      }
      console.log("IntersectionObserver ratio : ", entries[0].intersectionRatio, checkValid);
      const node = entries[0].target;
      this._repos_node_set.add(node)
      this.dispatchEvent(this._reposition_event);
    }, options);
    io.observe(target);

    this._io_by_node[target_uid] = io;
  }

  _getMarginFrom(parent, child){
    const $body = document.querySelector('body');

    const parentPos = parent.getBoundingClientRect();
    const childPos  = child.getBoundingClientRect();
    const bodyPos = $body.getBoundingClientRect();
  
    const top = Math.floor( -parentPos.top + childPos.top );
    const left   = Math.floor(-parentPos.left + childPos.left);
    const right  = Math.floor(-childPos.right + parentPos.right);
    const bottom = Math.floor(-childPos.bottom + parentPos.bottom);

    const debug = child.hasAttribute("debug-border");
    if(debug){
      const $div2 = document.createElement("div");
      $div2.classList.add("debug-box");
      const relPos = getRelativePos($body, parent);
      $div2.style.top = `${relPos.top}px`;
      $div2.style.left = `${relPos.left}px`;
      $div2.style.width = `${parentPos.width}px`;
      $div2.style.height = `${parentPos.height}px`;
      console.log("relPos :", relPos);
      
      $div2.style.borderTopWidth = `${top}px`;
      $div2.style.borderRightWidth = `${right}px`;
      $div2.style.borderBottomWidth = `${bottom}px`;
      $div2.style.borderLeftWidth = `${left}px`;
      $body.append($div2);
    }
    
    let margin = `${-top}px ${-right}px ${-bottom}px ${-left}px`;
    console.log("root margin : ", margin);
    return margin;
  }
  
  
}
customElements.define("d-doc", DDoc);


class DGraph extends DBase {
  constructor() {
    super();
    this._created = false;
  }

  create(){
    const uid = this.uid;
    const tag = DEBUG?"d-graph": "";
    this.root.innerHTML = `
      <style>
        .title{
          font-weight: bold;
          text-align: center;
         }
      </style>
      <fieldset class="graph" d-id="${ uid }">
          <slot class="title" name="title"></slot>
        <slot />
      </fieldset>
    `;
    if(!this._created){

    }
    this._created = true;
  }

  connectedCallback() {
    this.create();
  }
}
customElements.define("d-graph", DGraph);


class ENode extends DBase {
  constructor() {
    super();
  }

  connectedCallback() {
    const uid = this.uid;
    const tag = DEBUG?"d-node": "";
    let ter_top = this.hasAttribute("terminal-top") || "";
    let ter_right = this.hasAttribute("terminal-right") || "";
    let ter_bottom = this.hasAttribute("terminal-bottom") || "";
    let ter_left = this.hasAttribute("terminal-left") || "";

    if(ter_top) ter_top = `<div part="terminal terminal-top"></div>`;
    if(ter_right) ter_right = `<div part="terminal terminal-right"></div>`;
    if(ter_bottom) ter_bottom = `<div part="terminal terminal-bottom"></div>`;
    if(ter_left) ter_left = `<div part="terminal terminal-left"></div>`;

    this.root.innerHTML = ` 
      <div class="node" part="node" d-id="${ uid }">
        <div part="content">
          <slot part="content"></slot>
        </div>
        <slot></slot>
        ${ ter_top} ${ ter_right} ${ ter_bottom} ${ ter_left}
        
      </div>
    `;

    const $doc = this.closest("d-doc");
    $doc.addNode(this);
  }
}
customElements.define("d-node", ENode);


class EEdge extends DBase {
  constructor() {
    super();
  }

  connectedCallback() {
    this.create(true);
  }

  create(is_first){
    let start = this.getAttribute("start");
    let end = this.getAttribute("end");
    
    if(!start || !end){
      this.root.innerHTML = `
      <div class="edge" d-id="${ uid }">
        !! start, end not setting !!
      </div>
      `;
      return;
    }
    
    const $doc = this.closest("d-doc");

    this._doc_back_svg = $doc.shadowRoot.querySelector('.back-svg');
    this._doc_front_svg = $doc.shadowRoot.querySelector('.front-svg');

    let $start = document.querySelector(start);
    let $end = document.querySelector(end);

    const style = {};
    style['stroke'] = this.getAttribute("stroke") || "black";
    style['stroke-width'] = parseInt(this.getAttribute("stroke-width") || "1");
    style['stroke-linecap'] = parseInt(this.getAttribute("stroke-linecap") || "butt");

    const options = {};
    options["uid"] = this.uid

    if(!is_first){
      const $line = this._doc_front_svg.querySelector("#" + this.uid);
      $line.remove();
    }
    drawLine($doc, this._doc_front_svg, $start, $end, style, options);

    if(is_first)
      $doc.addEdge(this, $start, $end);
  }

  doPositioning(){
    this.create(false);
  }
}
customElements.define("d-edge", EEdge);


class DDiv extends DBase {
  static observedAttributes = ["d-html"];

  constructor() {
    super();
  }

  connectedCallback() {
    this.create();
  }

  create(){
    const tag = DEBUG?"d-div": "";
    const uid = this.uid;

    let html = this.getAttribute("d-html") || "";
    this.root.innerHTML = `
      <div class="div" part="main"  d-id="${ uid }">
        ${html}
      </div>
      `;
  }

  attributeChangedCallback(){
    console.log("attributeChangedCallback");
    this.create();
  }
}
customElements.define("d-div", DDiv);


class DSpan extends DBase {
  static observedAttributes = ["d-html"];

  constructor() {
    super();
  }

  connectedCallback() {
    this.create();
  }

  create(){
    const tag = DEBUG?"d-span": "";
    const uid = this.uid;

    let html = this.getAttribute("d-html") || "";
    this.root.innerHTML = `
      <span class="span" part="main"  d-id="${ uid }">
        ${html}
      </span>
      `;
  }

  attributeChangedCallback(){
    console.log("attributeChangedCallback");
    this.create();
  }
}
customElements.define("d-span", DSpan);
