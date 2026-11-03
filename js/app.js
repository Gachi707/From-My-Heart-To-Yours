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

const readingBanner = document.getElementById("reading-banner");
const writeOwnBtn = document.getElementById("write-own");

const includePhotoBox = document.getElementById("share-include-photo");
const createLinkBtn = document.getElementById("create-link");
const shareResult = document.getElementById("share-result");
const shareLink = document.getElementById("share-link");
const copyLinkBtn = document.getElementById("copy-link");
const shareNote = document.getElementById("share-note");

// ---------- Letter data ----------
const letterState = { photo: null };
let readingMode = false; // true when opening someone else's letter

// ---------- Helpers ----------
function todayString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function showStatus(message) {
  saveStatus.textContent = message;
}

function clearShare() {
  shareResult.hidden = true;
  shareNote.textContent = "";
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
const MAX_SIDE = 400;        // photo size while writing
const JPEG_QUALITY = 0.55;
const SHARE_MAX_SIDE = 320;  // smaller copy used inside share links
const SHARE_QUALITY = 0.5;

function imageToJpeg(img, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(imageToJpeg(img, MAX_SIDE, JPEG_QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };

    img.src = url;
  });
}

function shrinkDataUrl(dataUrl, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(imageToJpeg(img, maxSide, quality));
    img.onerror = () => reject(new Error("Could not prepare the photo."));
    img.src = dataUrl;
  });
}

function setPhoto(dataUrl) {
  letterState.photo = dataUrl;
  photoLayer.style.backgroundImage = dataUrl ? `url("${dataUrl}")` : "";
  photoLayer.classList.toggle("has-photo", Boolean(dataUrl));
  removePhotoBtn.hidden = !dataUrl;
  addPhotoBtn.textContent = dataUrl ? "Change photo" : "Add recipient's photo";
  includePhotoBox.disabled = !dataUrl;
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

// ---------- Save and load (your own draft) ----------
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
  if (readingMode) return; // never overwrite your own draft while reading
  clearShare();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getLetter()));
    showStatus("Saved on this device");
  } catch (error) {
    showStatus("Couldn't save: browser storage is full or blocked");
  }
}

let saveTimer;
function scheduleSave() {
  if (readingMode) return;
  clearShare();
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
  clearShare();
  showStatus("");
});

// ---------- Share link: encoding ----------
function bytesToBase64Url(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(text) {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function gzip(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function buildShareLink(includePhoto) {
  const data = {
    v: 1,
    d: dateInput.value,
    t: toInput.value,
    f: fromInput.value,
    b: bodyInput.value,
    s: notebook.dataset.style,
  };

  if (includePhoto && letterState.photo) {
    data.p = await shrinkDataUrl(letterState.photo, SHARE_MAX_SIDE, SHARE_QUALITY);
  }

  const raw = new TextEncoder().encode(JSON.stringify(data));
  let prefix = "p"; // p = plain, z = compressed
  let bytes = raw;

  if (typeof CompressionStream === "function") {
    try {
      bytes = await gzip(raw);
      prefix = "z";
    } catch (error) {
      bytes = raw;
      prefix = "p";
    }
  }

  const base = location.href.split("#")[0];
  return `${base}#l=${prefix}${bytesToBase64Url(bytes)}`;
}

createLinkBtn.addEventListener("click", async () => {
  if (!bodyInput.value.trim()) {
    shareNote.textContent = "Write something in your letter first.";
    return;
  }

  shareNote.textContent = "Building your link...";

  try {
    const withPhoto = includePhotoBox.checked && Boolean(letterState.photo);
    const link = await buildShareLink(withPhoto);

    shareLink.value = link;
    shareResult.hidden = false;
    shareLink.select();

    let note = `Link ready (${link.length.toLocaleString()} characters).`;
    if (link.length > 8000) {
      note += " It's long, and some chat apps may cut it off. If that happens, untick the photo.";
    }
    shareNote.textContent = note;
  } catch (error) {
    shareNote.textContent = "Couldn't build the link. Please try again.";
  }
});

copyLinkBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareLink.value);
    shareNote.textContent = "Link copied.";
  } catch (error) {
    shareLink.select();
    shareNote.textContent = "Press Ctrl+C to copy the selected link.";
  }
});

