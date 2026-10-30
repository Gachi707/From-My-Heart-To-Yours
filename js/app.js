// Default the letter's date to today (in the user's local time)
const dateInput = document.getElementById("letter-date");

if (dateInput && !dateInput.value) {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  dateInput.value = local.toISOString().slice(0, 10);
}
// ---------- Text style picker ----------
const notebook = document.querySelector(".notebook");
const styleButtons = document.querySelectorAll(".style-btn");

styleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    notebook.dataset.style = button.dataset.style;

    styleButtons.forEach((other) => {
      const isActive = other === button;
      other.classList.toggle("is-active", isActive);
      other.setAttribute("aria-pressed", String(isActive));
    });
  });
});
// ---------- Recipient photo ----------
const photoLayer = document.getElementById("photo-layer");
const photoInput = document.getElementById("photo-input");
const addPhotoBtn = document.getElementById("add-photo");
const removePhotoBtn = document.getElementById("remove-photo");
const photoError = document.getElementById("photo-error");

const MAX_SIDE = 400;      // longest side in pixels
const JPEG_QUALITY = 0.55; // smaller = lighter link

// Holds the letter's data; later steps will save and share from here
const letterState = { photo: null };

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
  } catch (error) {
    photoError.textContent = error.message;
    photoError.hidden = false;
  }

  photoInput.value = ""; // lets you pick the same file again
});

removePhotoBtn.addEventListener("click", () => setPhoto(null));