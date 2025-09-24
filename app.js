// Utility: parse date string “September 23, 2025” → Date object
function parseDateString(str) {
  return new Date(str);
}

// Determine default week window (today → +7 days)
function getDefaultDateRange() {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  return { start: now, end };
}

let allTrips = [];  // holds all data

// Render trips into columns
function renderTrips(filterStart, filterEnd) {
  // Clear all columns
  const statuses = ["Pending", "TX Approved", "Rejected", "Preparing", "ReadyForLabel"];
  statuses.forEach(status => {
    document.getElementById(`col-${status}`).innerHTML = "";
  });

  allTrips.forEach(trip => {
    // Filter by Ship Bundle date if outside range
    const bundleDate = parseDateString(trip["Ship Bundle"]);
    if (filterStart && filterEnd) {
      if (bundleDate < filterStart || bundleDate > filterEnd) {
        return;
      }
    }

    const tile = createTripTile(trip);
    // Decide which column
    let colId;
    if (trip["Trip Verification Status"] === "TX Approved") {
      colId = "TX Approved";
    } else if (trip["Trip Verification Status"] === "Rejected") {
      colId = "Rejected";
    } else {
      colId = "Pending";
    }
    document.getElementById(`col-${colId}`).appendChild(tile);
  });
}

// Create a tile element from trip object
function createTripTile(trip) {
  const div = document.createElement("div");
  div.classList.add("trip-tile");

  // Add class based on verification
  const status = trip["Trip Verification Status"];
  if (status === "TX Approved") {
    div.classList.add("approved");
  } else if (status.toLowerCase().includes("reject")) {
    div.classList.add("rejected");
  } else {
    div.classList.add("pending");
  }

  const summary = document.createElement("div");
  summary.classList.add("summary");
  summary.innerHTML = `
    <div><strong>ID:</strong> ${trip["Trip ID"]}</div>
    <div><strong>Traveler:</strong> ${trip["Traveler"]}</div>
    <div><strong>Ship Bundle:</strong> ${trip["Ship Bundle"]}</div>
    <div><strong>Dest:</strong> ${trip["USA Dest"]}</div>
    <div><strong>Accepted:</strong> ${trip["Items Accepted"]}</div>
    <div><strong>Status:</strong> ${trip["Trip Verification Status"]}</div>
  `;
  div.appendChild(summary);

  const details = document.createElement("div");
  details.classList.add("details");
  details.innerHTML = `
    <div><strong>Max USA Date:</strong> ${trip["Max USA Date"] || ""}</div>
    <div><strong>Items Ready to process:</strong> ${trip["Items Ready to process"]}</div>
    <div><strong>Total Bundle Weight:</strong> ${trip["Total Bundle Weight"]}</div>
    <div><strong>User ID:</strong> ${trip["User ID"]}</div>
    <!-- You can add more fields as needed -->
  `;
  div.appendChild(details);

  // Toggle expansion on click
  div.addEventListener("click", e => {
    // Avoid toggling when clicking on input
    if (e.target.tagName.toLowerCase() === "input") return;
    div.classList.toggle("expanded");
  });

  // Assign input
  const assignInput = document.createElement("input");
  assignInput.type = "text";
  assignInput.placeholder = "Your name...";
  assignInput.classList.add("assign-input");
  // Load saved from localStorage
  const saveKey = `assign_${trip["Trip ID"]}`;
  assignInput.value = localStorage.getItem(saveKey) || "";
  assignInput.addEventListener("change", () => {
    localStorage.setItem(saveKey, assignInput.value);
  });
  div.appendChild(assignInput);

  return div;
}

// Initialize drag & drop on column bodies
function setupDragAndDrop() {
  const allBodies = document.querySelectorAll(".column-body");
  allBodies.forEach(body => {
    Sortable.create(body, {
      group: "shared",  // allow dragging between columns
      animation: 150,
      onAdd: (evt) => {
        // When a tile is added to a new column, you could update its status field
        const tile = evt.item;
        const newCol = evt.to.getAttribute("id"); // e.g. "col-Pending"
        // We can map "col-Pending" → status string
        const status = newCol.replace("col-", "");
        // Optionally store this assignment somewhere
        // e.g. localStorage or backend
        tile.dataset.manualStatus = status;
      }
    });
  });
}

// Handler for CSV load
document.getElementById("csvInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      allTrips = results.data;
      const { start, end } = getDefaultDateRange();
      document.getElementById("dateStart").valueAsDate = start;
      document.getElementById("dateEnd").valueAsDate = end;
      renderTrips(start, end);
      setupDragAndDrop();
    }
  });
});

// Date filter handlers
document.getElementById("applyDateFilter").addEventListener("click", () => {
  const start = document.getElementById("dateStart").valueAsDate;
  const end = document.getElementById("dateEnd").valueAsDate;
  renderTrips(start, end);
  setupDragAndDrop();
});
document.getElementById("resetDateFilter").addEventListener("click", () => {
  const { start, end } = getDefaultDateRange();
  document.getElementById("dateStart").valueAsDate = start;
  document.getElementById("dateEnd").valueAsDate = end;
  renderTrips(start, end);
  setupDragAndDrop();
});
