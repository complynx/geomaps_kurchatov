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
let layer_card_tpl=``;

import {createFragment as $C} from "/modules/create_dom.js";
import {XConsole} from "/modules/console_enhancer.js";
import {vformat} from "/modules/format.js";
import {load_css} from "/modules/dom_utils.js";
import {basename, dirname} from "/modules/utils.js";

load_css('./icons/css/mapfont.css');
load_css("https://fonts.googleapis.com/css?family=Open+Sans:400,400italic,700,300");

let console = new XConsole('Maps');
let $=(s, e=document)=>e && e.querySelector(s);
let $A=(s, e=document)=>e && e.querySelectorAll(s);
let $R=(e)=>e && e.parentNode && e.parentNode.removeChild(e);

let GUI, layers_editor, L, map, layers={};

function getLayers(){
    fetch("./layers.json")
        .then(resp=>resp.json())
        .then(layers_db=>{
            layers.DB = layers_db;
        })
        .catch(console.error);
}

export function init(_map, _L){
    L = _L;
    window.map = map = _map;
    L.tileLayer('https://maps.tilehosting.com/styles/hybrid/{z}/{x}/{y}.jpg?key=yD3ZrAoxDxz16c992fsm', {
        maxZoom: 22,
        minZoom: 0
    }).addTo(map);
    // let tl = L.tileLayer('https://map1.vis.earthdata.nasa.gov/wmts-webmerc/MODIS_Terra_CorrectedReflectance_TrueColor/default/{time}/{tilematrixset}{maxZoom}/{z}/{y}/{x}.{format}', {
    //     maxZoom: 9, //MODIS_Terra_CorrectedReflectance_Bands367 //VIIRS_CityLights_2012
    //     bounds: [[-85.0511287776, -179.999999975], [85.0511287776, 179.999999975]],
    //     format: 'jpg',
    //     time: '',
    //     tilematrixset: 'GoogleMapsCompatible_Level',
    //     minZoom: 0
    // });
    // tl.addTo(map);
    // tl.setOpacity(0.7);

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
