// =====================================================
// From My Heart to Yours
// =====================================================

const STORAGE_KEY = "fmhty-letter-v1";

// ---------- Elements ----------
const notebook = document.querySelector(".notebook");
const dateInput = document.getElementById("letter-date");
const toInput = document.getElementById("letter-to");
const fromInput = document.getElementById("letter-from");
const bodyInput = document.querySelector(".letter-body");

const styleButtons = document.querySelectorAll(".style-btn");

const photoLayer = document.getElementById("photo-layer");
const photoInput = document.getElementById("photo-input");
const addPhotoBtn = document.getElementById("add-photo");
const removePhotoBtn = document.getElementById("remove-photo");
const photoError = document.getElementById("photo-error");

const newLetterBtn = document.getElementById("new-letter");
const saveStatus = document.getElementById("save-status");

// ---------- Letter data ----------
const letterState = { photo: null };

// ---------- Helpers ----------
function todayString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function showStatus(message) {
  saveStatus.textContent = message;
}

// ---------- Text style ----------
function applyStyle(name) {
  const known = Array.from(styleButtons).some((b) => b.dataset.style === name);
  const chosen = known ? name : "classic";

  notebook.dataset.style = chosen;

  styleButtons.forEach((button) => {
    const isActive = button.dataset.style === chosen;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

styleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyStyle(button.dataset.style);
    saveLetter();
  });
});

// ---------- Recipient photo ----------
const MAX_SIDE = 400;      // longest side in pixels
const JPEG_QUALITY = 0.55; // smaller = lighter link

function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };

    img.src = url;
  });
}

function setPhoto(dataUrl) {
  letterState.photo = dataUrl;
  photoLayer.style.backgroundImage = dataUrl ? `url("${dataUrl}")` : "";
  photoLayer.classList.toggle("has-photo", Boolean(dataUrl));
  removePhotoBtn.hidden = !dataUrl;
  addPhotoBtn.textContent = dataUrl ? "Change photo" : "Add recipient's photo";
}

addPhotoBtn.addEventListener("click", () => photoInput.click());

photoInput.addEventListener("change", async () => {
  const file = photoInput.files[0];
  photoError.hidden = true;
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    photoError.textContent = "Please choose an image file.";
    photoError.hidden = false;
    return;
  }

  try {
    setPhoto(await shrinkImage(file));
    saveLetter();
  } catch (error) {
    photoError.textContent = error.message;
    photoError.hidden = false;
  }

  photoInput.value = ""; // lets you pick the same file again
});

removePhotoBtn.addEventListener("click", () => {
  setPhoto(null);
  saveLetter();
});

// ---------- Save and load ----------
function getLetter() {
  return {
    date: dateInput.value,
    to: toInput.value,
    from: fromInput.value,
    body: bodyInput.value,
    style: notebook.dataset.style,
    photo: letterState.photo,
  };
}

function saveLetter() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getLetter()));
    showStatus("Saved on this device");
  } catch (error) {
    showStatus("Couldn't save: browser storage is full or blocked");
  }
}

let saveTimer;
function scheduleSave() {
  showStatus("Saving...");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveLetter, 400);
}

function loadLetter() {
  let saved = null;

  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    saved = null;
  }

  if (!saved || typeof saved !== "object") {
    dateInput.value = todayString();
    applyStyle("classic");
    setPhoto(null);
    return;
  }

  dateInput.value = saved.date || todayString();
  toInput.value = saved.to || "";
  fromInput.value = saved.from || "";
  bodyInput.value = saved.body || "";
  applyStyle(saved.style);
  setPhoto(saved.photo || null);
  showStatus("Draft restored");
}

[dateInput, toInput, fromInput, bodyInput].forEach((field) => {
  field.addEventListener("input", scheduleSave);
});

// ---------- New letter ----------
newLetterBtn.addEventListener("click", () => {
  const ok = confirm("Start a new letter? Your current draft will be cleared.");
  if (!ok) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // nothing to remove if storage is blocked
  }

  dateInput.value = todayString();
  toInput.value = "";
  fromInput.value = "";
  bodyInput.value = "";
  applyStyle("classic");
  setPhoto(null);
  showStatus("");
});

// ---------- Start ----------
loadLetter();