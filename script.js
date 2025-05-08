document.addEventListener('DOMContentLoaded', function () {
  let calles = [];
  let viaSeleccionada = null;
  let detallesInmueble = null;

  const inputDireccion = document.getElementById('calle');
  const inputNumero = document.getElementById('numero');
  const resultados = document.getElementById('resultados-catastro');
  const bloquePlantaPuertaDiv = document.getElementById('bloque-planta-puerta');
  const btnConsultar = document.getElementById('consultar-principal');
  btnConsultar.disabled = true;  


  Papa.parse("callejero.csv", {
    download: true,
    header: true,
    complete: function (results) {
      console.log("CSV cargado:", results.data); 
      calles = results.data.map(fila => {
        const via = fila.NombreVia || fila.nombrevia || fila.via || '';
        const codigo = fila.codigo || fila.codigo || '';
        return {
          via,
          codigo,
          normalizada: normalizarTexto(via)
        };
      });
      
    }
  });

  inputDireccion.addEventListener('input', function () {
    const valor = normalizarTexto(this.value.trim());
    resultados.innerHTML = '';

    if (valor.length > 1 && calles.length > 0) {
      const palabras = valor.split(" ");

      const sugerencias = calles.filter(calle => {
        const via = calle.normalizada;
        return palabras.every(palabra => via.includes(palabra));
      }).slice(0, 5);
  
      // console.log("Sugerencias encontradas:", sugerencias); 

      sugerencias.forEach(sug => {
        const item = document.createElement('div');
        item.textContent = sug.via;
        item.className = "sugerencia";
        item.addEventListener('click', () => {
          inputDireccion.value = sug.via;
          inputDireccion.dataset.via = sug.via;
          inputDireccion.dataset.codigo = sug.codigo;
          viaSeleccionada = sug;
          resultados.innerHTML = '';
          btnConsultar.disabled = false;
        });
        
        resultados.appendChild(item);
      });
    }

    const numero = inputNumero.value.trim();
    if (valor.length >= 3 && numero) {
      const codigo = viaSeleccionada?.codigo || deducirSigla(valor);
      const via = viaSeleccionada?.via || valor;

      fetch(`/api/catastro/buscar?via=${encodeURIComponent(via)}&numero=${numero}&codigo=${codigo}`)
        .then(response => response.json())
        .then(data => {
          const inmuebles = data.inmuebles || [];
          resultados.innerHTML = "";

          inmuebles.slice(0, 5).forEach(inmueble => {
            const item = document.createElement("div");
            item.textContent = `${inmueble.nombre_via || via} Nº ${inmueble.numero}, Planta ${inmueble.planta || "-"}, Puerta ${inmueble.puerta || "-"}`;
            item.className = "sugerencia";
            item.addEventListener("click", () => {
              inputDireccion.value = inmueble.nombre_via || via;
              document.getElementById("bloque").value = inmueble.bloque || "";
              document.getElementById("escalera").value = inmueble.escalera || "";
              document.getElementById("planta").value = inmueble.planta || "";
              document.getElementById("puerta").value = inmueble.puerta || "";
              resultados.innerHTML = "";
            });
            resultados.appendChild(item);
          });

          if (inmuebles.length > 0) resultados.style.display = "block";
        });
    }
  });

  inputNumero.addEventListener('input', verificarMostrarCamposExtra);

  function verificarMostrarCamposExtra() {
    const direccionValida = inputDireccion.value.trim().length > 0;
    const numeroValido = inputNumero.value.trim().length > 0;
    bloquePlantaPuertaDiv.classList.toggle('oculto', !(direccionValida && numeroValido));
  }

  document.getElementById('consultar-principal').addEventListener('click', function () {
    const via = inputDireccion.dataset.via?.trim();     // ← Vía real sin barrio ni coma
    const codigo = inputDireccion.dataset.codigo?.trim(); // ← codigo del CSV
    const numero = inputNumero.value.trim();
    const bloque = document.getElementById('bloque').value.trim();
    const escalera = document.getElementById('escalera').value.trim();
    const planta = document.getElementById('planta').value.trim();
    const puerta = document.getElementById('puerta').value.trim();
  
    if (!via || !numero || !codigo) {
      alert('Faltan datos para consultar el Catastro. Asegúrate de elegir una dirección del listado.');
      return;
    }
  
    // Permitir continuar si ya se cargaron inmuebles previamente
    const hayTabla = document.querySelector('#selectores-dinamicos table');
    if (!planta || !puerta) {
      if (!hayTabla) {
        alert('Indica planta y puerta o selecciona un inmueble de la tabla.');
        return;
      }
    }
  
    fetch(`./api/catastro.php?via=${encodeURIComponent(via)}&numero=${numero}&codigo=${codigo}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          generarSelectoresDinamicos(data);
        } else {
          alert('No se encontraron inmuebles.');
        }
      })
      .catch(() => alert('No se pudo conectar con el Catastro.'));
  });
  

  function generarSelectoresDinamicos(dataOriginal) {
    const div = document.getElementById('selectores-dinamicos');
    div.innerHTML = '';
  
    // ✅ Tabla de inmuebles encontrada
    const tabla = document.createElement('table');
    tabla.style.width = "100%";
    tabla.style.borderCollapse = "collapse";
    tabla.innerHTML = `
      <thead>
        <tr>
          <th>Bloque</th>
          <th>Escalera</th>
          <th>Planta</th>
          <th>Puerta</th>
          <th>Ref. Catastral</th>
        </tr>
      </thead>
      <tbody>
        ${dataOriginal.map(item => `
          <tr>
            <td>${item.bloque || ''}</td>
            <td>${item.escalera || ''}</td>
            <td>${item.planta || ''}</td>
            <td>${item.puerta || ''}</td>
            <td>${item.refcat || ''}</td>
          </tr>
        `).join('')}
      </tbody>
    `;
    tabla.querySelectorAll('th, td').forEach(cell => {
      cell.style.border = "1px solid #ccc";
      cell.style.padding = "6px";
      cell.style.textAlign = "center";
    });
    div.appendChild(tabla);
    div.appendChild(document.createElement("br"));
  
    // 🧩 Selectores dinámicos
    ['bloque', 'escalera', 'planta', 'puerta'].forEach(campo => {
      const opciones = [...new Set(dataOriginal.map(i => i[campo] || ''))];
      const label = document.createElement('label');
      label.textContent = campo.charAt(0).toUpperCase() + campo.slice(1) + ': ';
      const select = document.createElement('select');
      select.id = campo;
      opciones.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val || '—';
        select.appendChild(opt);
      });
      label.appendChild(select);
      div.appendChild(label);
    });
  
    // 🔘 Botón para confirmar inmueble
    const boton = document.createElement('button');
    boton.textContent = 'Confirmar inmueble';
    boton.type = 'button';
    boton.style.marginTop = '10px';
    boton.addEventListener('click', () => {
      const bloque = document.getElementById('bloque').value;
      const escalera = document.getElementById('escalera').value;
      const planta = document.getElementById('planta').value;
      const puerta = document.getElementById('puerta').value;
  
      const ref = dataOriginal.find(i =>
        i.bloque === bloque &&
        i.planta === planta &&
        i.puerta === puerta &&
        (!i.escalera || i.escalera === escalera)
      );
  
      if (ref?.refcat) {
        fetch(`./api/catastro.php?refcat=${ref.refcat}`)
          .then(r => r.json())
          .then(detalles => {
            detallesInmueble = detalles;
            mostrarDetallesInmueble(detalles);
            document.getElementById('extras-adicionales').classList.remove('oculto');
            document.getElementById('resultado-valoracion').classList.remove('oculto');
          })
          .catch(() => alert('Error al obtener detalles.'));
      } else {
        alert('No se encontró coincidencia exacta.');
      }
    });
  
    div.appendChild(boton);
    document.getElementById('formulario-segundo').classList.remove('oculto');
  }
  

  function mostrarDetallesInmueble(bien) {
    const div = document.getElementById('detalles-inmueble');
    div.classList.remove('oculto');
    div.innerHTML = `
      <p><strong>Superficie:</strong> ${bien.superficie} m²</p>
      <p><strong>Año Construcción:</strong> ${bien.anio}</p>
      <p><strong>Uso:</strong> ${bien.uso}</p>
      <p><strong>Clase:</strong> ${bien.clase}</p>
      <p><strong>Ref. Catastral:</strong> ${bien.refcat}</p>
    `;
  }

  function normalizarTexto(texto) {
    return texto
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function calcularSimilitud(a, b) {
    const distancia = levenshtein(a, b);
    return 1 - distancia / Math.max(a.length, b.length);
  }

  function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, () => []);
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
      }
    }
    return dp[a.length][b.length];
  }

  const extrasSeleccionados = new Set();
  const valorExtras = { piscina: 0.10, garaje: 0.05, terraza: 0.03, ascensor: 0.07 };

  document.querySelectorAll('.btn-extra').forEach(btn => {
    btn.addEventListener('click', () => {
      const extra = btn.dataset.extra;
      btn.classList.toggle('seleccionado');
      extrasSeleccionados.has(extra)
        ? extrasSeleccionados.delete(extra)
        : extrasSeleccionados.add(extra);
    });
  });

  document.getElementById('calcular-valoracion').addEventListener('click', () => {
    if (!detallesInmueble) return alert('Selecciona un inmueble primero.');

    const metros = parseFloat(detallesInmueble.superficie);
    const anioConstruccion = parseInt(detallesInmueble.anio);
    const direccion = inputDireccion.value.toUpperCase();
    const barrio = direccion.includes("VISTA ALEGRE") ? "Vista Alegre"
      : direccion.includes("SANTA MARÍA") ? "Santa María de Gracia"
      : direccion.includes("LA FLOTA") ? "La Flota" : "Otros";

    const estadoConservacion = document.getElementById('estado-conservacion').value;
    const tipoPropiedad = document.getElementById('tipo-propiedad').value;
    const numHabitaciones = parseInt(document.getElementById('habitaciones').value);

    const valor = calcularValorVivienda({
      metros, barrio, anioConstruccion,
      estadoConservacion, tipoPropiedad,
      amenities: Array.from(extrasSeleccionados),
      numHabitaciones
    });

    document.getElementById('valor-estimado').textContent =
      `💰 Valor estimado: ${valor.toLocaleString('es-ES')} €`;
  });

  function calcularValorVivienda({ metros, barrio, anioConstruccion, estadoConservacion, tipoPropiedad, amenities, numHabitaciones }) {
    const preciosBase = {
      "Vista Alegre": 1850,
      "Santa María de Gracia": 1750,
      "La Flota": 1900,
      "default": 1600
    };

    let precioM2 = preciosBase[barrio] || preciosBase["default"];
    const antiguedad = new Date().getFullYear() - anioConstruccion;
    if (antiguedad < 5) precioM2 *= 1.2;
    else if (antiguedad < 15) precioM2 *= 1.1;
    else if (antiguedad > 40) precioM2 *= 0.85;

    const estadoFactor = { excelente: 1.15, normal: 1, malo: 0.8 };
    precioM2 *= estadoFactor[estadoConservacion.toLowerCase()] || 1;

    const tipoFactor = { piso: 1, chalet: 1.3, dúplex: 1.2, otros: 0.95 };
    precioM2 *= tipoFactor[tipoPropiedad.toLowerCase()] || 1;

    if (barrio === "Vista Alegre") precioM2 *= 1.22;

    let valor = precioM2 * metros;

    const ajustesExtras = { piscina: 0.10, garaje: 0.05, terraza: 0.03, ascensor: 0.07 };
    for (const extra of amenities) valor *= 1 + (ajustesExtras[extra] || 0);

    valor *= (1 + 0.1 * numHabitaciones);

    return Math.round(valor);
  }
});
