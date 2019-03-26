let html = `<div class="map-gui">
    <div class="buttons">
        <a class="no-gl" href="./index_gl.html">3D</a>
        <a class="w-gl" href="./index.html">2D</a>
    </div>
    
    <div class="map-layers">
        <div class="layers-toggle-button">Слои</div>
        <div class="layers-editor">
            <div class="layers-list"></div>
            <div class="layers-buttons"><span class="add-layer">Добавить слой</span></div>
        </div>
    </div>
</div>`;

import {createFragment as $C} from "/modules/create_dom.js";
let $=(s, e=document)=>e && e.querySelector(s);
let $A=(s, e=document)=>e && e.querySelectorAll(s);
let $R=(e)=>e && e.parentNode && e.parentNode.removeChild(e);

let GUI, layers_editor, L, map;
import {init as wmts_init} from "./TileLayerWMTS_NASA.js";

export function init(_map, _L){
    wmts_init(_L);
    L = _L;
    map = _map;
    L.tileLayer('https://maps.tilehosting.com/data/satellite/{z}/{x}/{y}.jpg?key=yD3ZrAoxDxz16c992fsm', {
        maxZoom: 20,
        minZoom: 0
    }).addTo(map);
    L.tileLayer.wmts('https://gibs-a.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi', {
        TIME: "2019-03-26T00:00:00Z",
        layer: "Reference_Labels",
        style: "default",
        format: "image/png",
        tilematrixSet: "250m"
    }).addTo(map);

    document.body.appendChild($C(html));
    GUI = $('.map-gui');
    layers_editor = $('.layers-editor', GUI);
    let layers_container = $('.map-layers', GUI);
    let layers_btn = $('.layers-toggle-button', GUI);
    layers_btn.addEventListener('click', ()=>{
        layers_container.classList.toggle('editor-hidden');
    });
}
