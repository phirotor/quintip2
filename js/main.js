console.log("main.js cargado");
document.querySelectorAll('.has-children').forEach(item => {
  item.addEventListener('click', function(e){

    // Evita que el link interno interfiera
    if(e.target.tagName === 'A') return;

    if(window.innerWidth < 768){
      const children = this.nextElementSibling;

      if (!children) return;

      children.classList.toggle('collapsed');
    }

  });
});

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

fetch("/quintip2/components/header.html")
  .then(res => res.text())
  .then(data => {
    document.getElementById("header").innerHTML = data;
  })
  .catch(error => console.error("Error cargando header:", error));

  function goBack() {
  if (document.referrer) {
    history.back();
  } else {
    window.location.href = "/quintip2/";
  }
}
