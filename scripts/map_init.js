let html = `<div class="map-gui">
    <div class="buttons">
        <a class="no-gl mfi" href="./index_gl.html" title="Открыть в виде 3D глобуса">&#xf018;</a>
        <a class="w-gl mfi" href="./index.html" title="Открыть в виде 2D карты">&#xf278;</a>
    </div>
    
    <div class="map-layers">
        <div class="layers-toggle-button mfi">&#xe80c;</div>
        <div class="layers-editor">
            <div class="layers-list"></div>
            <div class="layers-buttons"><span class="add-layer">Добавить слой</span></div>
        </div>
    </div>
</div>`;
let layer_list_card_tpl=`
<div class="layer-list-card">
    <div class="drag-handle mfi">&#xE812;</div><div>
        <div class="buttons">
            <span class="del mfi">&#xe80d;</span>
        </div>
        <h1 class="title">{info.title}</h1>
        <div class="opacity"><span class="mfi">&#xe800;</span><input type="range" min="0" max="1" step="0.001" name="opacity"></div>
    </div>
</div>`;

import {createFragment as $C} from "/modules/create_dom.js";
import {XConsole} from "/modules/console_enhancer.js";
import {vformat} from "/modules/format.js";
import {load_css, insertAt} from "/modules/dom_utils.js";
import {basename, dirname} from "/modules/utils.js";

load_css('./icons/css/mapfont.css');
load_css("https://fonts.googleapis.com/css?family=Open+Sans:400,400italic,700,300");

let console = new XConsole('Maps');
let $=(s, e=document)=>e && e.querySelector(s);
let $A=(s, e=document)=>e && e.querySelectorAll(s);
let $R=(e)=>e && e.parentNode && e.parentNode.removeChild(e);

let GUI, layers_editor, L, map, layers={};
let placeholder = $('div', $C('<div class="drag-placeholder">&nbsp;</div>'));

function create_map_layer(layer_info){
    let layer;
    if(layer_info.tiles){
        let opt = {
            minNativeZoom: layer_info.zoom[0],
            maxNativeZoom: layer_info.zoom[1]
        };
        if(layer_info.bounds) opt.bounds = layer_info.bounds;
        layer = L.tileLayer(layer_info.tiles, opt);
    }
    return layer;
}

class Layer{
    constructor(layer_name, opt){
        if(!opt) opt={};
        this.info = layers.DB.layers[layer_name];
        this.name = layer_name;
        this.options = opt;
        let html = $C(vformat(layer_list_card_tpl, this));
        this.el = $('div', html);
        $('.opacity input', this.el).addEventListener('input', ev => this.setOpacity(ev.target.value));
        $('.buttons .del', this.el).addEventListener('click', () => this.remove());
        $('.drag-handle', this.el).addEventListener('mousedown', (ev) => this.dragstart(ev));
        let layers_container = $('.map-layers .layers-list', GUI);

        this.options.opacity = opt.opacity || this.info.opacity;

        layers.map.push(this);
        insertAt(layers_container, this.el, 0);

        this.create_map_level();
        if(opt.level) this.change_level(opt.level);
    }
    dragstart(ev){
        this.el.classList.add('dragging');
        this.el.style.width = this.el.clientWidth + 'px';
        this.el.parentNode.insertBefore(placeholder, this.el);
        placeholder.style.height = this.el.clientHeight + 'px';

        let move_reg = (ev)=>{
            ev.preventDefault();
            ev.stopPropagation();
            let rect = placeholder.getBoundingClientRect();
            if(rect.top > ev.clientY){
                placeholder.parentNode.insertBefore(placeholder, placeholder.previousSibling);
            }
            if(rect.bottom < ev.clientY){
                if(placeholder.nextSibling && placeholder.nextSibling.nextSibling)
                    placeholder.parentNode.insertBefore(placeholder, placeholder.nextSibling.nextSibling);
                else placeholder.parentNode.appendChild(placeholder);
            }

            this.el.style.top = (ev.clientY - this.el.clientHeight/2) + "px";
            this.el.style.left = (ev.clientX - this.el.clientWidth/2) + "px";
        };
        let finish_reg = (ev)=>{
            move_reg(ev);
            this.el.style.top = '';
            this.el.style.left = '';
            this.el.style.width = '';
            placeholder.style.height = '';

            window.removeEventListener('mousemove', move_reg, {capture: true});
            window.removeEventListener('mouseup', finish_reg, {capture: true});
            this.el.classList.remove('dragging');
            placeholder.parentNode.insertBefore(this.el, placeholder);
            $R(placeholder);
            let els = Array.from(this.el.parentNode.children);
            this.change_level(els.length - 1 - els.indexOf(this.el));
        };

        window.addEventListener('mousemove', move_reg, {capture: true});
        window.addEventListener('mouseup', finish_reg, {capture: true});

        move_reg(ev);
    }
    create_map_level(){
        if(this.map) this.map.removeFrom(map);
        this.map = create_map_layer(this.info);
        this.map.addTo(map);
        this.setOpacity(this.options.opacity);
        if(this.map.setZIndex) this.map.setZIndex(layers.map.indexOf(this));
    }
    change_level(index){
        index = parseInt(index);
        let cindex = layers.map.indexOf(this);
        if(cindex < 0) throw new Error("Couldn't find the layer");
        if(cindex === index) return;
        if(index>=0 && index < layers.map.length){
            layers.map.splice(cindex, 1);
            layers.map.splice(index, 0, this);
            let p = this.el.parentNode;
            p.removeChild(this.el);
            insertAt(p, this.el, index);
            layers.map.forEach((i, n)=>{
                if(i.map.setZIndex) i.map.setZIndex(n);
                else i.create_map_level();
            });
        }
    }
    remove(){
        $R(this.el);
        let cindex = layers.map.indexOf(this);
        if(cindex < 0) throw new Error("Couldn't find the layer");
        layers.map.splice(cindex, 1);
        this.map.removeFrom(map);
    }
    setOpacity(opacity){
        if(opacity === undefined) opacity = 1;
        this.map.setOpacity(opacity);
        let op_i = $('.opacity input', this.el);
        op_i.value = opacity;
        this.options.opacity = opacity;
    }
}

function getLayers(){
    return fetch("./layers.json")
        .then(resp=>resp.json())
        .then(layers_db=>{
            layers.DB = layers_db;
            for(let i in layers_db.layers){
                layers_db.layers[i].name = i;
            }
        })
        .catch(console.error.bind(console));
}

export function init(_map, _L){
    L = _L;
    map = _map;
    window.GK = [GUI, layers_editor, L, map, layers];

    layers.map = [];
    getLayers().then(()=>{
        new Layer("u_sat");
        new Layer("u_coastlines");
        new Layer("u_labels");
    });

    document.body.appendChild($C(html));
    GUI = $('.map-gui');
    layers_editor = $('.layers-editor', GUI);
    let layers_container = $('.map-layers', GUI);
    let layers_btn = $('.layers-toggle-button', GUI);
    layers_btn.addEventListener('click', ()=>{
        layers_container.classList.toggle('editor-hidden');
    });

    let switch_view = ev => {
        ev.preventDefault();
        location.replace(location.origin + dirname(location.pathname) + "/" + basename(ev.target.href)
            + (location.search || "") + (location.hash || ""));
    };
    $(".buttons .no-gl").addEventListener("click", switch_view);
    $(".buttons .w-gl").addEventListener("click", switch_view);
}
