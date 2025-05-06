document.addEventListener('DOMContentLoaded', function() {
  let calles = [];
  let viaSeleccionada = null;
  let detallesInmueble = null;

  Papa.parse("callejero.csv", {
    download: true,
    header: true,
    complete: function(results) {
      calles = results.data.map(fila => {
        return {
          via: fila.via || fila.nombre || '',
          sigla: fila.sigla || '',
          normalizada: normalizarTexto(fila.via || fila.nombre || '')
        };
      });
    }
  });

  const inputDireccion = document.getElementById('calle');
  const resultados = document.getElementById('resultados-catastro');
  const inputNumero = document.getElementById('numero');
  const bloquePlantaPuertaDiv = document.getElementById('bloque-planta-puerta');

  inputDireccion.addEventListener('input', function() {
    const valor = normalizarTexto(this.value.trim());
    resultados.innerHTML = '';

    if (valor.length > 1 && calles.length > 0) {
      const sugerencias = calles.filter(calle => {
        const sim = calcularSimilitud(valor, calle.normalizada);
        return sim > 0.7;
      }).slice(0, 5);

      sugerencias.forEach(sug => {
        const item = document.createElement('div');
        item.textContent = sug.via;
        item.style.cursor = 'pointer';
        item.style.padding = '5px';
        item.style.borderBottom = '1px solid #ddd';

        item.addEventListener('click', () => {
          inputDireccion.value = sug.via;
          resultados.innerHTML = '';
          viaSeleccionada = sug;
        });

        resultados.appendChild(item);
      });
    }
  });

  inputNumero.addEventListener('input', verificarMostrarCamposExtra);

  function verificarMostrarCamposExtra() {
    const direccionValida = inputDireccion.value.trim().length > 0;
    const numeroValido = inputNumero.value.trim().length > 0;
    if (direccionValida && numeroValido) {
      bloquePlantaPuertaDiv.classList.remove('oculto');
    } else {
      bloquePlantaPuertaDiv.classList.add('oculto');
    }
  }

  document.getElementById('consultar-principal').addEventListener('click', function () {
    let direccion = inputDireccion.value.trim().toUpperCase();
    const numero = inputNumero.value.trim();
    const bloque = document.getElementById('bloque').value.trim();
    const escalera = document.getElementById('escalera').value.trim();
    const planta = document.getElementById('planta').value.trim();
    const puerta = document.getElementById('puerta').value.trim();

    let sigla = "CL";
    let via = direccion;

    if (viaSeleccionada && viaSeleccionada.sigla) {
      sigla = viaSeleccionada.sigla;
      via = viaSeleccionada.via;
    }

    if (!via || !numero || !planta || !puerta) {
      alert('Rellena todos los campos obligatorios.');
      return;
    }

    fetch(`./api/catastro.php?via=${encodeURIComponent(via)}&numero=${numero}&sigla=${sigla}`)
      .then(response => response.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          generarSelectoresDinamicos(data);
        } else {
          alert('No se encontraron inmuebles para esta dirección.');
        }
      })
      .catch(error => {
        console.error('Error al consultar el Catastro:', error);
        alert('No se pudo conectar con el Catastro.');
      });

    function generarSelectoresDinamicos(dataOriginal) {
      const div = document.getElementById('selectores-dinamicos');
      div.innerHTML = '';

      const campos = ['bloque', 'escalera', 'planta', 'puerta'];
      campos.forEach(campo => {
        const opciones = [...new Set(dataOriginal.map(item => item[campo] || ''))];
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

      const boton = document.createElement('button');
      boton.textContent = 'Confirmar inmueble';
      boton.type = 'button';
      boton.addEventListener('click', () => {
        const bloque = document.getElementById('bloque').value;
        const escalera = document.getElementById('escalera').value;
        const planta = document.getElementById('planta').value;
        const puerta = document.getElementById('puerta').value;

        const ref = dataOriginal.find(item =>
          item.bloque === bloque &&
          item.planta === planta &&
          item.puerta === puerta &&
          (!item.escalera || item.escalera === escalera)
        );

        if (ref && ref.refcat) {
          fetch(`./api/catastro.php?refcat=${ref.refcat}`)
            .then(r => r.json())
            .then(detalles => {
              detallesInmueble = detalles;
              mostrarDetallesInmueble(detalles);
              document.getElementById('extras-adicionales').classList.remove('oculto');
              document.getElementById('resultado-valoracion').classList.remove('oculto');
            })
            .catch(err => alert('Error al obtener detalles.'));
        } else {
          alert('No se encontró coincidencia exacta.');
        }
      });

      div.appendChild(document.createElement('br'));
      div.appendChild(boton);
      document.getElementById('formulario-segundo').classList.remove('oculto');
    }
  });

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
      .replace(/[̀-ͯ]/g, "")
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
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + 1
          );
        }
      }
    }
    return dp[a.length][b.length];
  }

  function calcularValorVivienda({ metros, barrio, anioConstruccion, estadoConservacion, tipoPropiedad, amenities = [], numHabitaciones }) {
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

    const estadoFactor = {
      excelente: 1.15,
      normal: 1,
      malo: 0.8
    };
    precioM2 *= estadoFactor[estadoConservacion.toLowerCase()] || 1;

    const tipoFactor = {
      piso: 1,
      chalet: 1.3,
      dúplex: 1.2,
      otros: 0.95
    };
    precioM2 *= tipoFactor[tipoPropiedad.toLowerCase()] || 1;

    if (barrio === "Vista Alegre") {
      precioM2 *= 1.22;
    }

    let valor = precioM2 * metros;

    const ajustesExtras = {
      piscina: 0.10,
      garaje: 0.05,
      terraza: 0.03,
      ascensor: 0.07
    };
    for (const extra of amenities) {
      valor *= 1 + (ajustesExtras[extra] || 0);
    }

    valor *= (1 + 0.1 * numHabitaciones);

    return Math.round(valor);
  }

  const extrasSeleccionados = new Set();
  const valorExtras = {
    piscina: 0.10,
    garaje: 0.05,
    terraza: 0.03,
    ascensor: 0.07
  };

  document.querySelectorAll('.btn-extra').forEach(btn => {
    btn.addEventListener('click', () => {
      const extra = btn.dataset.extra;
      btn.classList.toggle('seleccionado');
      if (extrasSeleccionados.has(extra)) {
        extrasSeleccionados.delete(extra);
      } else {
        extrasSeleccionados.add(extra);
      }
      const total = Array.from(extrasSeleccionados).reduce((sum, e) => sum + valorExtras[e], 0);
      console.log(`Valor extra acumulado: ${(total * 100).toFixed(1)}%`);
    });
  });

  document.getElementById('calcular-valoracion').addEventListener('click', () => {
    if (!detallesInmueble) {
      alert('Selecciona un inmueble primero.');
      return;
    }

    const metros = parseFloat(detallesInmueble.superficie);
    const anioConstruccion = parseInt(detallesInmueble.anio);
    const barrio = inputDireccion.value.toUpperCase().includes("VISTA ALEGRE") ? "Vista Alegre"
      : inputDireccion.value.toUpperCase().includes("SANTA MARÍA") ? "Santa María de Gracia"
      : inputDireccion.value.toUpperCase().includes("LA FLOTA") ? "La Flota"
      : "Otros";

    const estadoConservacion = document.getElementById('estado-conservacion').value;
    const tipoPropiedad = document.getElementById('tipo-propiedad').value;
    const numHabitaciones = parseInt(document.getElementById('habitaciones').value);

    const valor = calcularValorVivienda({
      metros,
      barrio,
      anioConstruccion,
      estadoConservacion,
      tipoPropiedad,
      amenities: Array.from(extrasSeleccionados),
      numHabitaciones
    });

    document.getElementById('valor-estimado').textContent = `💰 Valor estimado: ${valor.toLocaleString('es-ES')} €`;
  });
});
