// gifs.js: one place for the animal gifs. The wheel slide (script_6.js) and
// the Main Stage drop in #adventure mode (adventure.js) both pull from here.
//
// Each animal in ANIMALS (script_6.js) has a GIPHY search `query`, or a
// hand-picked list of GIPHY `ids` for animals GIPHY search handles badly (the
// nematode), plus an optional some-random-api `fallback` name for a photo
// when GIPHY is unavailable.
//
// GIPHY_API_KEY is a client-side key (visible in the page source by design,
// rate-limited per key, not a secret) created at developers.giphy.com.
window.AnimalGifs = (function () {
'use strict';

const GIPHY_API_KEY = 'PpyiwtuliHaL9LNjgZr7hpeIKD8JyNHJ';
const queues = new Map();    // animal name -> gif urls still to show
const pending = new Map();   // animal name -> in-flight load

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}
const pickUrl = g => g.images?.downsized_medium?.url || g.images?.original?.url;

function load(animal, offset) {
    let url;
    if (animal.ids && animal.ids.length) {
        url = 'https://api.giphy.com/v1/gifs?api_key=' + encodeURIComponent(GIPHY_API_KEY) + '&ids=' + animal.ids.join(',');
    } else {
        if (offset === undefined) offset = Math.floor(Math.random() * 25);   // pool = top 50 results; deeper pages drift off topic
        url = 'https://api.giphy.com/v1/gifs/search?api_key=' + encodeURIComponent(GIPHY_API_KEY)
            + '&q=' + encodeURIComponent(animal.query) + '&limit=25&offset=' + offset + '&rating=g&lang=en';
    }
    return fetch(url)
        .then(r => r.ok ? r.json() : Promise.reject(new Error('GIPHY HTTP ' + r.status)))
        .then(data => {
            const urls = (data?.data ?? []).map(pickUrl).filter(Boolean);
            if (!urls.length && !(animal.ids && animal.ids.length) && offset > 0) return load(animal, 0);   // thin result set
            if (!urls.length) throw new Error('GIPHY returned no gifs');
            return shuffle(urls);
        })
        .catch(err => {
            console.warn('GIPHY failed for ' + animal.name + ', falling back:', err);
            if (animal.ids && animal.ids.length) return shuffle(animal.ids.map(id => 'https://media.giphy.com/media/' + id + '/giphy.gif'));
            if (!animal.fallback) throw err;
            return fetch('https://some-random-api.com/animal/' + animal.fallback)
                .then(r => r.json())
                .then(d => { if (!d?.image) throw err; return [d.image]; });
        });
}

// Start loading an animal's gifs (for instance while the wheel is still spinning).
function prefetch(animal) {
    const q = queues.get(animal.name);
    if (q && q.length) return Promise.resolve(q);
    if (!pending.has(animal.name)) {
        const p = load(animal)
            .then(urls => { queues.set(animal.name, urls); return urls; })
            .finally(() => pending.delete(animal.name));
        pending.set(animal.name, p);
    }
    return pending.get(animal.name);
}

// The next gif for an animal. Resolves to a URL; rejects when nothing could be loaded.
function next(animal) {
    return prefetch(animal).then(() => {
        const q = queues.get(animal.name) || [];
        const url = q.shift();
        if (!q.length) queues.delete(animal.name);   // the next call reloads (a curated list just reshuffles)
        if (!url) throw new Error('no gif');
        return url;
    });
}

return { prefetch, next };
})();
