<?php
// detalle-catastro.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$refcat = isset($_GET['refcat']) ? $_GET['refcat'] : '';

if (!$refcat) {
  echo json_encode(['error' => 'Falta la referencia catastral']);
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
  echo json_encode(['error' => 'Error al conectar con el Catastro']);
  curl_close($ch);
  exit;
}

curl_close($ch);
$data = json_decode($response, true);

$registro = $data['consulta_dnprcResult']['lrcdnp']['rcdnp'][0] ?? null;

if (!$registro) {
  echo json_encode(['error' => 'No se encontraron datos']);
  exit;
}

$dir = $registro['dt']['locs']['lous']['lourb']['dir'] ?? null;
$direccion = $dir ? trim(($dir['tv'] ?? '') . ' ' . ($dir['nv'] ?? '') . ' ' . ($dir['pnp'] ?? '')) : null;

$resultado = [
  'referenciaCatastral' => $refcat,
  'localizacion' => $direccion,
  'usoPrincipal' => $registro['debi']['luso'] ?? null,
  'superficieConstruida' => $registro['debi']['sfc'] ?? null,
  'anoConstruccion' => $registro['debi']['ant'] ?? null,
  'claseUrbano' => $registro['debi']['ucl'] ?? null
];

echo json_encode($resultado);
