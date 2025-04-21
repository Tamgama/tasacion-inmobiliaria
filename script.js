let selectedPlace = null;

function abrirDashboard() {
  window.location.href = "dashboard.html";
}

window.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("direccion");
  const form = document.getElementById("form-direccion");

  if (!input || !form) {
    console.warn("👉 Este script no es para esta página. Saltando lógica de dirección.");
    return;
  }

  const autocomplete = new google.maps.places.Autocomplete(input, {
    types: ["address"],
    componentRestrictions: { country: "es" },
  });

  autocomplete.addListener("place_changed", () => {
    selectedPlace = autocomplete.getPlace();

    if (selectedPlace?.formatted_address) {
      localStorage.setItem("direccion_completa", selectedPlace.formatted_address);
    }

    const catastroURL = `https://www1.sedecatastro.gob.es/OVCFrames.aspx?TIPO=CONSULTA`;
    window.open(catastroURL, "_blank");
  });

  input.addEventListener("keydown", function (e) {
    const pacContainerVisible = document.querySelector(".pac-container")?.offsetParent !== null;
    if (e.key === "Enter" && !pacContainerVisible) {
      e.preventDefault();
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!selectedPlace || !selectedPlace.address_components) {
      alert("Selecciona una dirección del listado desplegable.");
      return;
    }

    const componentes = selectedPlace.address_components;
    let nombreVia = "", numero = "";
    for (let comp of componentes) {
      if (comp.types.includes("route")) nombreVia = comp.long_name.toUpperCase();
      if (comp.types.includes("street_number")) numero = comp.long_name;
    }

    if (!nombreVia || !numero) {
      alert("No se pudo extraer correctamente la calle o número.");
      return;
    }

    const url = `https://valoratucasa.promurcia.com/api/catastro-refcat.php?nombreVia=${encodeURIComponent(nombreVia)}&numero=${numero}`;

    try {
      const res = await fetch(url);
      const refs = await res.json();

      if (!Array.isArray(refs) || refs.length === 0) {
        alert("No se encontraron datos para esa dirección.");
        return;
      }

      const refcat = refs[0].refcat;
      const detalleRes = await fetch(`https://valoratucasa.promurcia.com/api/detalle-catastro.php?refcat=${refcat}`);
      const inmueble = await detalleRes.json();

      const metros = inmueble.superficieConstruida || "N/D";
      const anio = inmueble.anoConstruccion || "N/D";
      const uso = inmueble.usoPrincipal || "N/D";
      const clase = inmueble.claseUrbano || "Urbano";

      document.getElementById("selectores-dinamicos").innerHTML = "";
      document.getElementById("formulario-segundo").classList.remove("oculto");
      document.getElementById("detalles-inmueble").innerHTML = `
        <p><strong>Superficie:</strong> ${metros} m²</p>
        <p><strong>Año construcción:</strong> ${anio}</p>
        <p><strong>Uso:</strong> ${uso}</p>
        <p><strong>Clase:</strong> ${clase}</p>
      `;
      document.getElementById("detalles-inmueble").classList.remove("oculto");
    } catch (error) {
      console.error("Error al consultar Catastro:", error);
      alert("Ocurrió un error al consultar el Catastro.");
    }
  });
});
