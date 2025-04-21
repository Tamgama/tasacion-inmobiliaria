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

  // Autocompletado Google
  const autocomplete = new google.maps.places.Autocomplete(input, {
    types: ["address"],
    componentRestrictions: { country: "es" },
  });

  autocomplete.addListener("place_changed", () => {
    selectedPlace = autocomplete.getPlace();
    if (selectedPlace?.formatted_address) {
      localStorage.setItem("direccion_completa", selectedPlace.formatted_address);
    }
  });

  input.addEventListener("keydown", function (e) {
    const pacVisible = document.querySelector(".pac-container")?.offsetParent !== null;
    if (e.key === "Enter" && !pacVisible) {
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
      if (comp.types.includes("route")) nombreVia = comp.long_name;
      if (comp.types.includes("street_number")) numero = comp.long_name;
    }

    if (!nombreVia || !numero) {
      alert("No se pudo extraer correctamente la calle o número.");
      return;
    }

    const refUrl = `https://valoratucasa.promurcia.com/api/catastro-refcat.php?nombreVia=${encodeURIComponent(nombreVia)}&numero=${numero}`;

    try {
      const refRes = await fetch(refUrl);
      const refs = await refRes.json();

      if (!Array.isArray(refs) || refs.length === 0 || !refs[0]?.refcat) {
        alert("No se encontraron datos para esa dirección.");
        return;
      }

      const refcat = refs[0].refcat;
      const detalleUrl = `https://valoratucasa.promurcia.com/api/detalle-catastro.php?refcat=${refcat}`;
      const detalleRes = await fetch(detalleUrl);
      const viviendas = await detalleRes.json();

      if (!Array.isArray(viviendas) || viviendas.length === 0) {
        alert("No se encontraron detalles del inmueble.");
        return;
      }

      const bloques = [...new Set(viviendas.map(v => v.bloque || "Único"))];
      const plantas = [...new Set(viviendas.map(v => v.planta || "Baja"))];
      const puertas = [...new Set(viviendas.map(v => v.puerta).filter(Boolean))];

      const selectsHTML = `
        ${bloques.length > 1 ? `
          <label>Bloque:
            <select id="bloque">${bloques.map(b => `<option>${b}</option>`).join("")}</select>
          </label>` : ""}
        <label>Planta:
          <select id="planta">${plantas.map(p => `<option>${p}</option>`).join("")}</select>
        </label>
        <label>Puerta:
          <select id="puerta">${puertas.map(p => `<option>${p}</option>`).join("")}</select>
        </label>
      `;

      document.getElementById("selectores-dinamicos").innerHTML = selectsHTML;
      document.getElementById("formulario-segundo").classList.remove("oculto");

      const mostrarDetalles = () => {
        const bloque = document.getElementById("bloque")?.value || "Único";
        const planta = document.getElementById("planta")?.value || "Baja";
        const puerta = document.getElementById("puerta")?.value;

        const inmueble = viviendas.find(v =>
          (v.bloque || "Único") === bloque &&
          (v.planta || "Baja") === planta &&
          v.puerta === puerta
        );

        const contenedor = document.getElementById("detalles-inmueble");

        if (!inmueble) {
          contenedor.innerHTML = "<p>No se encontraron datos para esa unidad</p>";
          return;
        }

        contenedor.innerHTML = `
          <p><strong>Superficie:</strong> ${inmueble.superficie || "N/D"} m²</p>
          <p><strong>Año construcción:</strong> ${inmueble.anio || "N/D"}</p>
          <p><strong>Uso:</strong> ${inmueble.uso || "N/D"}</p>
          <p><strong>Clase:</strong> ${inmueble.clase || "Urbano"}</p>
        `;
        contenedor.classList.remove("oculto");
      };

      document.getElementById("planta")?.addEventListener("change", mostrarDetalles);
      document.getElementById("puerta")?.addEventListener("change", mostrarDetalles);
      document.getElementById("bloque")?.addEventListener("change", mostrarDetalles);

      mostrarDetalles(); // Mostrar la primera opción por defecto
    } catch (error) {
      console.error("Error al consultar Catastro:", error);
      alert("Ocurrió un error al consultar el Catastro.");
    }
  });
});
