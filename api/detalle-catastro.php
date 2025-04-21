<?php
// Activar errores durante desarrollo
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// Validar que venga la refcat
$refcat = isset($_GET['refcat']) ? trim($_GET['refcat']) : '';
if (!$refcat) {
  echo json_encode(['error' => 'Falta la referencia catastral (refcat)']);
  exit;
}

// Limpiar refcat si llega con espacios o guiones (opcional)
$refcat = strtoupper(str_replace([' ', '-'], '', $refcat));

// Construir URL
$url = "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/Consulta_DNPRC?RefCat=" . urlencode($refcat);

// Preparar cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0');
$response = curl_exec($ch);

if (curl_errno($ch)) {
  echo json_encode([
    'error' => 'Error al conectar con el Catastro',
    'detalle' => curl_error($ch),
    'url' => $url
  ]);
  curl_close($ch);
  exit;
}
curl_close($ch);

// Guardar respuesta (solo para depuración)
file_put_contents(__DIR__ . "/log_catastro_detalle.json", $response);

// Decodificar JSON
$data = json_decode($response, true);
$viviendas = $data['consulta_dnprcResult']['lrcdnp']['rcdnp'] ?? [];

if (!is_array($viviendas) || count($viviendas) === 0) {
  echo json_encode([
    'error' => 'No se encontraron inmuebles para esa referencia catastral',
    'refcat' => $refcat
  ]);
  exit;
}

// Construir resultado limpio
$resultado = array_map(function($v) {
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

// Opcional: eliminar duplicados
$resultado = array_values(array_unique($resultado, SORT_REGULAR));

echo json_encode($resultado, JSON_UNESCAPED_UNICODE);
