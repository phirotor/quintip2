const contenedor = document.getElementById("lista-pdfs");

pdfs.forEach(pdf => {

  const a = document.createElement("a");

  a.href = "../../../../pdf/" + pdf;
  a.target = "_blank";

  a.className = "d-flex align-items-center gap-2 text-decoration-none";

  const icono = document.createElement("i");
  icono.className = "bi bi-file-earmark-pdf text-danger";

  const texto = document.createElement("span");
  texto.textContent = pdf.replace(".pdf","");

  a.appendChild(icono);
  a.appendChild(texto);

  contenedor.appendChild(a);

});