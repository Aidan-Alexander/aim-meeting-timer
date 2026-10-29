// Functions ------------------------------------------------------------------

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}

// Main -----------------------------------------------------------------------

// deinfe and shuffle team names ------

let currentTeamIndex = 0;
// const teams = ["Outreach", "Vetting", "Research Team", "Ops", "Charity Entrepreneurship", "AIM Grantmaking", "AIM Research Program","AIM Effective Giving","AIM Founding To Give","Hiring/Chief of Staff Stuff"];
const teams = ["Recruitment", "Research Team", "Ops", "CEIP Program Management", "MEL", "Philanthropy" ];
shuffleArray(teams);
const breakIndex = 1 + Math.floor(Math.random() * (teams.length - 1));
teams.splice(breakIndex, 0, "Animal Break");
const shuffledTeams = [...teams, "The End!"];

console.log(shuffledTeams);

// get the different elements ----------

const timerElement = document.getElementById('timer');
const teamNameElement = document.getElementById('teamName');
const weeklyPromptElement = document.getElementById('weeklyPrompt');
const nextTeamButton = document.getElementById('nextTeam');

const teamIconMap = {
    "Recruitment": "icon-recruitment",
    "Research Team": "icon-research",
    "Ops": "icon-ops",
    "CEIP Program Management": "icon-ceip",
    "MEL": "icon-mel",
    "Philanthropy": "icon-philanthropy",
    "The End!": "icon-end"
};

function showTeamIcon(teamName) {
    document.querySelectorAll('.team-icon').forEach(el => el.classList.remove('active'));
    const iconId = teamIconMap[teamName];
    if (iconId) document.getElementById(iconId).classList.add('active');
}

document.body.style.transition = 'background-color 2s ease'; // Smooth transition for background color

// define timer variable --------------

let currentTime = 0;
let timerInterval = null;
let timePerTeam = 2 * 60; // [s] default time per team
const teamDurations = { "MEL": 60, "Philanthropy": 60 }; // [s] custom durations for specific teams
let timeYellow = 30; // [s] time when screen turns yellow
let timeRed = 5; // [s] time when screen turns red (screamy face)

// load weekly prompts ----------------

const now =new Date();
// const now =new Date(2024,3-1,14+2*7);
const year = now.getFullYear().toString();
const week = getWeekNumber(now).toString();

console.log(year)
console.log(week)

const weeklyPrompt = weeklyPrompts[year]?.[week] ?? null;

console.log(weeklyPrompt);
  
// main loop --------------------------

nextTeamButton.addEventListener('click', () => {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;

    // Hide start screen on first click
    const startScreen = document.getElementById('startScreen');
    if (startScreen) startScreen.remove();

    const team = shuffledTeams[currentTeamIndex];
    updateTeamName(team);
    showTeamIcon(team);
    currentTeamIndex = (currentTeamIndex + 1) % shuffledTeams.length;

    animalSlideActive = false;
    stopAdventure();
    wheelBox.style.display = 'none';
    animalGifEl.style.display = 'none';
    pauseButton.style.display = 'none';
    setPaused(false);

    if (team === "Animal Break") {
        timerElement.style.display = 'none';
        nextTeamButton.textContent = 'Back to Work';
        setBodyBackgroundColor('animal');
        showWheel();
    } else if (team === "The End!") {
        timerElement.style.display = 'none';
        nextTeamButton.textContent = 'Start Again';
    } else {
        nextTeamButton.textContent = 'Next Team';
        timerElement.style.display = 'block';
        currentTime = teamDurations[team] !== undefined ? teamDurations[team] : timePerTeam;
        updateTimerDisplay(currentTime);
        setBodyBackgroundColor('green'); // Reset to green
        startTicking();
    }
});

// pause button -----------------------

const pauseButton = document.getElementById('pauseTimer');
let paused = false;

