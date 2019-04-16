/**
Created by Complynx on 22.03.2019,
http://complynx.net
 <complynx@yandex.ru> Daniel Drizhuk
*/


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
    
    <div class="layers-search hidden">
        <span class="back mfi"></span><input type="text" name="search" placeholder="Поиск..."><span class="close mfi">&#xe80d;</span>
        <div class="layers-categories"></div>
    </div>
    
    <div class="time-machine">
        <div class="year">
            <span class="up mfi"></span>
            <input type="number">
            <span class="down mfi"></span>
        </div>
        <div class="month">
            <span class="up mfi"></span>
            <input type="text">
            <span class="down mfi"></span>
        </div>
        <div class="day">
            <span class="up mfi"></span>
            <input type="number">
            <span class="down mfi"></span>
        </div>
    </div>
</div>`;
let layer_list_card_tpl=`
<div class="layer-list-card" id="{id}">
    <div class="drag-handle mfi">&#xE812;</div><div>
        <div class="buttons">
            <span class="del mfi">&#xe80d;</span>
        </div>
        <h1 class="title">{info.title}</h1>
        <div class="opacity"><span class="mfi">&#xe800;</span><input type="range" min="0" max="1" step="0.001" name="opacity"></div>
    </div>
</div>`;
let layer_category_tpl=`
<div class="layer-category" id="{id}">
    <span class="title">{title}</span>
    <div class="subcategories"></div>
</div>`;
let layer_subcategory_tpl=`
<div class="layer-subcategory" id="{id}">
    <span class="title">{title}</span>
    <div class="layers-list"></div>
</div>`;
let layer_selection_card_tpl=`
<div class="layer-selection-card" id="{id}">
    <span class="name">{title}</span>
    {provider!typeof(string)}<span class="provider">{provider}</span>{==}
    {description!typeof(string)}<span class="description">{description}</span>{==}
