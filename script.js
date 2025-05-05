document.addEventListener('DOMContentLoaded', function() {
  let calles = [];
  let viaSeleccionada = null;

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
  const bloquePlantaPuertaDiv = document.getElementById('bloque-planta-puerta');

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

    const dicSiglas = {
      'AVENIDA': 'AV', 'ALAMEDA': 'AL', 'BARRIO': 'BO', 'CAÑADA': 'CA', 'CALLEJON': 'CJ',
      'CALLE': 'CL', 'CAMINO': 'CM', 'CARRETERA': 'CR', 'CASERIO': 'CS', 'CUESTA': 'CT',
      'DISEMINADO': 'DS', 'GRANVIA': 'GV', 'JARDINES': 'JR', 'LUGAR': 'LG', 'PASARELA': 'PA',
      'PARAJE': 'PE', 'POLIGONO': 'PG', 'PASAJE': 'PJ', 'PROLONGACION': 'PR',
      'PASEO': 'PS', 'PLAZA': 'PZ', 'SENDA': 'SD', 'TRAVESIA': 'TR', 'URBANIZACION': 'UR',
      'VIADUCTO': 'VD', 'VEREDA': 'VR'
    };

    let sigla = "CL";
    let via = direccion;

    if (viaSeleccionada && viaSeleccionada.sigla) {
      sigla = viaSeleccionada.sigla;
      via = viaSeleccionada.via;
    } else {
      const tipo = via.split(' ')[0];
      if (dicSiglas[tipo]) {
        sigla = dicSiglas[tipo];
        via = via.replace(tipo, '').trim();
      }
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
            .then(detalles => mostrarDetallesInmueble(detalles))
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
});
