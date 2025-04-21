<?php
// catastro-refcat.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$nombreVia = isset($_GET['nombreVia']) ? urlencode($_GET['nombreVia']) : '';
$numero = isset($_GET['numero']) ? urlencode($_GET['numero']) : '';

if (!$nombreVia || !$numero) {
  echo json_encode(['error' => 'Faltan parámetros']);
  exit;
}

$url = "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/Consulta_DNP?Provincia=MURCIA&Municipio=MURCIA&TipoVia=CALLE&NombreVia=$nombreVia&PrimerNumero=$numero";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0');
$response = curl_exec($ch);

if (curl_errno($ch)) {
  echo json_encode(['error' => 'Error al conectar con el Catastro']);
  curl_close($ch);
  exit;
}

curl_close($ch);
$data = json_decode($response, true);

$registros = $data['consulta_dnp_resultado']['lrcdnp']['rcdnp'] ?? [];

if (!$registros) {
  echo json_encode(['error' => 'No se encontraron resultados']);
  exit;
}

$referencias = array_map(function($r) {
  return [
    'refcat' => ($r['pc1'] ?? '') . ($r['pc2'] ?? ''),
    'direccion' => ($r['ldt'] ?? '')
  ];
}, $registros);

echo json_encode($referencias);
