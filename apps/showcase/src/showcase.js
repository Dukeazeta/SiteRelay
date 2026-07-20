const toggle = document.querySelector("#state-toggle");
const card = document.querySelector("[data-capture-target='signal-card']");

toggle?.addEventListener("click", () => {
  const active = toggle.getAttribute("aria-pressed") !== "true";
  toggle.setAttribute("aria-pressed", String(active));
  toggle.textContent = active ? "Return to default state" : "Activate hover state";
  card?.classList.toggle("is-active", active);
});
