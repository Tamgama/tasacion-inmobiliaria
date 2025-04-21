<?php
header('Content-Type: application/json');

// 🧽 Función para quitar tildes y símbolos raros
function normalizarTexto($texto) {
  $texto = strtoupper($texto); // Mayúsculas
  $texto = iconv('UTF-8', 'ASCII//TRANSLIT', $texto); // Quitar tildes y ñ
  $texto = preg_replace('/[^A-Z0-9 ]/', '', $texto); // Eliminar símbolos raros
  $texto = preg_replace('/\s+/', ' ', $texto); // Espacios múltiples
  return trim($texto);
}

// Validación de entrada
$nombreVia = isset($_GET['nombreVia']) ? $_GET['nombreVia'] : '';
$numero = isset($_GET['numero']) ? $_GET['numero'] : '';

if (!$nombreVia || !$numero) {
  echo json_encode(['error' => 'Faltan parámetros: nombreVia y numero']);
  exit;
}

// Normalizar vía
$nombreVia = normalizarTexto($nombreVia);
$numero = urlencode(trim($numero));

// Configuración fija
$provincia = "MURCIA";
$municipio = "MURCIA";
$tipoVia = "CALLE"; // Si necesitas hacerlo dinámico, lo hablamos

// Construir URL
$url = "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/Consulta_DNP?" .
       "Provincia=" . urlencode($provincia) .
       "&Municipio=" . urlencode($municipio) .
       "&TipoVia=" . urlencode($tipoVia) .
       "&NombreVia=" . urlencode($nombreVia) .
       "&PrimerNumero=" . $numero;

// Preparar petición HTTP
$options = [
  "http" => [
    "method" => "GET",
    "header" => "User-Agent: PromurciaBot/1.0\r\n"
  ]
];

$context = stream_context_create($options);
$response = @file_get_contents($url, false, $context);

if (!$response) {
  echo json_encode(['error' => 'No se pudo conectar con el Catastro.']);
  exit;
}

$data = json_decode($response, true);
$viviendas = $data['consulta_dnp_resultado']['lrcdnp']['rcdnp'] ?? [];

if (!is_array($viviendas) || count($viviendas) === 0) {
  echo json_encode([]); // Lista vacía si no hay resultados
  exit;
}

// Resultado limpio con datos útiles
$resultado = array_map(function ($v) {
  return [
    'refcat' => $v['rc'],
    'direccion' => $v['ldt'] ?? null,
    'bloque' => $v['dt']['lcons']['blo'] ?? 'Único',
    'planta' => $v['dt']['lcons']['pto'] ?? 'Baja',
    'puerta' => $v['dt']['lcons']['puerta'] ?? null
  ];
}, $viviendas);

// Eliminar duplicados por refcat
$resultadoUnico = array_values(array_unique($resultado, SORT_REGULAR));

echo json_encode($resultadoUnico, JSON_UNESCAPED_UNICODE);
