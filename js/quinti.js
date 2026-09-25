document.addEventListener("click", function (event) {
  const elemento = event.target.closest("a, button");

  if (!elemento) return;

  const nombre =
    elemento.getAttribute("aria-label") ||
    elemento.getAttribute("title") ||
    elemento.innerText.trim();

  if (!nombre) return;

  const mensaje = new SpeechSynthesisUtterance(nombre);
  mensaje.lang = "es-PE";

  // Si es un enlace que lleva a otra página
  if (
    elemento.tagName === "A" &&
    elemento.getAttribute("href") &&
    elemento.getAttribute("href") !== "#"
  ) {
    event.preventDefault();

    const destino = elemento.href;

    speechSynthesis.cancel();

    mensaje.onend = function () {
      window.location.href = destino;
    };

    speechSynthesis.speak(mensaje);
  } else {
    speechSynthesis.cancel();
    speechSynthesis.speak(mensaje);
  }
});