<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

// 🧽 Función para quitar tildes y símbolos raros
function normalizarTexto($texto) {
  $texto = strtoupper($texto); // Mayúsculas
  $texto = iconv('UTF-8', 'ASCII//TRANSLIT', $texto); // Quitar tildes y ñ
  $texto = preg_replace('/[^A-Z0-9 ]/', '', $texto); // Eliminar símbolos raros
  $texto = preg_replace('/\s+/', ' ', $texto); // Espacios múltiples
  return trim($texto);
}

// 🔄 Modo 1: Buscar por nombre de calle y número
if (isset($_GET['nombreVia']) && isset($_GET['numero'])) {
  $nombreVia = normalizarTexto($_GET['nombreVia']);
  $numero = urlencode(trim($_GET['numero']));
  $provincia = "MURCIA";
  $municipio = "MURCIA";
  $tiposVia = ['CALLE', 'CARRIL', 'AVENIDA', 'PLAZA', 'CAMINO', 'TRAVESIA'];
  
  $url = "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/Consulta_DNP?" .
         "Provincia=" . urlencode($provincia) .
         "&Municipio=" . urlencode($municipio) .
         "&TipoVia=" . urlencode($tipoVia) .
         "&NombreVia=" . urlencode($nombreVia) .
         "&PrimerNumero=" . $numero;

  $opts = ["http" => ["method" => "GET", "header" => "User-Agent: PromurciaBot\r\n"]];
  $context = stream_context_create($opts);
  $response = @file_get_contents($url, false, $context);

  if (!$response) {
    echo json_encode(['error' => 'No se pudo conectar con el Catastro.']);
    exit;
  }

  $data = json_decode($response, true);
  $viviendas = $data['consulta_dnp_resultado']['lrcdnp']['rcdnp'] ?? [];

  if (!is_array($viviendas) || count($viviendas) === 0) {
    echo json_encode([]);
    exit;
  }

  $resultado = array_map(function ($v) {
    return [
      'refcat' => $v['rc'],
      'direccion' => $v['ldt'] ?? null,
      'bloque' => $v['dt']['lcons']['blo'] ?? 'Único',
      'planta' => $v['dt']['lcons']['pto'] ?? 'Baja',
      'puerta' => $v['dt']['lcons']['puerta'] ?? null
    ];
  }, $viviendas);

  echo json_encode(array_values(array_unique($resultado, SORT_REGULAR)), JSON_UNESCAPED_UNICODE);
  exit;
}

// 🔄 Modo 2: Buscar detalles por referencia catastral
if (isset($_GET['refcat'])) {
  $refcat = strtoupper(str_replace([' ', '-'], '', trim($_GET['refcat'])));
  if (!$refcat) {
    echo json_encode(['error' => 'Falta la referencia catastral (refcat)']);
    exit;
  }

  $url = "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/Consulta_DNPRC?RefCat=" . urlencode($refcat);
  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_TIMEOUT, 10);
  curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0');
  $response = curl_exec($ch);

  if (curl_errno($ch)) {
    echo json_encode(['error' => 'Error al conectar con el Catastro', 'detalle' => curl_error($ch)]);
    curl_close($ch);
    exit;
  }
  curl_close($ch);

  $data = json_decode($response, true);
  $viviendas = $data['consulta_dnprcResult']['lrcdnp']['rcdnp'] ?? [];

  if (!is_array($viviendas) || count($viviendas) === 0) {
    echo json_encode(['error' => 'No se encontraron datos para esa referencia', 'refcat' => $refcat]);
    exit;
  }

  $resultado = array_map(function ($v) {
    return [
      'refcat' => $v['rc'] ?? null,
      'bloque' => $v['dt']['lcons']['blo'] ?? 'Único',
      'planta' => $v['dt']['lcons']['pto'] ?? 'Baja',
      'puerta' => $v['dt']['lcons']['puerta'] ?? '',
      'uso' => $v['debi']['luso'] ?? null,
      'superficie' => $v['debi']['sfc'] ?? null,
      'anio' => $v['debi']['ant'] ?? null,
      'clase' => $v['debi']['ucl'] ?? null
    ];
  }, $viviendas);

  echo json_encode(array_values(array_unique($resultado, SORT_REGULAR)), JSON_UNESCAPED_UNICODE);
  exit;
}

// Si no se recibió ninguno de los parámetros válidos
echo json_encode(['error' => 'Parámetros incorrectos. Usa nombreVia y numero o refcat.']);
