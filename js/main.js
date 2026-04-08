document.querySelectorAll('.has-children').forEach(item => {
  item.addEventListener('click', function(e){

    if(window.innerWidth < 768){
      const children = this.nextElementSibling;

      children.classList.toggle('open');
      children.classList.toggle('collapsed');
    }

  });
});