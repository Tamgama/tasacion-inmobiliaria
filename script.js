document.addEventListener('DOMContentLoaded', init);

function init() {
  cargarCSV();
  configurarEventos();
}

let calles = [];
let viaSeleccionada = null;
let detallesInmueble = null;

function cargarCSV() {
  Papa.parse('./callejero/callejero.csv', {
    download: true,
    header: true,
    complete: function (results) {
      console.log("📄 CSV cargado:", results.data);
      calles = results.data.map(fila => ({
        via: fila.NombreVia || '',
        codigo: fila.codigo || '',
        normalizada: normalizarTexto(fila.NombreVia || '')
      }));
    }
  });
}


function configurarEventos() {
  const inputDireccion = document.getElementById('calle');
  const inputNumero = document.getElementById('numero');
  const btnConsultar = document.getElementById('consultar-principal');

  inputDireccion.addEventListener('input', mostrarSugerencias);
  inputNumero.addEventListener('input', verificarMostrarCamposExtra);
  btnConsultar.addEventListener('click', consultarCatastro);

  btnConsultar.disabled = true;
}

function mostrarSugerencias() {
  const input = document.getElementById('calle');
  const contenedor = document.getElementById('resultados-catastro');
  contenedor.innerHTML = '';

  const valor = normalizarTexto(input.value.trim());
  if (valor.length < 2 || !calles.length) return;

  const palabras = valor.split(" ");
  const sugerencias = calles.filter(c =>
    palabras.every(p => c.normalizada.includes(p))
  ).slice(0, 5);

  sugerencias.forEach(calle => {
    const item = document.createElement('div');
    item.textContent = calle.via;
    item.className = "sugerencia";
    item.addEventListener('click', () => {
      input.value = calle.via;
      input.dataset.via = calle.via;
      input.dataset.codigo = calle.codigo;
      viaSeleccionada = calle;
      document.getElementById('consultar-principal').disabled = false;
      contenedor.innerHTML = '';
    });
    contenedor.appendChild(item);
  });
}

function verificarMostrarCamposExtra() {
  const direccion = document.getElementById('calle').value.trim();
  const numero = document.getElementById('numero').value.trim();
  const extraDiv = document.getElementById('bloque-planta-puerta');

  extraDiv.classList.toggle('oculto', !(direccion && numero));
}

function consultarCatastro() {
  const via = document.getElementById('calle').dataset.via;
  const codigo = document.getElementById('calle').dataset.codigo;
  const numero = document.getElementById('numero').value.trim();
  const planta = document.getElementById('planta').value.trim();
  const puerta = document.getElementById('puerta').value.trim();

  if (!via || !codigo || !numero) {
    alert("Faltan datos para la consulta");
    return;
  }

  const hayTabla = document.querySelector('#selectores-dinamicos table');
  if (!planta || !puerta) {
    if (!hayTabla) {
      alert("Indica planta y puerta o selecciona de la tabla.");
      return;
    }
  }

  fetch(`./api/catastro.php?via=${encodeURIComponent(via)}&numero=${numero}&codigo=${codigo}`)
    .then(r => r.json())
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        generarSelectoresDinamicos(data);
      } else {
        alert("No se encontraron inmuebles.");
      }
    })
    .catch(() => alert("Error al conectar con Catastro"));
}

function generarSelectoresDinamicos(dataOriginal) {
  const div = document.getElementById('selectores-dinamicos');
  div.innerHTML = '';

  const tabla = document.createElement('table');
  tabla.innerHTML = `
    <thead>
      <tr><th>Bloque</th><th>Escalera</th><th>Planta</th><th>Puerta</th><th>RefCat</th></tr>
    </thead>
    <tbody>
      ${dataOriginal.map(i => `
        <tr>
          <td>${i.bloque || ''}</td>
          <td>${i.escalera || ''}</td>
          <td>${i.planta || ''}</td>
          <td>${i.puerta || ''}</td>
          <td>${i.refcat || ''}</td>
        </tr>`).join('')}
    </tbody>`;
  div.appendChild(tabla);

  ['bloque', 'escalera', 'planta', 'puerta'].forEach(campo => {
    const opciones = [...new Set(dataOriginal.map(i => i[campo] || ''))];
    const label = document.createElement('label');
    label.textContent = campo + ": ";
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
  boton.addEventListener('click', () => confirmarInmueble(dataOriginal));
  div.appendChild(boton);

  document.getElementById('formulario-segundo').classList.remove('oculto');
}

function confirmarInmueble(lista) {
  const bloque = document.getElementById('bloque').value;
  const escalera = document.getElementById('escalera').value;
  const planta = document.getElementById('planta').value;
  const puerta = document.getElementById('puerta').value;

  const ref = lista.find(i =>
    (i.bloque || '').trim().toUpperCase() === bloque.trim().toUpperCase() &&
    (i.planta || '').trim().toUpperCase() === planta.trim().toUpperCase() &&
    (i.puerta || '').trim().toUpperCase() === puerta.trim().toUpperCase() &&
    (!i.escalera || (i.escalera || '').trim().toUpperCase() === escalera.trim().toUpperCase())
  );

  if (ref?.refcat) {
    fetch(`./api/catastro.php?refcat=${ref.refcat}`)
      .then(r => r.json())
      .then(data => {
        detallesInmueble = data;
        mostrarDetallesInmueble(data);
        document.getElementById('extras-adicionales').classList.remove('oculto');
        document.getElementById('resultado-valoracion').classList.remove('oculto');
      });
  } else {
    alert("No se encontró inmueble exacto.");
  }
}

function mostrarDetallesInmueble(bien) {
  const div = document.getElementById('detalles-inmueble');
  div.classList.remove('oculto');
  div.innerHTML = `
    <p><strong>Superficie:</strong> ${bien.superficie} m²</p>
    <p><strong>Año Construcción:</strong> ${bien.anio}</p>
    <p><strong>Uso:</strong> ${bien.uso}</p>
    <p><strong>Clase:</strong> ${bien.clase}</p>
    <p><strong>Ref. Catastral:</strong> ${bien.refcat}</p>`;
}

function normalizarTexto(texto) {
  return texto.toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ').trim();
}
