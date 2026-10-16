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
const pandaIndex = 1 + Math.floor(Math.random() * (teams.length - 1));
teams.splice(pandaIndex, 0, "Red Panda Break");
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
    "Red Panda Break": "icon-redpanda",
    "The End!": "icon-end"
};

const pandaGifEl = document.getElementById('pandaGif');
const pandaImgEl = document.getElementById('pandaImg');

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

    pandaGifEl.style.display = 'none';
    pauseButton.style.display = 'none';
    setPaused(false);

    if (team === "Red Panda Break") {
        updateTeamName("Cute Red Panda GIF of the Week");
        timerElement.style.display = 'none';
        nextTeamButton.textContent = 'Back to Work';
        setBodyBackgroundColor('panda');
        pandaGifEl.style.display = 'block';
        loadRandomPanda();
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
    document.body.classList.remove('start', 'green', 'yellow', 'red', 'panda');
    document.body.classList.add(color);
}

// Red panda gifs come from GIPHY. This is a client-side key (visible in the
// page source by design, rate-limited per key, not a secret) created at
// developers.giphy.com.
const GIPHY_API_KEY = 'PpyiwtuliHaL9LNjgZr7hpeIKD8JyNHJ';

// Giphy's "random gif with tag" endpoint matches loosely (it served cartoon
// pandas and a Khan Academy clip when tested), so we search instead: fetch a
// page of search results, shuffle it, and work through it. "Another Red Panda"
// only calls the API again once the page is used up.
let pandaQueue = [];

function loadRandomPanda() {
    pandaImgEl.src = '';
    pandaImgEl.alt = 'Loading a red panda...';
    if (pandaQueue.length) {
        showPanda(pandaQueue.pop());
        return;
    }
    const offset = Math.floor(Math.random() * 25); // pool = top 50 results; deeper pages drift off topic
    const url = 'https://api.giphy.com/v1/gifs/search'
        + '?api_key=' + encodeURIComponent(GIPHY_API_KEY)
        + '&q=red+panda&limit=25&offset=' + offset + '&rating=g&lang=en';
    fetch(url)
        .then(r => r.ok ? r.json() : Promise.reject(new Error('GIPHY HTTP ' + r.status)))
        .then(data => {
            const gifs = (data?.data ?? [])
                .map(g => g.images?.downsized_medium?.url || g.images?.original?.url)
                .filter(Boolean);
            if (!gifs.length) throw new Error('GIPHY returned no gifs');
            shuffleArray(gifs);
            pandaQueue = gifs;
            showPanda(pandaQueue.pop());
        })
        .catch(err => {
            console.warn('GIPHY failed, falling back to a photo:', err);
            loadFallbackPanda();
        });
}

function showPanda(url) {
    pandaImgEl.src = url;
    pandaImgEl.alt = 'Cute red panda';
}

// Fallback when GIPHY is unavailable (missing key, rate limit, outage): a
// random red panda photo from some-random-api, which needs no key.
function loadFallbackPanda() {
    fetch('https://some-random-api.com/animal/red_panda')
        .then(r => r.json())
        .then(data => {
            if (data?.image) {
                pandaImgEl.src = data.image;
                pandaImgEl.alt = 'Cute red panda';
            } else {
                pandaImgEl.alt = 'No red panda this week, sorry';
            }
        })
        .catch(() => { pandaImgEl.alt = 'No red panda this week, sorry'; });
}

document.getElementById('newPanda').addEventListener('click', loadRandomPanda);

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return weekNo;
}