// place_map.js — putting the pin where the door actually is (25 Sep 2026).
//
// A courier is not given an address, it is given a point. That is Lalamove's own
// position, and it raises ERR_REVERSE_GEOCODE_FAILURE when it cannot make an address
// into one. So the app has to hold a point for the bakery (once) and for each
// customer (once each), and hers was the choice in so many words: "Locate it, let me
// fix it." This file is the "let me fix it" half.
//
// THE APP'S FIRST OUTSIDE DEPENDENCY, named rather than slipped in: the map is
// Leaflet 1.9.4 and the tiles are OpenStreetMap. Neither is bundled; the script is
// fetched the first time a screen needs a map and never on boot. And the screen works
// without it — if the script cannot be fetched (a phone on one bar, a CDN having a bad
// day) the same card offers the coordinates instead. A picker that dead-ends because a
// third party is unreachable would be worse than no map at all.
//
// The tiles are asked for the way OpenStreetMap's usage policy requires: a real
// attribution, no bulk, no scraping, and only the tiles somebody is actually looking
// at. Nothing about a customer is sent to the tile server — a tile request carries a
// zoom level and a square of the world, and that is all it carries.
//
// NOT pure, so not Node-tested: this file is a map and nothing else. Every rule it
// obeys about what a place IS lives in courier_place.js, which is pure and tested.

import { el, button, showPopup, toast } from "./ui.js";
import { validPlace, parseCoords } from "./courier_place.js";
import { geocodeAddress } from "./couriers/api.js";

const LEAFLET_VERSION = "1.9.4";
const LEAFLET_CSS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
const LEAFLET_JS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIB = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
// A CDN that never answers must not leave a spinner on a phone forever. Past this the
// map is declared unavailable and the numbers are offered instead — a working screen,
// not an apology.
const LOAD_MS = 9000;
// Where the map opens when nothing is known yet: Penang, which is where the bakery is.
// A starting view is not a place — nothing is pinned by it.
const HOME = { lat: 5.4141, lng: 100.3288, zoom: 13 };

let loading = null;

// Leaflet, fetched once per page life. A failure clears the promise rather than
// caching it, so an attempt after the signal comes back can still succeed — a cached
// "the CDN is down" is a claim about now that outlives now.
export function loadLeaflet() {
  if (window.L && window.L.map) return Promise.resolve(window.L);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const fail = (why) => { loading = null; reject(new Error(why)); };
    const timer = setTimeout(() => fail("it did not load in time"), LOAD_MS);
    if (!document.querySelector("link[data-leaflet]")) {
      document.head.append(el("link", { rel: "stylesheet", href: LEAFLET_CSS, "data-leaflet": "1" }));
    }
    document.head.append(el("script", {
      src: LEAFLET_JS,
      async: true,
      onload: () => {
        clearTimeout(timer);
        if (window.L && window.L.map) resolve(window.L);
        else fail("it loaded but was not usable");
      },
      onerror: () => { clearTimeout(timer); fail("it could not be fetched"); },
    }));
  });
  return loading;
}

