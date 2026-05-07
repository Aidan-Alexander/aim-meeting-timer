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
const teams = ["Recruitment", "Research Team", "Ops", "CEIP Program Management", "Special projects" ];
shuffleArray(teams);
const bunnyIndex = Math.floor(Math.random() * teams.length);
teams.splice(bunnyIndex, 0, "Bunny Break");
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
    "Special projects": "icon-special",
    "Bunny Break": "icon-bunny",
    "The End!": "icon-end"
};

const bunnyGifEl = document.getElementById('bunnyGif');
const bunnyImgEl = document.getElementById('bunnyImg');

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
const teamDurations = {}; // [s] custom durations for specific teams
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

    // Hide start screen on first click
    const startScreen = document.getElementById('startScreen');
    if (startScreen) startScreen.remove();

    const team = shuffledTeams[currentTeamIndex];
    updateTeamName(team);
    showTeamIcon(team);
    currentTeamIndex = (currentTeamIndex + 1) % shuffledTeams.length;

    bunnyGifEl.style.display = 'none';

    if (team === "Bunny Break") {
        updateTeamName("Cute Bunny GIF of the Week");
        timerElement.style.display = 'none';
        nextTeamButton.textContent = 'Back to Work';
        setBodyBackgroundColor('bunny');
        bunnyGifEl.style.display = 'block';
        loadRandomBunny();
    } else if (team === "The End!") {
        timerElement.style.display = 'none';
        nextTeamButton.textContent = 'Start Again';
    } else {
        nextTeamButton.textContent = 'Next Team';
        timerElement.style.display = 'block';
        currentTime = teamDurations[team] !== undefined ? teamDurations[team] : timePerTeam;
        updateTimerDisplay(currentTime);
        setBodyBackgroundColor('green'); // Reset to green

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
                // Play the sound
                document.getElementById('timerSound').play();
                //alert("Time's up for this team!");
            }
        }, 1000);
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
    document.body.classList.remove('start', 'green', 'yellow', 'red', 'bunny');
    document.body.classList.add(color);
}

function loadRandomBunny() {
    bunnyImgEl.src = '';
    fetch('https://api.bunnies.io/v2/loop/random/?media=gif')
        .then(r => r.json())
        .then(data => {
            if (data?.media?.gif) {
                bunnyImgEl.src = data.media.gif;
            } else {
                loadRandomBunny();
            }
        })
        .catch(() => loadRandomBunny());
}

document.getElementById('newBunny').addEventListener('click', loadRandomBunny);

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return weekNo;
}