</div>`;
let layer_selection_ellipsis=`
<div class="layer-selection-ellipsis">…</div>`;

import {createFragment as $C} from "/modules/create_dom.js";
import {XConsole} from "/modules/console_enhancer.js";
import {vformat} from "/modules/format.js";
import {load_css, insertAt, unique_id} from "/modules/dom_utils.js";
import {basename, dirname, fetch_json} from "/modules/utils.js";
import moment from "/modules/moment/moment-with-locales.js";
import {stopper, mouseTracker} from "/modules/event_utils.js";

moment.locale('ru');

load_css('./icons/css/mapfont.css');
load_css("https://fonts.googleapis.com/css?family=Open+Sans:400,400italic,700,300");

let console = new XConsole('Maps');
let $=(s, e=document)=>e && e.querySelector(s);
let $A=(s, e=document)=>e && e.querySelectorAll(s);
let $R=(e)=>e && e.parentNode && e.parentNode.removeChild(e);

let GUI, layers_editor, L, map, layers={};
let placeholder = $('div', $C('<div class="drag-placeholder">&nbsp;</div>'));



class Layer{
    create_map_layer(layer_info){
        let layer;
        if(layer_info.tiles){
            let opt = {
                minNativeZoom: layer_info.zoom[0],
                maxNativeZoom: layer_info.zoom[1],
                time: this.get_time().format('Y-MM-DD')
            };
            if(layer_info.bounds) opt.bounds = layer_info.bounds;
            layer = L.tileLayer(layer_info.tiles, opt);
        }
        return layer;
    }
    constructor(layer_name, opt){
        if(!opt) opt={};
        this.id = unique_id('layer');
        this.info = layers.DB.layers[layer_name];
        this.name = layer_name;
        this.options = opt;
        let html = $C(vformat(layer_list_card_tpl, this));
        this.el = $('div', html);
        $('.opacity input', this.el).addEventListener('input', ev => this.setOpacity(ev.target.value));
        $('.buttons .del', this.el).addEventListener('click', () => this.remove());
        $('.drag-handle', this.el).addEventListener('mousedown', mouseTracker(
                this.drag_move.bind(this),
                this.drag_start.bind(this),
                this.drag_end.bind(this),
            )
        );
        let layers_container = $('.map-layers .layers-list', GUI);
        if(this.info.time){
            this.timeStart = moment(this.info.time.from).utc();
            this.timeEnd = moment(this.info.time.to).utc();
        }else{
            this.timeStart = moment.utc();
            this.timeEnd = moment.utc();
        }

        this.options.opacity = opt.opacity || this.info.opacity;

        layers[this.id]= this;
        insertAt(layers_container, this.el, 0);

        this.create_map_level();
        if(opt.level) this.change_level(opt.level);
    }
    drag_move(ev){
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
    }
    drag_start(ev){
        this.el.classList.add('dragging');
        this.el.style.width = this.el.clientWidth + 'px';
        this.el.parentNode.insertBefore(placeholder, this.el);
        placeholder.style.height = this.el.clientHeight + 'px';
    }
    drag_end(ev){
        this.el.style.top = '';
        this.el.style.left = '';
        this.el.style.width = '';
        placeholder.style.height = '';

        this.el.classList.remove('dragging');
        placeholder.parentNode.insertBefore(this.el, placeholder);
        $R(placeholder);
        Layer.update_z_indexes();
    }
    get_time(){
        return this.timeEnd.isBefore(layers.time) ? this.timeEnd :
            this.timeStart.isAfter(layers.time) ? this.timeStart :
                layers.time;
    }
    create_map_level(){
        if(this.map) this.map.removeFrom(map);
        this.map = this.create_map_layer(this.info);
        this.map.addTo(map);
        this.setOpacity(this.options.opacity);
        if(this.map.setZIndex){
            let els = Array.from(this.el.parentNode.children);
            this.map.setZIndex(els.length - els.indexOf(this.el));
        }
    }
    change_level(index){
        index = parseInt(index);
        let el = this.el;
        let els = Array.from(el.parentNode.children);
        let cindex = els.indexOf(el);
        if(cindex < 0) throw new Error("Couldn't find the layer");
        if(cindex === index) return;
        if(index>=0 && index < layers.map.length){
            let p = this.el.parentNode;
            p.removeChild(this.el);
            insertAt(p, this.el, els.length - 1 - index);
            Layer.update_z_indexes();
        }
    }
    static *Iterator(){
        let els = Array.from($('.map-layers .layers-list', GUI).children);
        for(let i=els.length - 1; i>=0; --i)
            yield layers[els[i].id];
    }
    static update_z_indexes(){
        let z_index=0;
        for(let l of layers){
            if(l.map.setZIndex) l.map.setZIndex(++z_index);
            else l.create_map_level();
        }
    }
    remove(){
        delete layers[this.id];
        $R(this.el);
        this.map.removeFrom(map);

        delete this.el;
        delete this.options;
        delete this.map;
        delete this.info;
    }
    setOpacity(opacity){
        if(opacity === undefined) opacity = 1;
        this.map.setOpacity(opacity);
        let op_i = $('.opacity input', this.el);
        op_i.value = opacity;
        this.options.opacity = opacity;
    }
}
layers[Symbol.iterator] = Layer.Iterator;

function layers_search_open() {
    let s = $('.layers-search', GUI);
    s.classList.remove('hidden');

    s.classList.remove('cat-selected');
    for(let i of $A(".layer-category.selected", s))
        i.classList.remove('selected');

    for(let i of $A(".layer-subcategory.opened", s))
        i.classList.remove("opened");
}
function layers_search_close() {
    $('.layers-search', GUI).classList.add('hidden');
}

function layers_select_open_subcategory(ev) {
    if(ev.target.closest(".layer-selection-card")) return;
    ev.currentTarget.classList.toggle("opened");
}

function populate_selection_list(){
    let ellipsis_pos = 6;
    let make_layers=(subcat, container)=>{
        let ellipsis_countdown = ellipsis_pos;
        for(let i of subcat.data){
            if(--ellipsis_countdown === 0) container.appendChild($C(layer_selection_ellipsis));
            let layer = layers.DB.layers[i];
            let id = unique_id("lsc");
            let el = $C(vformat(layer_selection_card_tpl, Object.assign({
                id: id
            }, layer))).firstElementChild;
            container.appendChild(el);

            el.addEventListener("click", ev=>{
                if($('.layers-search.cat-selected', GUI)){
                    new Layer(layer.name);
                    layers_search_back(ev);
                    layers_search_close();
                }
            });
        }
    };
    let lc = $('.layers-search .layers-categories', GUI);
    for(let i in layers.DB.categories){
        let cat = layers.DB.categories[i];
        let id = unique_id('category');
        let el = $C(vformat(layer_category_tpl,{
            title: i,
            id: id
        })).firstElementChild;
        lc.appendChild(el);
        let cc = $('.subcategories', el);
        if(cat.subcategories) {
            let ellipsis_countdown = ellipsis_pos;
            for (let j in cat.subcategories) {
                if(--ellipsis_countdown === 0) cc.appendChild($C(layer_selection_ellipsis));

                let sub = cat.subcategories[j];
                let sid = unique_id("subcategory");
                let s_el = $C(vformat(layer_subcategory_tpl, {
                    title: j,
                    id: sid
                })).firstElementChild;
                s_el.addEventListener("click", layers_select_open_subcategory);
                cc.appendChild(s_el);
                let sc = $('.layers-list', s_el);
                make_layers(sub, sc);
            }
        } else make_layers(cat, cc);
    }
}

function time_change(new_time, update_layers=true, test=false) {
    if(test && layers.time.isSame(new_time, "day")) return;
    console.log(new_time.format("YYYY MMM DD"));

    let t = layers.time = moment(new_time);
    $('.time-machine .year input', GUI).value = t.format("Y");
    $('.time-machine .month input', GUI).value = t.format("MMM").substr(0,3);
    $('.time-machine .day input', GUI).value = t.format("DD");

    if(update_layers) for(let l of layers) l.create_map_level();
}

function layer_keyword(layer, keyword){
    let branch = layers.keymap;
    if(keyword.length === 0) return;
    for(let c of keyword.split("")){
        if(!branch[c]) branch[c] = {};
        branch = branch[c];
    }
    if(!branch.layers) branch.layers = [];
    branch.layers.push(layer.name);
}

let keyword_re = /(Ё|Й|ё|й|[\wа-яёА-ЯЁ])+/gmiu;
function layer_keywords(layer){
    if(!layers.keymap) layers.keymap = {};

    let exec_on = (str)=> {
        if(!str) return;
        str = str.toLowerCase();
        let keyword;
        while ((keyword = keyword_re.exec(str)) !== null) {
            layer_keyword(layer, keyword[0]);
        }
    };
    exec_on(layer.keywords);
    exec_on(layer.title);
    exec_on(layer.tiles);
    exec_on(layer.provider);
    exec_on(layer.description);
}

function flatten_searcher(branch){
    let ret = [];
    for(let i in branch){
        if(i === "layers")
            ret = ret.concat(branch.layers);
        else
            ret = ret.concat(flatten_searcher(branch[i]));
    }
    return ret;
}

function layers_search_keyword(keyword) {
    let branch = layers.keymap;
    for(let c of keyword.split("")){
        if(!branch[c]) return [];
        branch = branch[c];
    }
    return flatten_searcher(branch);
}
function layers_search(search) {
    let keyword;
    let layers_hits = {};
    let max = 0;
    search = search.toLowerCase();
    while ((keyword = keyword_re.exec(search)) !== null) {
        let res = layers_search_keyword(keyword[0]);
        for(let name of res){
            ++layers_hits[name];
            max = Math.max(max, layers_hits);
        }
    }
    for(let i in layers_hits){
        if(layers_hits[i] < max-2)
            delete layers_hits[i];
    }
    return Object.keys(layers_hits).sort((a,b) => layers_hits[a]-layers_hits[b]);
}

function getLayers(){
    return fetch_json("./layers.json")
        .then(layers_db=>{
            layers.DB = layers_db;
            for(let i in layers_db.layers){
                layers_db.layers[i].name = i;
                layer_keywords(layers_db.layers[i]);
            }

            populate_selection_list();
        })
        .catch(console.error);
}

function layers_search_open_category(ev){
    let cat = ev.target.closest('.layer-category');
    cat.classList.add('selected');
    cat.closest('.layers-search').classList.add('cat-selected');
}

function layers_search_back(ev){
    let s = ev.target.closest('.layers-search');
    s.classList.remove('cat-selected');
    for(let i of $A(".layer-category.selected", s))
        i.classList.remove('selected');

    for(let i of $A(".layer-subcategory.opened", s))
        i.classList.remove("opened");

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
    layers.time = moment();

    document.body.appendChild($C(html));
    GUI = $('.map-gui');
    layers_editor = $('.layers-editor', GUI);
    let layers_container = $('.map-layers', GUI);
    let layers_btn = $('.layers-toggle-button', GUI);
    layers_btn.addEventListener('click', ()=>{
        layers_container.classList.toggle('editor-hidden');
    });
    $('.layers-search .close', GUI).addEventListener('click', layers_search_close);

    time_change(layers.time);

    $('.layers-buttons .add-layer', GUI).addEventListener('click', layers_search_open);
    $('.layers-search>.layers-categories', GUI).addEventListener('click', layers_search_open_category);
    $('.layers-search>.back', GUI).addEventListener('click', layers_search_back);

    $('.time-machine .year .up', GUI).addEventListener('click', ()=>time_change(layers.time.add(1, 'year')));
    $('.time-machine .year .down', GUI).addEventListener('click', ()=>time_change(layers.time.subtract(1, 'year')));
    $('.time-machine .month .up', GUI).addEventListener('click', ()=>time_change(layers.time.add(1, 'month')));
    $('.time-machine .month .down', GUI).addEventListener('click', ()=>time_change(layers.time.subtract(1, 'month')));
    $('.time-machine .day .up', GUI).addEventListener('click', ()=>time_change(layers.time.add(1, 'day')));
    $('.time-machine .day .down', GUI).addEventListener('click', ()=>time_change(layers.time.subtract(1, 'day')));

    let changer=(element, parser)=>{
        let on_change=(ev)=>{
            if(ev.type === 'keypress' && ev.key !== 'Enter') return;
            ev.stopPropagation();
            ev.preventDefault();
            parser(element.value);
        };
        element.addEventListener('blur', on_change);
        element.addEventListener('keypress', on_change, true);
    };
    changer($('.time-machine .year input', GUI), val=>time_change(layers.time.year(parseInt(val))));
    changer($('.time-machine .day input', GUI), val=>time_change(layers.time.day(parseInt(val))));
    let re=/^[a-z]+$/i;
    changer($('.time-machine .month input', GUI), val=>{
        let m = moment(val, "MMM", val.match(re) ? "en" : 'ru');
        time_change(layers.time.month(m.month()));
    });



    let switch_view = stopper(ev => {
        location.replace(location.origin + dirname(location.pathname) + "/" + basename(ev.target.href)
            + (location.search || "") + (location.hash || ""));
    });
    $(".buttons .no-gl").addEventListener("click", switch_view);
    $(".buttons .w-gl").addEventListener("click", switch_view);
}
