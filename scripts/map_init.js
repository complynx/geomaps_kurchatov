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
    <h1 class="title">{info.title}</h1>
    <div class="opacity"><span class="mfi">&#xe800;</span><input type="range" min="0" max="1" step="0.001" name="opacity"></div>
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
        this.map = create_map_layer(this.info);
        this.options = opt;
        let html = $C(vformat(layer_list_card_tpl, this));
        this.el = $('div', html);
        let op_i = $('.opacity input', this.el);
        op_i.addEventListener('input', ev => this.setOpacity(ev.target.value));
        let layers_container = $('.map-layers .layers-list', GUI);

        this.options.opacity = opt.opacity || this.info.opacity;
        if(opt.zIndex && opt.zIndex<layers.map.length) {
            layers.map.splice(opt.zIndex, 0, this);
        } else {
            layers.map.push(this);
            this.map.setZIndex(layers.map.length);
        }
        insertAt(layers_container, this.el, layers.map.length - 1 - layers.map.indexOf(this));
        this.map.addTo(map);

        if(this.options.opacity !== undefined){
            this.setOpacity(this.options.opacity);
        }else{
            this.setOpacity(1);
        }
    }
    setOpacity(opacity){
        this.map.setOpacity(opacity);
        let op_i = $('.opacity input', this.el);
        op_i.value = opacity;
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
