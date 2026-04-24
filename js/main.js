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

fetch("/quintip2/components/header.html")
  .then(res => res.text())
  .then(data => {
    document.getElementById("header").innerHTML = data;
  })
  .catch(error => console.error("Error cargando header:", error));