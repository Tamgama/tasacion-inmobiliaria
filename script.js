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

  document.getElementById('consultar-principal').addEventListener('click', function() {
    const numero = inputNumero.value;
    if (viaSeleccionada && numero) {
      console.log('Consultar Catastro:', viaSeleccionada.ViaCatastro, numero, viaSeleccionada.barrio);
    } else {
      alert('Selecciona una vía y escribe un número');
    }
  });
});
