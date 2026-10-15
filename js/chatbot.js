
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");

// Configuración de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// Lista explícita de documentos autorizados
const documentosPermitidos = [
  {
    nombre: "Folleto: Marca, producto y servicio",
    ruta: "../documentos/Folleto_Marca_Producto_Servicio.pdf"
  },
  {
    nombre: "Registrar una marca",
    ruta: "../documentos/Registrar_una_marca.pdf"
  }
];

let paginasIndexadas = [];
let documentosListos = false;

// Palabras demasiado comunes para mejorar la búsqueda
const palabrasIgnoradas = new Set([
  "que", "como", "cual", "cuales", "cuando", "donde",
  "una", "uno", "unos", "unas", "para", "por", "con",
  "sin", "del", "las", "los", "una", "es", "son",
  "de", "la", "el", "y", "o", "en", "un", "se",
  "al", "mi", "me", "sobre", "puede", "pueden"
]);

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function obtenerTerminos(texto) {
  return normalizar(texto)
    .split(" ")
    .filter(palabra =>
      palabra.length > 2 &&
      !palabrasIgnoradas.has(palabra)
    );
}

// Mostrar texto de forma segura, sin interpretar HTML
function agregarMensaje(texto, tipo) {
  const mensaje = document.createElement("div");
  mensaje.classList.add("chat-message", tipo);

  if (tipo === "bot") {
    const nombre = document.createElement("strong");
    nombre.textContent = "Q´inti:";
    mensaje.appendChild(nombre);
    mensaje.appendChild(document.createElement("br"));
    mensaje.appendChild(document.createTextNode(texto));
  } else {
    mensaje.textContent = texto;
  }

  chatMessages.appendChild(mensaje);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Cargar y leer un PDF página por página
async function cargarPDF(documento) {
  const pdf = await pdfjsLib
    .getDocument(documento.ruta)
    .promise;

  for (let numero = 1; numero <= pdf.numPages; numero++) {
    const pagina = await pdf.getPage(numero);
    const contenido = await pagina.getTextContent();

    const texto = contenido.items
      .map(item => item.str || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (texto) {
      paginasIndexadas.push({
        documento: documento.nombre,
        ruta: documento.ruta,
        pagina: numero,
        texto: texto,
        textoNormalizado: normalizar(texto)
      });
    }
  }
}

// Preparar el índice una sola vez por carga de la página
async function prepararDocumentos() {
  if (!window.pdfjsLib) {
    throw new Error("No se pudo cargar PDF.js.");
  }

  const resultados = await Promise.allSettled(
    documentosPermitidos.map(cargarPDF)
  );

  const fallidos = resultados.filter(
    resultado => resultado.status === "rejected"
  );

  documentosListos = true;

  if (fallidos.length > 0) {
    console.error("Algunos PDF no pudieron cargarse:", fallidos);
  }

  const cargados = resultados.length - fallidos.length;

  if (cargados === 0) {
    agregarMensaje(
      "No pude cargar los documentos. Comprueba las rutas y abre Q´inti desde un servidor web.",
      "bot"
    );
  } else {
    agregarMensaje(
      `Ya puedes preguntarme. He preparado ${paginasIndexadas.length} páginas de texto de los documentos disponibles.`,
      "bot"
    );
  }
}

// Puntuar cada página según los términos de la pregunta
function buscarEnDocumentos(pregunta) {
  const terminos = [...new Set(obtenerTerminos(pregunta))];

  if (terminos.length === 0) return [];

  return paginasIndexadas
    .map(pagina => {
      let puntuacion = 0;

      for (const termino of terminos) {
        if (pagina.textoNormalizado.includes(termino)) {
          puntuacion++;
        }
      }

      // Priorizar páginas que contengan más términos consultados
      const cobertura = puntuacion / terminos.length;

      return { ...pagina, puntuacion, cobertura };
    })
    .filter(resultado => resultado.puntuacion > 0)
    .sort((a, b) =>
      b.cobertura - a.cobertura ||
      b.puntuacion - a.puntuacion
    )
    .slice(0, 3);
}

// Mostrar resultados con enlaces a la página original del PDF
function mostrarResultados(resultados, pregunta) {
  const mensaje = document.createElement("div");
  mensaje.classList.add("chat-message", "bot");

  const titulo = document.createElement("strong");
  titulo.textContent = "Q´inti:";
  mensaje.appendChild(titulo);
  mensaje.appendChild(document.createElement("br"));
  mensaje.appendChild(document.createTextNode(
    "Encontré estos fragmentos en los documentos autorizados:"
  ));

  for (const resultado of resultados) {
    const bloque = document.createElement("p");
    bloque.classList.add("mt-3", "mb-2");

    const fuente = document.createElement("strong");
    fuente.textContent =
      `${resultado.documento} — página ${resultado.pagina}`;

    const fragmento = document.createElement("div");
    const texto = resultado.texto;
  const terminos = obtenerTerminos(pregunta);
    let posicion = -1;

    for (const termino of terminos) {
      posicion = normalizar(texto).indexOf(termino);
      if (posicion >= 0) break;
    }

    // Mostrar un fragmento de la página
    const inicio = Math.max(0, (posicion < 0 ? 0 : posicion) - 180);
    const fragmentoTexto = texto.slice(inicio, inicio + 650);

    fragmento.textContent =
      (inicio > 0 ? "… " : "") +
      fragmentoTexto +
      (inicio + 650 < texto.length ? " …" : "");

    const enlace = document.createElement("a");
    enlace.href = resultado.ruta;
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    enlace.textContent = "Abrir PDF";
    enlace.classList.add("d-inline-block", "mt-1");

    bloque.appendChild(fuente);
    bloque.appendChild(fragmento);
    bloque.appendChild(enlace);
    mensaje.appendChild(bloque);
  }

  chatMessages.appendChild(mensaje);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function enviarPregunta(pregunta) {
  pregunta = pregunta.trim();
  if (!pregunta) return;

  agregarMensaje(pregunta, "user");
  chatInput.value = "";

  if (!documentosListos) {
    agregarMensaje(
      "Todavía estoy preparando los documentos. Espera un momento y vuelve a intentarlo.",
      "bot"
    );
    return;
  }

  const resultados = buscarEnDocumentos(pregunta);

  if (resultados.length === 0) {
    agregarMensaje(
      "No encontré coincidencias en los PDF autorizados. Prueba con otros términos o consulta los documentos originales.",
      "bot"
    );
    return;
  }

mostrarResultados(resultados, pregunta);
}

chatForm.addEventListener("submit", event => {
  event.preventDefault();
  enviarPregunta(chatInput.value);
});

// Mantener funcionando los botones de preguntas rápidas
function preguntaRapida(pregunta) {
  enviarPregunta(pregunta);
}

window.preguntaRapida = preguntaRapida;

// Iniciar la lectura de documentos
prepararDocumentos().catch(error => {
  console.error("Error al preparar los PDF:", error);
  documentosListos = true;
  agregarMensaje(
    "Ocurrió un error al leer los PDF. Revisa la consola del navegador para ver el detalle.",
    "bot"
  );
});
