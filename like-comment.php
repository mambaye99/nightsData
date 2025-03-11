<?php
// Abilita gli errori per il debug
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Consenti richieste da qualsiasi origine (per test - da modificare in produzione)
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// Verifica che sia una richiesta POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Metodo non consentito']);
    exit;
}

// File JSON dove sono salvati i commenti
$commentsFile = 'comments.json';

try {
    // Leggi i dati inviati
    $data = json_decode(file_get_contents('php://input'), true);

    // Verifica i dati
    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'ID commento mancante']);
        exit;
    }

    $commentId = $data['id'];

    // Carica commenti esistenti
    if (file_exists($commentsFile)) {
        $comments = json_decode(file_get_contents($commentsFile), true);
        if (!is_array($comments)) {
            $comments = [];
        }
    } else {
        $comments = [];
    }

    // Trova il commento e incrementa i like
    $found = false;
    foreach ($comments as &$comment) {
        if ($comment['id'] === $commentId) {
            $comment['likes'] = ($comment['likes'] ?? 0) + 1;
            $found = true;
            break;
        }
    }

    if (!$found) {
        http_response_code(404);
        echo json_encode(['error' => 'Commento non trovato']);
        exit;
    }

    // Salva nel file
    file_put_contents($commentsFile, json_encode($comments, JSON_PRETTY_PRINT));

    // Rispondi con successo
    echo json_encode(['success' => true]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Errore del server: ' . $e->getMessage()]);
}
?>