const defaults = {
  "co2-80w": {
    cutting: {
      "birch plywood": { speed: 12, power: 70, frequency: 20, passes: 1, thicknessRefMm: 3 },
      mdf: { speed: 10, power: 72, frequency: 20, passes: 1, thicknessRefMm: 3 },
      "acrylic (cast)": { speed: 8, power: 65, frequency: 10, passes: 1, thicknessRefMm: 3 },
      leather: { speed: 20, power: 35, frequency: 20, passes: 1, thicknessRefMm: 2 }
    },
    engraving: {
      "birch plywood": { speed: 320, power: 18, frequency: 20, passes: 1 },
      slate: { speed: 280, power: 22, frequency: 20, passes: 1 },
      leather: { speed: 350, power: 16, frequency: 20, passes: 1 }
    }
  },
  "co2-60w": {
    cutting: {
      "birch plywood": { speed: 9, power: 75, frequency: 20, passes: 1, thicknessRefMm: 3 },
      mdf: { speed: 7.5, power: 78, frequency: 20, passes: 1, thicknessRefMm: 3 },
      "acrylic (cast)": { speed: 6.5, power: 70, frequency: 10, passes: 1, thicknessRefMm: 3 }
    },
    engraving: {
      "birch plywood": { speed: 260, power: 20, frequency: 20, passes: 1 },
      slate: { speed: 230, power: 24, frequency: 20, passes: 1 },
      leather: { speed: 280, power: 17, frequency: 20, passes: 1 }
    }
  },
  "fiber-60w-mopa": {
    cutting: {
      "stainless steel": { speed: 140, power: 88, frequency: 35, passes: 3, thicknessRefMm: 1 },
      brass: { speed: 110, power: 90, frequency: 30, passes: 4, thicknessRefMm: 1 }
    },
    engraving: {
      "anodized aluminum": { speed: 1800, power: 42, frequency: 120, passes: 1 },
      "stainless steel": { speed: 950, power: 60, frequency: 70, passes: 1 },
      brass: { speed: 1000, power: 56, frequency: 65, passes: 1 }
    }
  }
};

const jobForm = document.getElementById("job-form");
const feedbackForm = document.getElementById("feedback-form");
const recommendationBox = document.getElementById("recommendation");
const savedResultsContainer = document.getElementById("saved-results");

const laserInput = document.getElementById("laser");
const jobTypeInput = document.getElementById("job-type");
const materialInput = document.getElementById("material");
const thicknessInput = document.getElementById("thickness");
const thicknessUnitInput = document.getElementById("thickness-unit");
const lensGroup = document.getElementById("lens-group");
const fiberLensInput = document.getElementById("fiber-lens");
const thicknessGroup = document.getElementById("thickness-group");

let latestJobContext = null;

function toMm(value, unit) {
  if (!value) return null;
  return unit === "in" ? value * 25.4 : value;
}

function getSavedSettings() {
  return JSON.parse(localStorage.getItem("laser-success-db") || "[]");
}

function saveSetting(entry) {
  const entries = getSavedSettings();
  entries.unshift(entry);
  localStorage.setItem("laser-success-db", JSON.stringify(entries.slice(0, 200)));
}

function normalizeMaterial(value) {
  return value.trim().toLowerCase();
}

function lensSpeedMultiplier(lensMm) {
  if (lensMm === "110") return 0.85;
  if (lensMm === "300") return 1.15;
  return 1;
}

function pickBaseSetting(laser, jobType, material) {
  const library = defaults[laser]?.[jobType] || {};
  return library[material] || Object.values(library)[0] || { speed: 200, power: 20, frequency: 20, passes: 1 };
}

function findSimilarSaved(context) {
  const entries = getSavedSettings();
  return entries.filter((entry) => {
    const sameLaser = entry.laser === context.laser;
    const sameJob = entry.jobType === context.jobType;
    const sameMaterial = entry.material === context.material;
    const sameLens = context.laser !== "fiber-60w-mopa" || entry.fiberLens === context.fiberLens;
    return sameLaser && sameJob && sameMaterial && sameLens;
  });
}

