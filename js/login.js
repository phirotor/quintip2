// js/login.js
// ---------------------------------------------
// UN SOLO SCREEN: Qinti vuela y se posa en el MAPA
// ---------------------------------------------


// ✅ Punto donde quieres que se pose (zona amarilla)
// Ajusta estos 2 valores fino:
const LAND_POS = { x: 22, y: 48 }; // % dentro del map-stage

function moveQinti(x, y) {
  if (!qintiFly) return;
  qintiFly.style.left = x + "%";
  qintiFly.style.top = y + "%";
  qintiFly.style.opacity = "1";
}

// Animación de entrada + aterrizaje


// Audio Perú
const soundPeru = document.getElementById("canto");

// Click en países
document.querySelectorAll(".country").forEach((country) => {
  country.addEventListener("click", () => {
    const selected = country.dataset.country;

    // Guardar país
    localStorage.setItem("pais", selected);

    // Sonido si es Perú
    if (selected === "peru" && soundPeru) {
      soundPeru.currentTime = 0;
      soundPeru.play().catch(() => {});
    }

    // Si aún quieres redirigir:
    const intro = document.getElementById("intro-screen");
    if (intro) intro.classList.add("exit");

    setTimeout(() => {
      window.location.href = "../html/index.html";
    }, 800);
  });
});
function runLandingIntro() {
  const logo = document.getElementById("logo-ca");
  const wrap = document.getElementById("qinti-splash");

  if (!logo || !wrap) return Promise.resolve();

  return new Promise((r) => requestAnimationFrame(r)).then(() => {
    const rect = logo.getBoundingClientRect();

    // ✅ Ajustes RESPONSIVE (sin pixeles fijos)
    const targetX = rect.left + rect.width * 0.58; // más a la derecha: 0.62, 0.66...
    const targetY = rect.top + rect.height * 0.10; // más arriba: 0.05, 0.02...

    const midX = rect.left + rect.width * 0.25;
    const midY = rect.top - rect.height * 0.25;

    // inicio
    wrap.style.left = `-120px`;
    wrap.style.top = `60vh`;
    wrap.classList.remove("landed");

    const fly = wrap.animate(
      [
        { left: `-120px`, top: `60vh`, transform: "translateY(0px)" },
        { left: `${midX}px`, top: `${midY}px`, transform: "translateY(0px)" },
        { left: `${targetX}px`, top: `${targetY}px`, transform: "translateY(0px)" }
      ],
      {
        duration: 1000,
        easing: "cubic-bezier(0.22, 0.9, 0.18, 1)",
        fill: "forwards",
      }
    );

    return fly.finished.then(() => {
      wrap.classList.add("landed");

      // ✅ Bounce SIN tocar el transform del bird (evita teleport)
      return wrap.animate(
        [
          { transform: "translateY(0px)" },
          { transform: "translateY(-8px)" },
          { transform: "translateY(0px)" }
        ],
        { duration: 420, easing: "ease-out", fill: "forwards" }
      ).finished;
    });
  });
}


window.addEventListener("load", async () => {
  await runLandingIntro();
});

// ===== SFX hover países (LOGIN) =====
(() => {
  const sfx = document.getElementById("qinti-hover-sfx");
  if (!sfx) {
    console.warn("No existe #qinti-hover-sfx en el HTML");
    return;
  }

  const shapes = document.querySelectorAll(".country-shape");
  console.log("country-shape encontrados:", shapes.length);

  let unlocked = false;
  let lastPlay = 0;
  const COOLDOWN_MS = 700;

  const unlock = async () => {
    if (unlocked) return;
    try {
      // esto SOLO funciona si viene de click/tap/tecla
      await sfx.play();
      sfx.pause();
      sfx.currentTime = 0;
      unlocked = true;
      console.log("✅ Audio desbloqueado");
    } catch (e) {
      console.warn("🔒 Audio aún bloqueado (haz click en la pantalla)", e);
    }
  };

  // Desbloquea con una interacción real (mejor en el stage del login)
  const stage = document.querySelector(".map-stage") || document.body;
  stage.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });

  const tryPlay = async () => {
    if (!unlocked) return; // si no hubo click, no intentes (el navegador lo bloqueará)
    const now = Date.now();
    if (now - lastPlay < COOLDOWN_MS) return;
    lastPlay = now;

    try {
      sfx.currentTime = 0;
      await sfx.play();
    } catch (e) {
      console.warn("No se pudo reproducir en hover:", e);
    }
  };

  shapes.forEach(el => el.addEventListener("pointerenter", tryPlay));
})();