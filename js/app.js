// Default the letter's date to today (in the user's local time)
const dateInput = document.getElementById("letter-date");

if (dateInput && !dateInput.value) {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  dateInput.value = local.toISOString().slice(0, 10);
}