// ---------- Share link: opening ----------
// Anything inside a link is untrusted, so every value is checked.
function cleanText(value, max) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function cleanPhoto(value) {
  const ok =
    typeof value === "string" &&
    value.length < 300000 &&
    /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value);
  return ok ? value : null;
}

async function openSharedLetter(encoded) {
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return false;

    const kind = encoded.charAt(0);
    const bytes = base64UrlToBytes(encoded.slice(1));
    let raw;

    if (kind === "z") raw = await gunzip(bytes);
    else if (kind === "p") raw = bytes;
    else return false;

    const data = JSON.parse(new TextDecoder().decode(raw));
    if (!data || typeof data !== "object" || data.v !== 1) return false;

    readingMode = true;
    document.body.classList.add("reading");
    readingBanner.hidden = false;
    document.title = "A letter for you";

    dateInput.value = /^\d{4}-\d{2}-\d{2}$/.test(data.d) ? data.d : "";
    toInput.value = cleanText(data.t, 60);
    fromInput.value = cleanText(data.f, 60);
    bodyInput.value = cleanText(data.b, 20000);
    applyStyle(data.s);
    setPhoto(cleanPhoto(data.p));

    [dateInput, toInput, fromInput, bodyInput].forEach((field) => {
      field.readOnly = true;
    });

      autosizeBody();
    return true;
  } catch (error) {
    return false;
  }
}

writeOwnBtn.addEventListener("click", () => {
  history.replaceState(null, "", location.pathname + location.search);
  location.reload();
});

window.addEventListener("hashchange", () => location.reload());
// ---------- Printing and tall letters ----------
function autosizeBody() {
  bodyInput.style.height = "auto";
  bodyInput.style.height = bodyInput.scrollHeight + "px";
}

// A text box can't print past its own height, so grow it first
window.addEventListener("beforeprint", autosizeBody);
window.addEventListener("afterprint", () => {
  if (!readingMode) bodyInput.style.height = "";
});

// Re-measure when fonts finish loading or the window changes size
if (document.fonts) {
  document.fonts.ready.then(() => {
    if (readingMode) autosizeBody();
  });
}
window.addEventListener("resize", () => {
  if (readingMode) autosizeBody();
});

document.querySelectorAll("[data-print]").forEach((button) => {
  button.addEventListener("click", () => window.print());
});

// ---------- Write a reply ----------
const replyBtn = document.getElementById("reply-btn");

replyBtn.addEventListener("click", () => {
  let existing = null;
  try {
    existing = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    existing = null;
  }

  const hasDraft = existing && typeof existing.body === "string" && existing.body.trim();
  if (hasDraft && !confirm("Writing a reply will replace the draft saved on this device. Continue?")) {
    return;
  }

  const reply = {
    date: todayString(),
    to: fromInput.value,   // the sender becomes the recipient
    from: toInput.value,   // and the recipient becomes the sender
    body: "",
    style: notebook.dataset.style,
    photo: null,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reply));
  } catch (error) {
    // if storage is blocked, the reply simply opens blank
  }

  history.replaceState(null, "", location.pathname + location.search);
  location.reload();
});

// ---------- Start ----------
async function start() {
  const hash = location.hash;
  let linkFailed = false;

  if (hash.startsWith("#l=")) {
    const opened = await openSharedLetter(hash.slice(3));
    if (opened) return;
    linkFailed = true;
  }

  loadLetter();
  if (linkFailed) showStatus("That share link couldn't be opened. It may be damaged or cut off.");
}

start();