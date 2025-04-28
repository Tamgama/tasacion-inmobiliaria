document.addEventListener('DOMContentLoaded', function() {
  let calles = [];
  let viaSeleccionada = null;

  // cargar csv
  Papa.parse("callejero.csv", {
    download: true,
    header: true,
    complete: function(results) {
      calles = results.data;
    }
  });

  const inputDireccion = document.getElementById('calle');
  const resultados = document.getElementById('resultados-catastro');
  const inputNumero = document.getElementById('numero');
  const bloquePlantaPuertaDiv = document.getElementById('bloque-planta-puerta'); // corregido

  // cambios para mostrar la siguiente parte del formulario
  inputDireccion.addEventListener('input', function() {
    const valor = this.value.trim().toLowerCase();
    resultados.innerHTML = '';

    if (valor.length > 1 && calles.length > 0) {
      const sugerencias = calles.filter(calle =>
        calle && calle.via && calle.via.toLowerCase().includes(valor)
      ).slice(0, 5);

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
      // Mostrar campos extra si ambos están rellenos
      bloquePlantaPuertaDiv.classList.remove('oculto');
    } else {
      bloquePlantaPuertaDiv.classList.add('oculto');
    }
  }

  // Cuando se haga clic en consultar → se hace la llamada real
  document.getElementById('consultar-principal').addEventListener('click', function() {
    const via = inputDireccion.value.trim().toUpperCase();
    const numero = inputNumero.value.trim();
    const bloque = document.getElementById('bloque').value.trim();
    const escalera = document.getAnimations('escalera').values.trim();
    const planta = document.getElementById('planta').value.trim();
    const puerta = document.getElementById('puerta').value.trim();

    if (!via || !numero || !planta || !puerta) {
      alert('Rellena todos los campos obligatorios.');
      return;
    }

    console.log('Enviar a Catastro:', { via, numero, bloque, escalera, planta, puerta });

    // const barrio = viaSeleccionada ? viaSeleccionada.barrio : "VISTA ALEGRE";
    // const codigo = viaSeleccionada ? viaSeleccionada.codigo : "30007";

    const params = new URLSearchParams({
      via: via,
      numero: numero,
      barrio: barrio,
      codigo: codigo
    });

    fetch(`catastro.php?${params.toString()}`)
      .then(response => response.json())
      .then(data => {
        console.log('Respuesta Catastro:', data);
        if (Array.isArray(data) && data.length > 0) {
          const coincidencias = data.filter(item =>
            item.bloque.trim() === (bloque || 'Único') &&
            item.planta.trim() === planta &&
            item.puerta.trim() === puerta &&
            (!item.escalera || item.escalera.trim() === escalera)
          );

          if (coincidencias.length === 1) {
            obtenerDetallesPorRefCat(coincidencias[0].refcat);
          } else {
            alert('No se encontró coincidencia exacta para bloque/escalera/planta/puerta.');
          }
        } else {
          alert('No se encontraron datos en Catastro');
        }
      })
      .catch(error => {
        console.error('Error al consultar Catastro:', error);
        alert('Error al consultar el Catastro');
      });
  });

  function obtenerDetallesPorRefCat(refcat) {
    const params = new URLSearchParams({
      refcat: refcat
    });

    fetch('catastro.php?' + params.toString())
      .then(response => response.json())
      .then(data => {
        console.log('Detalles refcat:', data);
        if (data.error) {
          alert('Error: ' + data.error);
        } else if (data.length === 0) {
          alert('No se encontraron detalles.');
        } else {
          mostrarDetallesInmueble(data[0]);
        }
      })
      .catch(error => {
        console.error('Error obteniendo detalles:', error);
      });
  }

  function mostrarDetallesInmueble(bien) {
    const detallesDiv = document.getElementById('detalles-inmueble');
    detallesDiv.classList.remove('oculto');
    detallesDiv.innerHTML = `
      <p><strong>Superficie:</strong> ${bien.superficie} m²</p>
      <p><strong>Año Construcción:</strong> ${bien.anio}</p>
      <p><strong>Uso:</strong> ${bien.uso}</p>
      <p><strong>Clase:</strong> ${bien.clase}</p>
      <p><strong>Bloque:</strong> ${bien.bloque}</p>
      <p><strong>Escalera:</strong> ${bien.escalera || ''}</p>
      <p><strong>Planta:</strong> ${bien.planta}</p>
      <p><strong>Puerta:</strong> ${bien.puerta}</p>
      <p><strong>Ref. Catastral:</strong> ${bien.refcat}</p>
    `;
  }
});
