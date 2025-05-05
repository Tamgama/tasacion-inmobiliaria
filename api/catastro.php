<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Cambiar por tu dominio en producción
ini_set('display_errors', 1);
error_reporting(E_ALL);

// 🔧 Quita tildes, símbolos raros, y pasa a mayúsculas
function normalizarTexto($texto) {
  $texto = strtoupper($texto);
  $texto = iconv('UTF-8', 'ASCII//TRANSLIT', $texto); // Quitar tildes y ñ
  $texto = preg_replace('/[^A-Z0-9 ]/', '', $texto);
  return trim(preg_replace('/\s+/', ' ', $texto));
}

// ==============================
// 🔍 MODO 1: Buscar por dirección
// ==============================
if (isset($_GET['via'], $_GET['numero'], $_GET['sigla'])) {
  $provincia = "MURCIA";
  $municipio = "MURCIA";
  $via = normalizarTexto($_GET['via']);
  $numero = trim($_GET['numero']);
  $sigla = strtoupper(trim($_GET['sigla']));

  if (!$via || !$numero || !$sigla) {
    echo json_encode(['error' => 'Faltan parámetros obligatorios']);
    exit;
  }

  $url = "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/Consulta_DNPLOC?" .
         "Provincia=" . urlencode($provincia) .
         "&Municipio=" . urlencode($municipio) .
         "&Sigla=" . urlencode($sigla) .
         "&Calle=" . urlencode($via) .
         "&Numero=" . urlencode($numero);

  $opts = ["http" => ["method" => "GET", "header" => "User-Agent: PromurciaBot\r\n"]];
  $context = stream_context_create($opts);
  $response = @file_get_contents($url, false, $context);

  if (!$response) {
    echo json_encode(['error' => 'No se pudo conectar con el Catastro.']);
    exit;
  }

  $data = json_decode($response, true);
  $viviendas = $data['consulta_dnplocResult']['lrcdnp']['rcdnp'] ?? [];

  if (!is_array($viviendas) || count($viviendas) === 0) {
    echo json_encode([]);
    exit;
  }

  $resultado = array_map(function ($v) {
    return [
      'refcat' => $v['rc'] ?? null,
      'direccion' => $v['ldt'] ?? null,
      'bloque' => $v['dt']['lcons']['blo'] ?? 'Único',
      'planta' => $v['dt']['lcons']['pto'] ?? 'Baja',
      'puerta' => $v['dt']['lcons']['puerta'] ?? ''
    ];
  }, $viviendas);

  echo json_encode($resultado, JSON_UNESCAPED_UNICODE);
  exit;
}

// ==================================
// 🔍 MODO 2: Buscar por Ref. Catastral
// ==================================
if (isset($_GET['refcat'])) {
  $refcat = strtoupper(str_replace([' ', '-'], '', trim($_GET['refcat'])));
  if (!$refcat) {
    echo json_encode(['error' => 'Falta la referencia catastral (refcat)']);
    exit;
  }

  // 🚀 Primero intentamos la API oficial JSON
  $url = "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/Consulta_DNPRC?RefCat=" . urlencode($refcat);
  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_TIMEOUT, 10);
  curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0');
  $response = curl_exec($ch);
  curl_close($ch);

  if (!$response) {
    echo json_encode(['error' => 'Error al conectar con la API del Catastro']);
    exit;
  }

  $data = json_decode($response, true);
  $viviendas = $data['consulta_dnprcResult']['lrcdnp']['rcdnp'] ?? [];

  if (is_array($viviendas) && count($viviendas) > 0 && isset($viviendas[0]['debi'])) {
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

    echo json_encode($resultado, JSON_UNESCAPED_UNICODE);
    exit;
  }

  // 🧽 Si la API no devuelve datos, hacemos scraping HTML como respaldo
  $htmlUrl = "https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCListaBienes.aspx?rc=" . urlencode($refcat);
  $html = @file_get_contents($htmlUrl);

  if (!$html) {
    echo json_encode(['error' => 'No se pudo obtener datos por HTML para la referencia', 'refcat' => $refcat]);
    exit;
  }

  libxml_use_internal_errors(true);
  $dom = new DOMDocument();
  $dom->loadHTML($html);
  $xpath = new DOMXPath($dom);

  function extraerDato($xpath, $titulo) {
    $nodo = $xpath->query('//div[@class="form-group"]//span[contains(text(), "' . $titulo . '")]/../following-sibling::div//label');
    if ($nodo->length > 0) {
      return trim($nodo->item(0)->textContent);
    }
    return null;
  }

  $resultado = [
    'refcat' => $refcat,
    'localizacion' => extraerDato($xpath, 'Localización'),
    'clase' => extraerDato($xpath, 'Clase'),
    'uso' => extraerDato($xpath, 'Uso principal'),
    'superficie' => extraerDato($xpath, 'Superficie construida'),
    'anio' => extraerDato($xpath, 'Año construcción')
  ];

  echo json_encode($resultado, JSON_UNESCAPED_UNICODE);
  exit;
}

// ❌ Ningún parámetro válido recibido
echo json_encode(['error' => 'Parámetros incorrectos. Usa via, numero y sigla o refcat.']);