// The map screen.
//
//   state    the app's state — the lookup goes through the signed-in channel
//   address  the words she already has for this door: what is looked up, and the
//            label the pin wears when the geocoder had no name of its own
//   start    a point already saved for this door, if there is one
//   onPick   called with { lat, lng, label } — exactly what setPickupPlace and
//            setDropPlace take, so no caller has to reshape it
//
// Returns close(), like every other pop-up in the app.
export function openPlacePicker({ state, title = "Put the pin on the map", hint = "", address = "", start = null, onPick }) {
  let label = String(address || "").trim();
  let chosen = validPlace(start);
  let map = null;
  let marker = null;
  let live = true;
  // Which build of the card is on screen. The map arrives from the network, so its
  // callback runs after whatever is happening now; a repaint would otherwise leave it
  // writing into a node that is no longer on the page. Same reason the chart is drawn
  // twice at v167 — a detached node cannot be measured or trusted.
  let gen = 0;
  // Assigned inside the card below, and held out here because closing the pop-up has
  // to take the listener off with the map — a handler left on the window pointing at a
  // removed card is the kind of leak nobody sees until the fifth pin.
  let onResize = () => {};

  const closePopup = showPopup(title, () => {
    const mine = ++gen;
    const mineStill = () => live && mine === gen;

    // A repaint replaces the body, so the previous map is torn down with it. Leaflet
    // holds window listeners and a tile layer of its own; leaving one running behind a
    // card that has moved on is a leak that also answers resize calls forever.
    if (map) { map.off(); map.remove(); map = null; marker = null; }
    window.removeEventListener("resize", onResize);

    const say = (text, style = "margin:8px 0 0") => el("p", { class: "card-sub", style }, text);

    // ── one place that moves the pin, so every route into it agrees ──────
    // The marker, the centre and the line under the map move together or not at all.
    // Three things that could be moved separately would eventually read as three
    // different answers to "where is this".
    function put(place, zoom) {
      const p = validPlace(place);
      if (!p) return;
      chosen = p;
      useBtn.disabled = false;
      coordsLine.textContent = `Pinned at ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
      if (!map || !mineStill()) return;
      if (marker) marker.setLatLng([p.lat, p.lng]);
      else marker = window.L.marker([p.lat, p.lng], { draggable: true }).addTo(map).on("dragend", onDrag);
      map.setView([p.lat, p.lng], zoom || map.getZoom());
    }

    function onDrag(e) {
      const at = e.target.getLatLng();
      put({ lat: at.lat, lng: at.lng });
      useBtn.disabled = false;
      coordsLine.textContent += "  (moved by hand)";
    }

    onResize = () => { if (map && mineStill()) map.invalidateSize(); };

    // ── the words she has, and the lookup ────────────────────────────────
    const addrInput = el("input", { class: "input", type: "text", value: address,
      placeholder: "12 Jalan Bunga, 10450 Penang" });
    const findStatus = say("");
    findStatus.hidden = true;
    const findBtn = button("Look it up", async () => {
      const text = addrInput.value.trim();
      if (!text) { findStatus.hidden = false; findStatus.textContent = "Type the address first, or put the pin on the map by hand."; return; }
      findBtn.disabled = true;
      findStatus.hidden = false;
      findStatus.textContent = "Looking this address up…";
      const out = await geocodeAddress(state, text);
      if (!mineStill()) return;
      findBtn.disabled = false;
      if (!out.ok) {
        // A miss is a normal answer, not an error to apologise for: the map is one tap
        // away and the numbers are one field away, so this reads as an instruction.
        findStatus.textContent = out.reason;
        return;
      }
      label = out.place.label || text;
      findStatus.textContent = `Found: ${label}`;
      put(out.place, 17);
    });

    // ── the spot she settles on ──────────────────────────────────────────
    const coordsLine = say("No spot chosen yet.");
    const useBtn = button("Use this spot", () => {
      const p = validPlace(chosen);
      if (!p) return;
      onPick({ lat: p.lat, lng: p.lng, label });
      toast("Pin saved");
      closePopup();
    }, "primary");
    // A control that does nothing must look inert — the app's own rule about
    // affordances. With no spot chosen there is nothing to use, and the button is off.
    useBtn.disabled = !chosen;

    // ── the fallback, and it is the way out rather than a hidden extra ───
    // Numbers she copied from anywhere: a Google Maps link, a message from the
    // customer, a place she knows by heart. courier_place.js reads all four shapes.
    const numInput = el("input", { class: "input", type: "text",
      placeholder: "5.4141, 100.3288  or a Google Maps link" });
    const numStatus = say("");
    numStatus.hidden = true;
    const numBtn = button("Use these numbers", () => {
      const p = parseCoords(numInput.value);
      numStatus.hidden = false;
      if (!p) {
        numStatus.textContent = "That does not look like a pair of coordinates or a map link.";
        return;
      }
      label = label || addrInput.value.trim();
      numStatus.textContent = "Pinned from your numbers — check it on the map if one is showing.";
      put(p, 17);
    }, "ghost");

    // ── the map itself, which may not arrive ────────────────────────────
    const mapBox = el("div", { class: "place-map" });
    const mapNote = say("");
    mapNote.hidden = true;

    loadLeaflet().then((L) => {
      if (!mineStill()) return;
      map = L.map(mapBox, { scrollWheelZoom: false, zoomControl: true }).setView([HOME.lat, HOME.lng], HOME.zoom);
      L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIB }).addTo(map);
      map.on("click", (e) => put({ lat: e.latlng.lat, lng: e.latlng.lng }));
      map.on("dragend", () => { if (mineStill()) map.invalidateSize(); });
      if (chosen) put(chosen, 16);
      // The box is measured once the card has been laid out. A map built inside a
      // pop-up that has not settled measures zero and draws a corner of one tile,
      // which is the difference between a working map and a broken one.
      requestAnimationFrame(() => { if (mineStill() && map) map.invalidateSize(); });
      window.addEventListener("resize", onResize);
    }).catch((err) => {
      if (!mineStill()) return;
      mapBox.remove();
      mapNote.hidden = false;
      mapNote.textContent = `The map is not available right now (${(err && err.message) || "it could not be loaded"}). `
        + "Type the coordinates below instead — a Google Maps link works too.";
    });

    return [
      el("p", { class: "card-sub", style: "margin:0 0 10px" },
        hint || "Look the address up, then drag the pin to the exact door. What you keep here is remembered for this customer."),
      el("div", { class: "field", style: "margin-bottom:0" },
        el("label", {}, "The address you have"),
        addrInput,
        el("div", { class: "btn-row", style: "margin-top:10px" }, findBtn),
        findStatus),
      mapBox,
      mapNote,
      el("div", { class: "field", style: "margin:14px 0 0" },
        el("label", {}, "Coordinates, if you have them"),
        numInput,
        el("div", { class: "btn-row", style: "margin-top:10px" }, numBtn),
        numStatus,
        el("p", { class: "card-sub", style: "margin:6px 0 0" },
          "Paste a Google Maps link, or the pair of numbers. Both are read, and this is the way through when a map will not load.")),
      coordsLine,
      el("div", { class: "btn-row" }, useBtn),
    ];
  }, { wide: true });

  return () => {
    live = false;
    gen++;
    if (map) { map.off(); map.remove(); map = null; marker = null; }
    window.removeEventListener("resize", onResize);
    closePopup();
  };
}
