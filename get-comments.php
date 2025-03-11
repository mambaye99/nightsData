<?php
// Abilita gli errori per il debug
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Consenti richieste da qualsiasi origine (per test - da modificare in produzione)
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// File JSON dove sono salvati i commenti
$commentsFile = 'comments.json';

try {
    // Carica commenti esistenti
    if (file_exists($commentsFile)) {
        $comments = json_decode(file_get_contents($commentsFile), true);
        if (!is_array($comments)) {
            $comments = [];
        }
    } else {
        $comments = [];
    }

    // Rispondi con i commenti
    echo json_encode($comments);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Errore del server: ' . $e->getMessage()]);
}
?>