function startTicking() {
    setPaused(false);
    pauseButton.style.display = 'block';
    timerInterval = setInterval(() => {
        currentTime--;
        updateTimerDisplay(currentTime);

        // Update color based on remaining time
        if (currentTime <= timeRed ) {
            setBodyBackgroundColor('red');
        } else if (currentTime <= timeYellow ) {
            setBodyBackgroundColor('yellow');
            // document.getElementById('timerSound').play();
        }

        if (currentTime <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            pauseButton.style.display = 'none';
            // Play the sound
            document.getElementById('timerSound').play();
            //alert("Time's up for this team!");
        }
    }, 1000);
}

function setPaused(isPaused) {
    paused = isPaused;
    document.body.classList.toggle('paused', paused);
    pauseButton.innerHTML = paused ? '&#x25B6;&#xFE0E;' : '&#x23F8;&#xFE0E;';
    pauseButton.title = paused ? 'Resume (space)' : 'Pause (space)';
}

function togglePause() {
    if (paused) {
        startTicking();
    } else if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        setPaused(true);
    }
}

pauseButton.addEventListener('click', togglePause);
document.addEventListener('keydown', e => {
    if (e.code === 'Space' && pauseButton.style.display !== 'none') {
        e.preventDefault();
        togglePause();
    }
});

// More functions -------------------------------------------------------------

function updateTimerDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    timerElement.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateTeamName(teamName) {
    teamNameElement.textContent = `${teamName}`;
}

function setWeeklyPrompt(weeklyPrompt) {
    weeklyPromptElement.textContent = `${weeklyPrompt}`;
}

function setBodyBackgroundColor(color) {
    document.body.classList.remove('start', 'green', 'yellow', 'red', 'animal');
    document.body.classList.add(color);
}

// Animal break ---------------------------------------------------------------
// A wheel picks the animal, then the gifs come from GIPHY search.
// GIPHY_API_KEY is a client-side key (visible in the page source by design,
// rate-limited per key, not a secret) created at developers.giphy.com.
const GIPHY_API_KEY = 'PpyiwtuliHaL9LNjgZr7hpeIKD8JyNHJ';

// name: used in the title and button. emoji: wheel wedge and slide icon (no
// red panda or capybara emoji exist, so raccoon and beaver stand in). query:
// GIPHY search term; plain names drift into sports teams and cartoons, so some
// are qualified. fallback: some-random-api animal for a photo if GIPHY fails,
// null where it has none.
const ANIMALS = [
    { name: 'Rabbit',    emoji: '🐰', query: 'cute bunny',   fallback: null },
    { name: 'Red Panda', emoji: '🦝', query: 'red panda',    fallback: 'red_panda' },
    { name: 'Duck',      emoji: '🦆', query: 'duckling',     fallback: null },
    { name: 'Cat',       emoji: '🐱', query: 'cute cat',     fallback: 'cat' },
    { name: 'Dog',       emoji: '🐶', query: 'cute dog',     fallback: 'dog' },
    { name: 'Otter',     emoji: '🦦', query: 'sea otter',    fallback: null },
    { name: 'Capybara',  emoji: '🦫', query: 'capybara',     fallback: null },
    { name: 'Penguin',   emoji: '🐧', query: 'baby penguin', fallback: null },
    { name: 'Nematode',  emoji: '🪱', query: 'nematode',     fallback: null },
];
const WHEEL_COLORS = ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d', '#43aa8b', '#4d908e', '#577590', '#277da1'];

