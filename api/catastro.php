<?php
header('Content-Type: application/json');

// Obtener parámetros
$via = isset($_GET['via']) ? escapeshellarg($_GET['via']) : null;
$numero = isset($_GET['numero']) ? escapeshellarg($_GET['numero']) : null;
$sigla = isset($_GET['sigla']) ? escapeshellarg($_GET['sigla']) : null;
$refcat = isset($_GET['refcat']) ? escapeshellarg($_GET['refcat']) : null;

// Construir el comando de ejecución
$cmd = "python3 catastro.py";

// Si tenemos refcat, lo pasamos como argumento único
if ($refcat) {
    $cmd .= " --refcat $refcat";
} elseif ($via && $numero && $sigla) {
    $cmd .= " --via $via --numero $numero --sigla $sigla";
} else {
    echo json_encode(["error" => "Faltan parámetros obligatorios."]);
    exit;
}

// Ejecutar y capturar la salida
exec($cmd, $output, $return_code);

if ($return_code !== 0) {
    echo json_encode(["error" => "Error al ejecutar catastro.py", "codigo" => $return_code]);
    exit;
}

// Unir salida y convertir en JSON
$resultado = implode("\n", $output);
echo $resultado;
