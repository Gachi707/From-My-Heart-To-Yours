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