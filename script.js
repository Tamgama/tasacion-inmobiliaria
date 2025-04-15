document.getElementById("form1").addEventListener("submit", function (e) {
    e.preventDefault();
    const datos = new FormData(this);
    localStorage.setItem("formulario1", JSON.stringify(Object.fromEntries(datos)));
    window.location.href = "form2.html";
  });
  