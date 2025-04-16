window.addEventListener("DOMContentLoaded", () => {
    const btnPerfil = document.getElementById("btn-perfil");
    const menuPerfil = document.getElementById("menu-perfil");
    const editarPerfilBtn = document.getElementById("editar-perfil");
    const seccionPrincipal = document.querySelector(".bloque-principal");
    const seccionEditar = document.getElementById("seccion-editar");
    const formEditarPerfil = document.getElementById("form-editar-perfil");
    const mensajeExito = document.getElementById("mensaje-exito");
  
    if (btnPerfil && menuPerfil) {
      btnPerfil.addEventListener("click", () => {
        menuPerfil.classList.toggle("oculto");
      });
  
      document.addEventListener("click", (e) => {
        if (!btnPerfil.contains(e.target) && !menuPerfil.contains(e.target)) {
          menuPerfil.classList.add("oculto");
        }
      });
    }
  
    if (editarPerfilBtn && seccionPrincipal && seccionEditar) {
      editarPerfilBtn.addEventListener("click", (e) => {
        e.preventDefault();
        seccionPrincipal.classList.add("oculto");
        seccionEditar.classList.remove("oculto");
        menuPerfil?.classList.add("oculto");
      });
    }
  
    if (formEditarPerfil && mensajeExito && seccionPrincipal && seccionEditar) {
      formEditarPerfil.addEventListener("submit", (e) => {
        e.preventDefault();
        mensajeExito.classList.remove("oculto");
  
        setTimeout(() => {
          mensajeExito.classList.add("oculto");
          seccionEditar.classList.add("oculto");
          seccionPrincipal.classList.remove("oculto");
        }, 2000);
      });
    }
  });
  