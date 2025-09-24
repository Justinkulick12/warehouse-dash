const STATES_RED = new Set(["NY","NJ","CA","MA","NV","OR"]);
const TRAVELER_PURPLE = new Set([
  "Gabriela Endara","Jose Arroyo","Andres Alvarez","Gianni Bloise","Genesis Ronquillo",
  "Martha Aguirre","Paola Salcan","Karen Chapman","Daniel Molineros","Anto",
  "Veronica Endara","Delia Vera","Milton Jijon","Kenia Jimenez","Carlos Matute",
  "Andrea Martinez","Delicia Rodriguez Mendez","Genesis Ronquillo - Vuelo de carga",
  "Daniel Lliguicota","Romina Campodonico + Jeampiero","Isabella Piedrahita",
  "Juan C Chevrasco","Nicole Matamoros","Fabricio Triviño","Freddy Arboleda",
  "David Muzzio Ruliova","Santiago Ruliova","Betty Lastre","Priscila Alejandro",
  "Jeniffer Zambrano","Alison Fajardo","Wesley Triviño","Leonardo Pauta",
  "Erick Pauta","Dario Pauta","Diana Pauta","Jorge Ivan Alejandro","Ana Belen Alejandro",
  "Bruno Pagnacco","Katy Valdivieso","Eddy Vera","Ericka Pluas","Domenica Pluas"
]);

function parseDateString(str) {
  return new Date(str);
}
function getWeekdayNumber(date) {
  const d = new Date(date);
  let wd = d.getDay();
  if (wd === 0) wd = 7;
  return wd;
}
function getDefaultDateRange() {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  return { start: now, end };
}

let allTrips = [];

function saveTripState(tripId, field, value) {
  const key = `tripState_${tripId}`;
  let obj = JSON.parse(localStorage.getItem(key) || "{}");
  obj[field] = value;
  localStorage.setItem(key, JSON.stringify(obj));
}
function loadTripState(tripId) {
  return JSON.parse(localStorage.getItem(`tripState_${tripId}`) || "{}");
}

function clearGridCells() {
  document.querySelectorAll(".cell").forEach(c => c.innerHTML = "");
}
function renderMetrics(filteredTrips) {
  document.getElementById("totalTrips").textContent = filteredTrips.length;
  let sum = 0;
  filteredTrips.forEach(tr => {
    sum += Number(tr["Items Accepted"]) || 0;
  });
  document.getElementById("totalItems").textContent = sum;
}
function renderGrid(filterStart, filterEnd) {
  clearGridCells();
  const filtered = allTrips.filter(trip => {
    const bd = parseDateString(trip["Ship Bundle"]);
    if (filterStart && filterEnd) {
      return bd >= filterStart && bd <= filterEnd;
    }
    return true;
  });

  filtered.sort((a, b) => {
    return parseDateString(a["Ship Bundle"]) - parseDateString(b["Ship Bundle"]);
  });

  renderMetrics(filtered);

  filtered.forEach(trip => {
    const weekday = getWeekdayNumber(trip["Ship Bundle"]);
    if (weekday > 5) return;

    const saved = loadTripState(trip["Trip ID"]);
    const status = saved.status || trip["Trip Verification Status"];
    const cell = document.querySelector(`.cell[data-status="${status}"][data-day="${weekday}"]`);
    if (!cell) return;

    const tile = createTripTile(trip, status);
    cell.appendChild(tile);
  });

  setupDragAndDrop();
}

function createTripTile(trip, status) {
  const div = document.createElement("div");
  div.classList.add("trip-tile");
  if (trip["Trip Verification Status"] !== "TX Approved") {
    div.classList.add("highlight-not-approved");
  }
  if (STATES_RED.has(trip["USA Dest"])) {
    div.classList.add("highlight-dest-red");
  }
  if (TRAVELER_PURPLE.has(trip["Traveler"])) {
    div.classList.add("highlight-trav-purple");
  }

  div.dataset.tripId = trip["Trip ID"];
  div.dataset.status = status;

  const sum = document.createElement("div");
  sum.classList.add("summary");
  sum.innerHTML = `
    <div><strong>ID:</strong> ${trip["Trip ID"]}</div>
    <div><strong>Traveler:</strong> ${trip["Traveler"]}</div>
    <div><strong>Ship Bundle:</strong> ${trip["Ship Bundle"]}</div>
    <div><strong>Dest:</strong> ${trip["USA Dest"]}</div>
    <div><strong>Accepted:</strong> ${trip["Items Accepted"]}</div>
    <div><strong>Status:</strong> ${status}</div>
  `;
  div.appendChild(sum);

  const dt = document.createElement("div");
  dt.classList.add("details");
  dt.innerHTML = `
    <div><strong>Max USA Date:</strong> ${trip["Max USA Date"]}</div>
    <div><strong>Items Ready to process:</strong> ${trip["Items Ready to process"]}</div>
    <div><strong>Total Weight:</strong> ${trip["Total Bundle Weight"]}</div>
    <div><strong>User ID:</strong> ${trip["User ID"]}</div>
  `;
  div.appendChild(dt);

  div.addEventListener("click", e => {
    if (e.target.tagName.toLowerCase() === "input") return;
    div.classList.toggle("expanded");
  });

  const inp = document.createElement("input");
  inp.type = "text";
  inp.placeholder = "Your name...";
  inp.classList.add("assign-input");
  const saved = loadTripState(trip["Trip ID"]);
  inp.value = saved.assignedName || "";
  inp.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      const name = inp.value.trim();
      saveTripState(trip["Trip ID"], "assignedName", name);
      inp.blur();
    }
  });
  div.appendChild(inp);

  return div;
}

function setupDragAndDrop() {
  document.querySelectorAll(".cell").forEach(cell => {
    Sortable.create(cell, {
      group: "sharedGrid",
      animation: 150,
      onAdd: evt => {
        const tile = evt.item;
        const newStatus = evt.to.getAttribute("data-status");
        const tripId = tile.dataset.tripId;
        saveTripState(tripId, "status", newStatus);
      }
    });
  });
}

document.getElementById("csvInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: results => {
      allTrips = results.data;
      const { start, end } = getDefaultDateRange();
      document.getElementById("dateStart").valueAsDate = start;
      document.getElementById("dateEnd").valueAsDate = end;
      renderGrid(start, end);
    }
  });
});

document.getElementById("applyDateFilter").addEventListener("click", () => {
  const start = document.getElementById("dateStart").valueAsDate;
  const end = document.getElementById("dateEnd").valueAsDate;
  renderGrid(start, end);
});
document.getElementById("resetDateFilter").addEventListener("click", () => {
  const { start, end } = getDefaultDateRange();
  document.getElementById("dateStart").valueAsDate = start;
  document.getElementById("dateEnd").valueAsDate = end;
  renderGrid(start, end);
});
