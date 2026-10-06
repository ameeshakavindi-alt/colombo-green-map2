// ===============================
// 1. CREATE MAP
// ===============================

var map = L.map('map').setView([6.90, 79.90], 10);


// ===============================
// 2. OPENSTREETMAP BASE MAP
// ===============================

var osm = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        attribution: '&copy; OpenStreetMap contributors'
    }
).addTo(map);


// ===============================
// 3. CREATE LAYER GROUPS
// ===============================

var greenSpacesLayer = L.layerGroup().addTo(map);
var access400Layer = L.layerGroup();
var access800Layer = L.layerGroup();
var populationLayer = L.layerGroup();


// ===============================
// 4. GREEN SPACES
// ===============================

fetch('data/green_spaces.geojson')
    .then(response => response.json())
    .then(data => {

        L.geoJSON(data, {

            style: {
                color: "green",
                weight: 1,
                fillColor: "green",
                fillOpacity: 0.6
            },

            onEachFeature: function(feature, layer) {

                var popup = "<b>Public Green Space</b><br><br>";

                for (var key in feature.properties) {
                    if (feature.properties[key] !== null) {
                        popup += "<b>" + key + ":</b> "
                              + feature.properties[key] + "<br>";
                    }
                }

                layer.bindPopup(popup);
            }

        }).eachLayer(function(layer) {
            greenSpacesLayer.addLayer(layer);
        });

    });


// ===============================
// 5. 400 m ACCESS
// ===============================

fetch('data/access_400m.geojson')
    .then(response => response.json())
    .then(data => {

        L.geoJSON(data, {

            style: {
                color: "orange",
                weight: 1,
                fillColor: "orange",
                fillOpacity: 0.25
            }

        }).eachLayer(function(layer) {
            access400Layer.addLayer(layer);
        });

    });


// ===============================
// 6. 800 m ACCESS
// ===============================

fetch('data/access_800m.geojson')
    .then(response => response.json())
    .then(data => {

        L.geoJSON(data, {

            style: {
                color: "blue",
                weight: 1,
                fillColor: "blue",
                fillOpacity: 0.15
            }

        }).eachLayer(function(layer) {
            access800Layer.addLayer(layer);
        });

    });


// ===============================
// 7. POPULATION DENSITY
// ===============================

fetch('data/population_density.geojson')
    .then(response => response.json())
    .then(data => {

        L.geoJSON(data, {

            style: function(feature) {

                var density =
                    feature.properties.pop_density ??
                    feature.properties["pop density"] ??
                    feature.properties.Pop_Density ??
                    0;

                var fill;

                if (density <= 5000) {
                    fill = "#ffffcc";
                }
                else if (density <= 10000) {
                    fill = "#ffeda0";
                }
                else if (density <= 20000) {
                    fill = "#feb24c";
                }
                else if (density <= 30000) {
                    fill = "#f03b20";
                }
                else {
                    fill = "#bd0026";
                }

                return {
                    color: "#666",
                    weight: 0.5,
                    fillColor: fill,
                    fillOpacity: 0.6
                };
            },

            onEachFeature: function(feature, layer) {

                var density =
                    feature.properties.pop_density ??
                    feature.properties["pop density"] ??
                    feature.properties.Pop_Density ??
                    "N/A";

                layer.bindPopup(
                    "<b>Population Density</b><br>" +
                    "Density: " + density
                );
            }

        }).eachLayer(function(layer) {
            populationLayer.addLayer(layer);
        });

    });

// Community Reports layer
var communityReportsLayer = L.layerGroup(); 

// Green Cover layer
var greenCoverLayer = L.layerGroup();

var greenCoverBounds = [
    [6.7153559064, 79.8199842335],
    [6.9811673990, 80.2238667852]
];

var greenCoverImage = L.imageOverlay(
    "data/green_cover.png",
    greenCoverBounds,
    {
        opacity: 0.5,
        interactive: false,
        alt: "Green cover in Colombo District"
    }
);

greenCoverLayer.addLayer(greenCoverImage);

// ======================================
// COMMUNITY REPORTS FROM CSV
// ======================================