// One-off joke modes, switched on with a URL hash and combinable with a comma,
// e.g. aimteammeeting.netlify.app/#nematodes,adventure
//   #nematodes  every wedge on the wheel is a nematode
//   #adventure  the winner starts a top-down adventure game instead of gifs
const MODES = new Set(location.hash.replace(/^#/, '').toLowerCase().split(/[,+\s]+/).filter(Boolean));
window.addEventListener('hashchange', () => location.reload());
const WHEEL_ANIMALS = MODES.has('nematodes')
    ? ANIMALS.map(() => ANIMALS.find(a => a.name === 'Nematode'))
    : ANIMALS;

const wheelBox = document.getElementById('wheelBox');
const wheelRotor = document.getElementById('wheelRotor');
const spinButton = document.getElementById('spinWheel');
const winnerIcon = document.getElementById('icon-winner');
const animalGifEl = document.getElementById('animalGif');
const animalImgEl = document.getElementById('animalImg');
const anotherButton = document.getElementById('anotherGif');
const spinAgainButton = document.getElementById('spinAgain');
const adventureBox = document.getElementById('adventureBox');
const adventureSpinAgain = document.getElementById('adventureSpinAgain');

// Draw the wheel: one wedge per animal, clockwise from the top, emoji facing outwards.
function buildWheel() {
    const n = WHEEL_ANIMALS.length;
    const cx = 160, cy = 160, r = 150, step = 360 / n;
    const pt = (deg, rad) => {
        const a = (deg - 90) * Math.PI / 180;   // 0deg = top, increasing clockwise
        return [(cx + rad * Math.cos(a)).toFixed(2), (cy + rad * Math.sin(a)).toFixed(2)];
    };
    let svg = '<svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">';
    WHEEL_ANIMALS.forEach((animal, i) => {
        const a0 = i * step, a1 = a0 + step, mid = a0 + step / 2;
        const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r), [tx, ty] = pt(mid, r * 0.68);
        svg += `<path d="M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1} Z" fill="${WHEEL_COLORS[i % WHEEL_COLORS.length]}" stroke="white" stroke-width="3"/>`;
        svg += `<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="central" transform="rotate(${mid} ${tx} ${ty})">${animal.emoji}</text>`;
    });
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="white" stroke-width="6"/>`;
    svg += `<circle cx="${cx}" cy="${cy}" r="20" fill="white"/>`;
    svg += '</svg>';
    wheelRotor.innerHTML = svg;
}
buildWheel();

let wheelRotation = 0;          // cumulative degrees applied to the rotor
let spinning = false;
let spinTimer = null;
let animalSlideActive = false;  // false once the meeting moves on, so a late spin end does nothing
let revealed = false;           // wheel has stopped and the gif area is showing
let wantGif = false;            // a gif was asked for while the queue was empty
let currentAnimal = null;
let gifQueue = [];

function showWheel() {
    animalSlideActive = true;
    revealed = false;
    wantGif = false;
    updateTeamName('Spin the Wheel!');
    animalGifEl.style.display = 'none';
    wheelBox.style.display = 'block';
    spinButton.disabled = false;
}

function spinWheel() {
    if (spinning) return;
    spinning = true;
    spinButton.disabled = true;

    const n = WHEEL_ANIMALS.length, step = 360 / n;
    const index = Math.floor(Math.random() * n);
    currentAnimal = WHEEL_ANIMALS[index];
    gifQueue = [];
    if (!MODES.has('adventure')) loadGifs(currentAnimal);    // fetch while the wheel is still spinning

    // Pick the winner first, then rotate so its wedge ends under the pointer at
    // the top (a little off-centre so it doesn't always land the same way),
    // after five or six full turns.
    const centre = index * step + step / 2;
    const jitter = (Math.random() - 0.5) * step * 0.7;
    const target = ((360 - centre - jitter) % 360 + 360) % 360;
    const current = ((wheelRotation % 360) + 360) % 360;
    const delta = (target - current + 360) % 360;
    wheelRotation += 360 * (5 + Math.floor(Math.random() * 2)) + delta;
    wheelRotor.style.transform = `rotate(${wheelRotation}deg)`;

    clearTimeout(spinTimer);
    spinTimer = setTimeout(onSpinEnd, 4600);   // backup in case transitionend never fires
}

function onSpinEnd(e) {
    if (e && e.propertyName && e.propertyName !== 'transform') return;
    clearTimeout(spinTimer);
    if (!spinning) return;
    spinning = false;
    if (!animalSlideActive) return;
    setTimeout(revealAnimal, 600);   // a beat to see where it landed
}
wheelRotor.addEventListener('transitionend', onSpinEnd);

function revealAnimal() {
    if (!animalSlideActive) return;
    revealed = true;
    wheelBox.style.display = 'none';
    if (MODES.has('adventure') && window.Adventure) {
        updateTeamName(`${currentAnimal.name} Adventure`);
        adventureBox.style.display = 'block';
        Adventure.start(currentAnimal, ANIMALS);
        return;
    }
    updateTeamName(`Cute ${currentAnimal.name} GIF of the Week`);
    winnerIcon.querySelector('span').textContent = currentAnimal.emoji;
    winnerIcon.classList.add('active');
    anotherButton.textContent = `Another ${currentAnimal.name}`;
    animalImgEl.src = '';
    animalImgEl.alt = `Loading a ${currentAnimal.name.toLowerCase()}...`;
    animalGifEl.style.display = 'block';
    showNextGif();
}

function showNextGif() {
    if (!gifQueue.length) {
        wantGif = true;
        animalImgEl.src = '';
        animalImgEl.alt = `Loading a ${currentAnimal.name.toLowerCase()}...`;
        loadGifs(currentAnimal);
        return;
    }
    animalImgEl.src = gifQueue.pop();
    animalImgEl.alt = `Cute ${currentAnimal.name.toLowerCase()}`;
}

// Fetch a page of GIPHY search results for the animal and shuffle it into the
// queue. Offsets stay within the top 50 results: deeper pages drift off topic.
function loadGifs(animal, offset = Math.floor(Math.random() * 25)) {
    const url = 'https://api.giphy.com/v1/gifs/search'
        + '?api_key=' + encodeURIComponent(GIPHY_API_KEY)
        + '&q=' + encodeURIComponent(animal.query)
        + '&limit=25&offset=' + offset + '&rating=g&lang=en';
    return fetch(url)
        .then(r => r.ok ? r.json() : Promise.reject(new Error('GIPHY HTTP ' + r.status)))
        .then(data => {
            const gifs = (data?.data ?? [])
                .map(g => g.images?.downsized_medium?.url || g.images?.original?.url)
                .filter(Boolean);
            if (!gifs.length && offset > 0) return loadGifs(animal, 0);   // thin result set
            if (!gifs.length) throw new Error('GIPHY returned no gifs');
            shuffleArray(gifs);
            deliverGifs(animal, gifs);
        })
        .catch(err => {
            console.warn('GIPHY failed, falling back to a photo:', err);
            loadFallbackPhoto(animal);
        });
}

function deliverGifs(animal, urls) {
    if (animal !== currentAnimal) return;   // the wheel was spun again meanwhile
    gifQueue = urls;
    if (revealed && wantGif) {
        wantGif = false;
        showNextGif();
    }
}

// When GIPHY is unavailable (rate limit, outage, dead key): a random photo of
// the animal from some-random-api, which needs no key, where it has one.
function loadFallbackPhoto(animal) {
    if (!animal.fallback) { noGif(animal); return; }
    fetch('https://some-random-api.com/animal/' + animal.fallback)
        .then(r => r.json())
        .then(data => {
            if (!data?.image) throw new Error('no image');
            deliverGifs(animal, [data.image]);
        })
        .catch(() => noGif(animal));
}

function noGif(animal) {
    if (animal === currentAnimal && revealed) {
        wantGif = false;
        animalImgEl.alt = `No ${animal.name.toLowerCase()} this week, sorry`;
    }
}

spinButton.addEventListener('click', spinWheel);
anotherButton.addEventListener('click', showNextGif);
function spinAgain() {
    stopAdventure();
    winnerIcon.classList.remove('active');
    showWheel();
}
spinAgainButton.addEventListener('click', spinAgain);
adventureSpinAgain.addEventListener('click', spinAgain);

function stopAdventure() {
    if (window.Adventure) Adventure.stop();
    adventureBox.style.display = 'none';
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return weekNo;
}