
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";

// Solo se consultarán estos dos documentos.
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

const mensajes = document.getElementById("chatMessages");
const formulario = document.getElementById("chatForm");
const entrada = document.getElementById("chatInput");

let extractor = null;
let fragmentos = [];
let inicializacion = null;
let ocupado = false;

// Divide el contenido en fragmentos más pequeños y manejables.
function dividirEnFragmentos(texto, tamanoMaximo = 850) {
    const parrafos = texto
        .replace(/\s+/g, " ")
        .split(/(?<=[.!?])\s+|(?<=;)\s+/)
        .map(p => p.trim())
        .filter(p => p.length > 35);

    const resultado = [];
    let actual = "";

    for (const parrafo of parrafos) {
        if (
            actual.length + parrafo.length > tamanoMaximo &&
            actual.length > 0
        ) {
            resultado.push(actual);
            actual = "";
        }

        actual += (actual ? " " : "") + parrafo;
    }

    if (actual.length > 0) {
        resultado.push(actual);
    }

    return resultado;
}

// Extrae el texto de cada página del PDF.
async function extraerPDF(documento) {
    const respuesta = await fetch(documento.ruta);

    if (!respuesta.ok) {
        throw new Error(
            `No se pudo abrir ${documento.nombre}. Revisa la ruta del PDF.`
        );
    }

    const datos = await respuesta.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({
        data: datos
    }).promise;

    const resultado = [];

    for (let numero = 1; numero <= pdf.numPages; numero++) {
        const pagina = await pdf.getPage(numero);
        const contenido = await pagina.getTextContent();

        const texto = contenido.items
            .map(item => item.str)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

        // Evita indexar páginas que solo contienen datos de contacto.
        const esContacto =
            /direcci[oó]n regional|central telef[oó]nica|tel[eé]fono|anexo\s+\d+/i
                .test(texto) &&
            texto.length < 1200;

        if (!texto || esContacto) {
            continue;
        }

        const partes = dividirEnFragmentos(texto);

        for (const parte of partes) {
            resultado.push({
                texto: parte,
                documento: documento.nombre,
                pagina: numero
            });
        }
    }

    return resultado;
}

// Convierte un texto en una representación numérica de su significado.
async function obtenerVector(texto) {
    const salida = await extractor(texto, {
        pooling: "mean",
        normalize: true
    });

    return salida.tolist()[0];
}

// Prepara el modelo y los documentos una sola vez por carga de página.
async function prepararChatbot() {
    if (inicializacion) {
        return inicializacion;
    }

    inicializacion = (async () => {
        mostrarMensaje(
            "Estoy preparando el buscador y leyendo los documentos. " +
            "La primera carga puede tardar un poco.",
            "bot"
        );

        extractor = await pipeline(
            "feature-extraction",
            "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
        );

        for (const documento of documentosPermitidos) {
            const partes = await extraerPDF(documento);
            fragmentos.push(...partes);
        }

        if (fragmentos.length === 0) {
            throw new Error(
                "No encontré texto en los documentos permitidos."
            );
        }

        // Calcula los vectores de los fragmentos.
        // Se procesa en grupos para evitar usar demasiada memoria.
        const tamanoLote = 8;

        for (let i = 0; i < fragmentos.length; i += tamanoLote) {
            const lote = fragmentos.slice(i, i + tamanoLote);
            const textos = lote.map(f => f.texto);

            const salida = await extractor(textos, {
                pooling: "mean",
                normalize: true
            });

            const vectores = salida.tolist();

            lote.forEach((fragmento, indice) => {
                fragmento.vector = vectores[indice];
            });
        }
    })();

    try {
        await inicializacion;
    } catch (error) {
        inicializacion = null;
        throw error;
    }
}

// Como los vectores están normalizados, su producto punto
// permite estimar la similitud entre pregunta y fragmento.
function calcularSimilitud(vectorA, vectorB) {
    let suma = 0;

    for (let i = 0; i < vectorA.length; i++) {
        suma += vectorA[i] * vectorB[i];
    }

    return suma;
}

async function buscarFragmentos(pregunta) {
    await prepararChatbot();

    const vectorPregunta = await obtenerVector(pregunta);

    return fragmentos
        .map(fragmento => ({
            ...fragmento,
            puntuacion: calcularSimilitud(
                vectorPregunta,
                fragmento.vector
            )
        }))
        .sort((a, b) => b.puntuacion - a.puntuacion)
        .slice(0, 3);
}

// Muestra los mensajes de forma segura, sin interpretar HTML del PDF.
function mostrarMensaje(texto, tipo) {
    const burbuja = document.createElement("div");
    burbuja.className = tipo === "usuario"
        ? "mensaje usuario"
        : "mensaje bot";

    burbuja.textContent = texto;
    mensajes.appendChild(burbuja);
    mensajes.scrollTop = mensajes.scrollHeight;
}

function mostrarResultados(resultados) {
    const contenedor = document.createElement("div");
    contenedor.className = "mensaje bot";

    const titulo = document.createElement("p");
    titulo.textContent = "Encontré estos fragmentos relacionados:";
    contenedor.appendChild(titulo);

    // Umbral inicial conservador: evita mostrar coincidencias muy débiles.
    const relevantes = resultados.filter(r => r.puntuacion >= 0.20);

    if (relevantes.length === 0) {
        const aviso = document.createElement("p");
        aviso.textContent =
            "No encontré un fragmento suficientemente relacionado " +
            "en los documentos permitidos. Prueba formulando la pregunta " +
            "de otra manera.";
        contenedor.appendChild(aviso);
    } else {
        for (const resultado of relevantes) {
            const bloque = document.createElement("div");
            bloque.className = "resultado-documento";

            const texto = document.createElement("p");
            texto.textContent = resultado.texto;

            const fuente = document.createElement("small");
            fuente.textContent =
                `Fuente: ${resultado.documento}, página ${resultado.pagina}`;

            bloque.appendChild(texto);
            bloque.appendChild(fuente);
            contenedor.appendChild(bloque);
        }
    }

    mensajes.appendChild(contenedor);
    mensajes.scrollTop = mensajes.scrollHeight;
}

async function enviarPregunta(evento) {
    if (evento) {
        evento.preventDefault();
    }

    if (ocupado) return;

    const pregunta = entrada.value.trim();
    if (!pregunta) return;

    entrada.value = "";
    mostrarMensaje(pregunta, "usuario");

    ocupado = true;

    try {
        const resultados = await buscarFragmentos(pregunta);
        mostrarResultados(resultados);
    } catch (error) {
        console.error("Error del chatbot:", error);

        mostrarMensaje(
            "No pude consultar los documentos. Comprueba tu conexión, " +
            "las rutas de los PDF y la consola del navegador para ver el error.",
            "bot"
        );
    } finally {
        ocupado = false;
    }
}

// Estas funciones quedan disponibles para los botones existentes del HTML.
window.enviarPregunta = enviarPregunta;

window.preguntaRapida = function (pregunta) {
    entrada.value = pregunta;
    enviarPregunta();
};

if (formulario) {
    formulario.addEventListener("submit", enviarPregunta);
}