fetch("data/community_reports.csv")
    .then(response => {
        if (!response.ok) {
            throw new Error("Could not load community_reports.csv");
        }
        return response.text();
    })
    .then(csvText => {

        // Simple CSV parser
        function parseCSV(text) {
            const rows = [];
            let row = [];
            let value = "";
            let insideQuotes = false;

            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const next = text[i + 1];

                if (char === '"') {
                    if (insideQuotes && next === '"') {
                        value += '"';
                        i++;
                    } else {
                        insideQuotes = !insideQuotes;
                    }
                }
                else if (char === "," && !insideQuotes) {
                    row.push(value.trim());
                    value = "";
                }
                else if ((char === "\n" || char === "\r") && !insideQuotes) {
                    if (char === "\r" && next === "\n") {
                        i++;
                    }

                    row.push(value.trim());
                    value = "";

                    if (row.some(cell => cell !== "")) {
                        rows.push(row);
                    }

                    row = [];
                }
                else {
                    value += char;
                }
            }

            if (value !== "" || row.length > 0) {
                row.push(value.trim());

                if (row.some(cell => cell !== "")) {
                    rows.push(row);
                }
            }

            return rows;
        }

        const rows = parseCSV(csvText);

        if (rows.length < 2) {
            return;
        }

        const headers = rows[0];

        rows.slice(1).forEach(row => {

            const report = {};

            headers.forEach((header, index) => {
                report[header] = row[index] || "";
            });

            const lat = parseFloat(report["Latitude"]);
            const lon = parseFloat(report["Longitude"]);

            if (isNaN(lat) || isNaN(lon)) {
                return;
            }

            const popup = `
                <b>📍 Community Green Space Report</b><br><br>

                <b>Cleanliness:</b> ${report["Cleanliness"]}<br>
                <b>Safety:</b> ${report["Safety"]}<br>
                <b>Facilities:</b> ${report["Facilities"]}<br>
                <b>Shade / tree cover:</b> ${report["Shade / tree cover"]}<br>
                <b>Accessibility:</b> ${report["Accessibility for people with disabilities"]}<br>
                <b>Overall quality:</b> ${report["Overall quality"]}<br>

                ${
                    report["Additional comments"]
                    ? "<b>Comment:</b> " + report["Additional comments"] + "<br>"
                    : ""
                }

                <br>
                <small>Anonymous community report</small>
            `;

            L.circleMarker([lat, lon], {
                radius: 7,
                color: "#ffffff",
                weight: 2,
                fillColor: "#8B5E3C",
                fillOpacity: 0.9
            })
            .bindPopup(popup)
            .addTo(communityReportsLayer);

        });

    })
    .catch(error => {
        console.error("Community reports error:", error);
    });




// ===============================
// 8. LAYER SWITCHER
// ===============================

var overlays = {

    "🌳 Public Green Spaces": greenSpacesLayer,
    "🌿 Green Cover": greenCoverLayer,
    "📍 Community Reports": communityReportsLayer,
    "🚶 400 m Access": access400Layer,
    "🚶 800 m Access": access800Layer,
    "👥 Population Density": populationLayer

};

var baseMaps = {
    "OpenStreetMap": osm
};

L.control.layers(baseMaps, overlays).addTo(map);

// ======================================
// 10. COMMUNITY GREEN SPACE REPORTING
// ======================================

var reportMode = false;

var reportControl = L.control({ position: "topleft" });

reportControl.onAdd = function(map) {

    var div = L.DomUtil.create("div", "report-control");

    div.innerHTML = "📍 Report a Green Space";

    div.onclick = function() {

        reportMode = true;
        div.innerHTML = "📍 Click a location on the map";

    };

    L.DomEvent.disableClickPropagation(div);

    return div;
};

reportControl.addTo(map);


// When user clicks the map
map.on("click", function(e) {

    if (!reportMode) {
        return;
    }

    var latitude = e.latlng.lat.toFixed(6);
    var longitude = e.latlng.lng.toFixed(6);

    var formURL =
        "https://docs.google.com/forms/d/e/1FAIpQLSdTjlqqtvwVNh5IFw8-LHszlmtKkMtSogQ7jUammJKoyT6-Iw/viewform?usp=pp_url" +
        "&entry.218807046=" + encodeURIComponent(latitude) +
        "&entry.710953828=" + encodeURIComponent(longitude);

    var popupContent =
        "<b>Green Space Report</b><br><br>" +
        "Latitude: " + latitude + "<br>" +
        "Longitude: " + longitude +
        "<br><br>" +
        "<a href='" + formURL + "' target='_blank' rel='noopener noreferrer'>" +
        "📝 Open Community Report Form" +
        "</a>";

    L.popup()
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(map);

    reportMode = false;

    reportControl.getContainer().innerHTML =
        "📍 Report a Green Space";
});

// ======================================
// MAP INFORMATION PANEL
// ======================================

var infoControl = L.control({ position: "bottomleft" });

infoControl.onAdd = function(map) {

    var div = L.DomUtil.create("div", "info-panel");

    div.innerHTML = `
        <h3>About this map</h3>

        This interactive web map explores urban green-space
        accessibility and quality across Colombo District.

        <br><br>

        <b>Accessibility:</b> 400 m and 800 m zones

        <br>

        <b>Community:</b> Anonymous public reports

        <br>

        <b>Population:</b> GN-level population density
    `;

    return div;
};

infoControl.addTo(map);


// ======================================
// MAP LEGEND
// ======================================

var legendControl = L.control({ position: "bottomright" });

legendControl.onAdd = function(map) {

    var div = L.DomUtil.create("div", "legend-box");

    div.innerHTML = `
        <b>Map Legend</b><br>

        <div class="legend-item">
            <span class="legend-colour"
                  style="background:#228B22;"></span>
            Green Cover
        </div>

        <div class="legend-item">
            <span class="legend-colour"
                  style="background:green;"></span>
            Public Green Spaces
        </div>

        <div class="legend-item">
            <span class="legend-colour"
                  style="background:orange;"></span>
            400 m Access
        </div>

        <div class="legend-item">
            <span class="legend-colour"
                  style="background:blue;"></span>
            800 m Access
        </div>

        <div class="legend-item">
            <span class="legend-colour"
                  style="background:#8B5E3C;"></span>
            Community Reports
        </div>

        <div class="legend-item">
            <span class="legend-colour"
                  style="background:#f03b20;"></span>
            Higher Population Density
        </div>
    `;

    return div;
};

legendControl.addTo(map);

