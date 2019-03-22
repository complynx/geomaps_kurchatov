
export function init(map, L){
    L.tileLayer('https://maps.tilehosting.com/styles/hybrid/{z}/{x}/{y}.jpg?key=yD3ZrAoxDxz16c992fsm', {
        attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>',
        maxZoom: 18,
        minZoom: 0
    }).addTo(map);
}
