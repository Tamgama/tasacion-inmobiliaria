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

  // Evitar envío si se pulsa Enter sin seleccionar dirección
  input.addEventListener("keydown", function (e) {
    const pacContainerVisible = document.querySelector(".pac-container")?.offsetParent !== null;
    if (e.key === "Enter" && !pacContainerVisible) {
      e.preventDefault();
    }
  });

  const autocomplete = new google.maps.places.Autocomplete(input, {
    types: ["address"],
    componentRestrictions: { country: "es" },
  });

  autocomplete.addListener("place_changed", () => {
    selectedPlace = autocomplete.getPlace();
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

    const url = `https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/Consulta_DNP?Provincia=MURCIA&Municipio=MURCIA&TipoVia=CALLE&NombreVia=${encodeURIComponent(nombreVia)}&PrimerNumero=${numero}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      const viviendas = data?.consulta_dnp_resultado?.lrcdnp?.rcdnp;

      if (!Array.isArray(viviendas) || viviendas.length === 0) {
        alert("No se encontraron datos para esa dirección.");
        return;
      }

      const bloques = [...new Set(viviendas.map(v => v.dt?.lcons?.blo || "Único"))];
      const plantas = [...new Set(viviendas.map(v => v.dt?.lcons?.pto || "Baja"))];
      const puertas = [...new Set(viviendas.map(v => v.dt?.lcons?.puerta).filter(Boolean))];

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

      const puertaSelector = document.getElementById("puerta");
      const plantaSelector = document.getElementById("planta");
      const bloqueSelector = document.getElementById("bloque");

      const mostrarDetalles = () => {
        const planta = plantaSelector.value;
        const puerta = puertaSelector.value;
        const bloque = bloqueSelector?.value || "Único";

        const inmueble = viviendas.find(v =>
          (v.dt?.lcons?.blo || "Único") === bloque &&
          (v.dt?.lcons?.pto || "Baja") === planta &&
          v.dt?.lcons?.puerta === puerta
        );

        if (inmueble) {
          const metros = inmueble.debi?.sfc || "N/D";
          const anio = inmueble.debi?.ant || "N/D";
          const uso = inmueble.debi?.luso || "N/D";
          const clase = inmueble.debi?.ucl || "Urbano";

          document.getElementById("detalles-inmueble").innerHTML = `
            <p><strong>Superficie:</strong> ${metros} m²</p>
            <p><strong>Año construcción:</strong> ${anio}</p>
            <p><strong>Uso:</strong> ${uso}</p>
            <p><strong>Clase:</strong> ${clase}</p>
          `;
          document.getElementById("detalles-inmueble").classList.remove("oculto");
        }
      };

      plantaSelector?.addEventListener("change", mostrarDetalles);
      puertaSelector?.addEventListener("change", mostrarDetalles);
      if (bloqueSelector) bloqueSelector.addEventListener("change", mostrarDetalles);

    } catch (error) {
      console.error("Error al consultar Catastro:", error);
      alert("Ocurrió un error al consultar el Catastro.");
    }
  });
});
