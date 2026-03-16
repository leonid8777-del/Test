const feedButton = document.getElementById("feedButton");
const panda = document.getElementById("panda");
const food = document.getElementById("food");
const statusText = document.getElementById("status");
const counterText = document.getElementById("counter");

let snacks = 0;

const pandaFaces = ["🐼", "😋", "🤤"];

function randomFace() {
  return pandaFaces[Math.floor(Math.random() * pandaFaces.length)];
}

function feedPanda() {
  snacks += 1;

  food.classList.remove("fly");
  void food.offsetWidth;
  food.classList.add("fly");

  panda.classList.add("eating");
  panda.textContent = randomFace();

  statusText.textContent = `Lecker! Der Panda hat gerade Snack Nummer ${snacks} gegessen.`;
  counterText.textContent = `Snacks gegessen: ${snacks}`;

  window.setTimeout(() => {
    panda.classList.remove("eating");
    panda.textContent = "🐼";
  }, 450);
}

feedButton.addEventListener("click", feedPanda);
