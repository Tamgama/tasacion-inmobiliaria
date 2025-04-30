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
  document.getElementById('consultar-principal').addEventListener('click', function () {
    let via = inputDireccion.value.trim().toUpperCase().split(',')[0];
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
  
    let sigla = "CL"; // por defecto
    if (viaSeleccionada && viaSeleccionada.sigla) {
      sigla = viaSeleccionada.sigla;
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
  
    console.log('Enviar a Catastro:', { via, numero, sigla, bloque, escalera, planta, puerta });
  
    const params = new URLSearchParams({
      Provincia: "MURCIA",
      Municipio: "MURCIA",
      TipoVia: sigla,
      NombreVia: via,
      Numero: numero
    });
    
    const urlCatastro = `https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/Consulta_DNPLOC?${params.toString()}`;
    
    fetch(urlCatastro)
      .then(response => response.json())
      .then(data => {
        console.log('Respuesta Catastro REST:', data);
    
        const lista = data.consulta_dnp?.lrcdnp?.rcdnp || [];
    
        const resultado = lista.map(item => {
          const refcat = item.rc || item.idbi?.rc?.pc1 + item.idbi?.rc?.pc2;
          const loint = item.dt?.locs?.lous?.lourb?.loint || item.dt?.loint || {};
          return {
            refcat: refcat,
            bloque: loint.bq || 'Único',
            escalera: loint.es || '',
            planta: loint.pt || '',
            puerta: loint.pu || ''
          };
        });
    
        if (resultado.length > 0) {
          generarSelectoresDinamicos(resultado);
        } else {
          alert('No se encontraron inmuebles para esta dirección.');
        }
      })
      .catch(error => {
        console.error('Error al consultar Catastro REST:', error);
        alert('No se pudo conectar con el Catastro.');
      });
    
  
    // fetch(`./api/catastro.php?${params.toString()}`)
    //   .then(response => response.json())
    //   .then(data => {
    //     console.log('Respuesta Catastro:', data);
    //     if (Array.isArray(data) && data.length > 0) {
    //       generarSelectoresDinamicos(data);
    //     } else {
    //       alert('No se encontraron datos en Catastro');
    //     }
    //   })
    //   .catch(error => {
    //     console.error('Error al consultar Catastro:', error);
    //     alert('Error al consultar el Catastro');
    //   });
      

    function generarSelectoresDinamicos(dataOriginal) {
      const selectoresDinamicosDiv = document.getElementById('selectores-dinamicos');
      selectoresDinamicosDiv.innerHTML = ''; // limpiar
    
      const bloques = [...new Set(dataOriginal.map(item => {
        const loint = item.dt?.locs?.lous?.lourb?.loint || item.dt?.loint || {};
        return loint.bq || 'Único';
      }))];
    
      const escaleras = [...new Set(dataOriginal.map(item => {
        const loint = item.dt?.locs?.lous?.lourb?.loint || item.dt?.loint || {};
        return loint.es || '';
      }))];
    
      const plantas = [...new Set(dataOriginal.map(item => {
        const loint = item.dt?.locs?.lous?.lourb?.loint || item.dt?.loint || {};
        return loint.pt || '';
      }))];
    
      const puertas = [...new Set(dataOriginal.map(item => {
        const loint = item.dt?.locs?.lous?.lourb?.loint || item.dt?.loint || {};
        return loint.pu || '';
      }))];
    
      const crearSelect = (id, label, opciones) => {
        const wrapper = document.createElement('label');
        wrapper.textContent = label + ': ';
        const select = document.createElement('select');
        select.id = id;
        opciones.forEach(valor => {
          const opt = document.createElement('option');
          opt.value = valor;
          opt.textContent = valor || '—';
          select.appendChild(opt);
        });
        wrapper.appendChild(select);
        return wrapper;
      };
    
      selectoresDinamicosDiv.appendChild(crearSelect('bloque', 'Bloque', bloques));
      selectoresDinamicosDiv.appendChild(crearSelect('escalera', 'Escalera', escaleras));
      selectoresDinamicosDiv.appendChild(crearSelect('planta', 'Planta', plantas));
      selectoresDinamicosDiv.appendChild(crearSelect('puerta', 'Puerta', puertas));
    
      const boton = document.createElement('button');
      boton.textContent = 'Confirmar inmueble';
      boton.type = 'button';
      boton.addEventListener('click', () => {
        const bloque = document.getElementById('bloque').value;
        const escalera = document.getElementById('escalera').value;
        const planta = document.getElementById('planta').value;
        const puerta = document.getElementById('puerta').value;
    
        const coincidencias = dataOriginal.filter(item => {
          const loint = item.dt?.locs?.lous?.lourb?.loint || item.dt?.loint || {};
          return (
            (loint.bq || 'Único').trim() === bloque &&
            (loint.pt || '').trim() === planta &&
            (loint.pu || '').trim() === puerta &&
            (!loint.es || loint.es.trim() === escalera)
          );
        });
    
        if (coincidencias.length === 1) {
          const bien = coincidencias[0];
          const refcat = bien.rc || bien.idbi?.rc?.pc1 + bien.idbi?.rc?.pc2;
          const loint = bien.dt?.locs?.lous?.lourb?.loint || bien.dt?.loint || {};
          const debi = bien.debi || {};
    
          mostrarDetallesInmueble({
            refcat: refcat,
            bloque: loint.bq || 'Único',
            escalera: loint.es || '',
            planta: loint.pt || '',
            puerta: loint.pu || '',
            uso: debi.luso || 'Desconocido',
            anio: debi.ant || 'Desconocido',
            superficie: debi.sfc || 'Desconocida',
            clase: debi.ucl || '—'
          });
        } else {
          alert('No se encontró coincidencia exacta para bloque/escalera/planta/puerta.');
        }
      });
    
      selectoresDinamicosDiv.appendChild(document.createElement('br'));
      selectoresDinamicosDiv.appendChild(boton);
      document.getElementById('formulario-segundo').classList.remove('oculto');
    }          
  });
  
  // 🔎 Esta función va FUERA del addEventListener
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