function averageSavedSettings(matches) {
  const result = { speed: 0, power: 0, frequency: 0, passes: 0, count: matches.length };
  for (const match of matches) {
    result.speed += match.speed;
    result.power += match.power;
    result.frequency += match.frequency || 0;
    result.passes += match.passes;
  }

  if (!matches.length) return null;

  return {
    speed: result.speed / matches.length,
    power: result.power / matches.length,
    frequency: result.frequency / matches.length,
    passes: Math.max(1, Math.round(result.passes / matches.length)),
    count: result.count
  };
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function buildRecommendation(context) {
  const base = { ...pickBaseSetting(context.laser, context.jobType, context.material) };

  if (context.jobType === "cutting" && context.thicknessMm && base.thicknessRefMm) {
    const scale = context.thicknessMm / base.thicknessRefMm;
    base.speed = base.speed / Math.max(0.5, scale);
    base.passes = Math.max(1, Math.round(base.passes * scale));
    base.power = Math.min(100, base.power + (scale - 1) * 7);
  }

  if (context.laser === "fiber-60w-mopa") {
    const factor = lensSpeedMultiplier(context.fiberLens);
    base.speed *= factor;
  }

  const historyMatches = findSimilarSaved(context);
  const historicalAverage = averageSavedSettings(historyMatches);

  const recommended = { ...base };
  let sourceText = "Generated from built-in presets.";

  if (historicalAverage) {
    recommended.speed = recommended.speed * 0.6 + historicalAverage.speed * 0.4;
    recommended.power = recommended.power * 0.7 + historicalAverage.power * 0.3;
    recommended.frequency = recommended.frequency * 0.7 + historicalAverage.frequency * 0.3;
    recommended.passes = Math.max(1, Math.round(recommended.passes * 0.6 + historicalAverage.passes * 0.4));
    sourceText = `Blended built-in preset with ${historicalAverage.count} saved successful run(s).`;
  }

  return {
    speed: round1(recommended.speed),
    power: round1(recommended.power),
    frequency: round1(recommended.frequency),
    passes: recommended.passes,
    sourceText
  };
}

function renderRecommendation(context, rec) {
  const thicknessText =
    context.jobType === "cutting" && context.thicknessMm
      ? `<li><strong>Thickness:</strong> ${round1(context.thicknessMm)} mm</li>`
      : "";

  recommendationBox.classList.remove("empty");
  recommendationBox.innerHTML = `
    <p><strong>AI recommendation for ${context.materialLabel}</strong></p>
    <ul>
      <li><strong>Laser:</strong> ${context.laserLabel}</li>
      ${context.fiberLens ? `<li><strong>Lens:</strong> ${context.fiberLens}mm</li>` : ""}
      <li><strong>Job Type:</strong> ${context.jobType}</li>
      ${thicknessText}
      <li><strong>Speed:</strong> ${rec.speed} mm/s</li>
      <li><strong>Power:</strong> ${rec.power}%</li>
      <li><strong>Frequency:</strong> ${rec.frequency} kHz</li>
      <li><strong>Passes:</strong> ${rec.passes}</li>
    </ul>
    <p>${rec.sourceText}</p>
    <p><em>Tip: Test on a scrap piece first and adjust for your machine condition and focus quality.</em></p>
  `;
}

function renderSavedResults() {
  const entries = getSavedSettings();

  if (!entries.length) {
    savedResultsContainer.innerHTML = '<p class="result empty">No saved results yet. Add one after a successful run.</p>';
    return;
  }

  savedResultsContainer.innerHTML = entries
    .slice(0, 20)
    .map(
      (entry) => `
      <article class="saved-item">
        <h3>${entry.materialLabel} — ${entry.jobType}</h3>
        <p><strong>Laser:</strong> ${entry.laserLabel}${entry.fiberLens ? ` (${entry.fiberLens}mm lens)` : ""}</p>
        <p><strong>Settings:</strong> Speed ${entry.speed} mm/s, Power ${entry.power}%, Frequency ${entry.frequency || "n/a"} kHz, Passes ${entry.passes}</p>
        ${entry.thicknessMm ? `<p><strong>Thickness:</strong> ${entry.thicknessMm} mm</p>` : ""}
        ${entry.notes ? `<p><strong>Notes:</strong> ${entry.notes}</p>` : ""}
        <p><small>Saved: ${new Date(entry.createdAt).toLocaleString()}</small></p>
      </article>
    `
    )
    .join("");
}

function syncConditionalInputs() {
  const selectedLaser = laserInput.value;
  const selectedType = jobTypeInput.value;

  lensGroup.classList.toggle("hidden", selectedLaser !== "fiber-60w-mopa");
  thicknessGroup.classList.toggle("hidden", selectedType !== "cutting");

  document.querySelectorAll(".laser-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.laser === selectedLaser);
  });
}

laserInput.addEventListener("change", syncConditionalInputs);
jobTypeInput.addEventListener("change", syncConditionalInputs);

jobForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const material = normalizeMaterial(materialInput.value);
  const thicknessMm = toMm(Number(thicknessInput.value), thicknessUnitInput.value);

  const context = {
    laser: laserInput.value,
    laserLabel: laserInput.options[laserInput.selectedIndex].text,
    fiberLens: laserInput.value === "fiber-60w-mopa" ? fiberLensInput.value : null,
    material,
    materialLabel: materialInput.value.trim(),
    jobType: jobTypeInput.value,
    thicknessMm: jobTypeInput.value === "cutting" ? round1(thicknessMm) : null
  };

  const recommendation = buildRecommendation(context);
  latestJobContext = context;
  renderRecommendation(context, recommendation);
});

feedbackForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!latestJobContext) {
    alert("Please generate a recommendation first so we know what material and laser this feedback belongs to.");
    return;
  }

  const entry = {
    ...latestJobContext,
    speed: Number(document.getElementById("used-speed").value),
    power: Number(document.getElementById("used-power").value),
    frequency: Number(document.getElementById("used-frequency").value) || null,
    passes: Number(document.getElementById("used-passes").value),
    notes: document.getElementById("used-notes").value.trim(),
    createdAt: new Date().toISOString()
  };

  saveSetting(entry);
  feedbackForm.reset();
  renderSavedResults();
  alert("Saved! Your successful settings will influence future recommendations for similar jobs.");
});

syncConditionalInputs();
renderSavedResults();
