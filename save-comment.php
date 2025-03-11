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

// File JSON dove salviamo i commenti
$commentsFile = 'comments.json';

try {
    // Leggi i dati inviati
    $data = json_decode(file_get_contents('php://input'), true);

    // Verifica i dati
    if (empty($data['name']) || empty($data['text'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Dati mancanti']);
        exit;
    }

    // Sanitizza i dati
    $name = htmlspecialchars(trim($data['name']));
    $text = htmlspecialchars(trim($data['text']));

    // Crea oggetto commento
    $comment = [
        'id' => uniqid(),
        'name' => $name,
        'text' => $text,
        'timestamp' => time() * 1000, // Millisecondi per compatibilità con JavaScript
        'likes' => 0
    ];

    // Carica commenti esistenti
    if (file_exists($commentsFile)) {
        $comments = json_decode(file_get_contents($commentsFile), true);
        if (!is_array($comments)) {
            $comments = [];
        }
    } else {
        $comments = [];
    }

    // Aggiungi il nuovo commento
    array_unshift($comments, $comment); // Aggiungi all'inizio (più recenti in cima)

    // Salva nel file
    file_put_contents($commentsFile, json_encode($comments, JSON_PRETTY_PRINT));

    // Rispondi con successo
    echo json_encode(['success' => true, 'comment' => $comment]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Errore del server: ' . $e->getMessage()]);
}
?>