<?php
header("Content-Type: application/json");

function log_error($mensaje) {
    $fecha = date('Y-m-d H:i:s');
    file_put_contents(__DIR__ . "/catastro_error.log", "[$fecha] $mensaje\n", FILE_APPEND);
}

// Parámetros
$via = $_GET['via'] ?? null;
$numero = $_GET['numero'] ?? null;
$codigo = $_GET['codigo'] ?? null;
$refcat = $_GET['refcat'] ?? null;

$cmd = "python3 catastro.py";
$cache_key = "";

// Construimos el comando y la clave de caché
if ($refcat) {
    $cmd .= " --refcat " . escapeshellarg($refcat);
    $cache_key = "refcat_" . $refcat;
} elseif ($via && $numero && $codigo) {
    $cmd .= " --via " . escapeshellarg($via)
         . " --numero " . escapeshellarg($numero)
         . " --codigo " . escapeshellarg($codigo);
    $cache_key = "via_" . $via . "_num_" . $numero . "_codigo_" . $codigo;
} else {
    $msg = "❌ Faltan parámetros: via=$via, numero=$numero, codigo=$codigo, refcat=$refcat";
    log_error($msg);
    echo json_encode(["error" => "Faltan parámetros"]);
    exit;
}

// Crear carpeta de caché si no existe
$cache_dir = __DIR__ . "/cache";
if (!is_dir($cache_dir)) {
    mkdir($cache_dir, 0775, true);
}

$cache_file = $cache_dir . "/" . md5($cache_key) . ".json";

// Si existe en caché, lo devolvemos
if (file_exists($cache_file)) {
    echo file_get_contents($cache_file);
    exit;
}

// Ejecutar Python si no hay caché
exec($cmd . " 2>&1", $output, $status);

if ($status !== 0) {
    log_error("❌ Error al ejecutar: $cmd\nSalida: " . implode("\n", $output));
    echo json_encode(["error" => "Error ejecutando el script Python"]);
    exit;
}

// Guardar resultado en caché y devolver
file_put_contents($cache_file, implode("\n", $output));
echo implode("\n", $output);
