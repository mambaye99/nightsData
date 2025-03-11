// Gestione commenti rudimentale
document.addEventListener('DOMContentLoaded', function() {
    const commentForm = document.getElementById('comment-form');
    const commentsContainer = document.getElementById('comments-container');
    
    // Carica commenti
    function loadComments() {
        if (!commentsContainer) return;
        
        // Mostra un indicatore di caricamento
        commentsContainer.innerHTML = '<p class="loading">Caricamento commenti...</p>';
        
        // Recupera i commenti dal server
        fetch('get-comments.php')
            .then(response => response.json())
            .then(comments => {
                // Svuota il contenitore
                commentsContainer.innerHTML = '';
                
                // Se non ci sono commenti, mostra un messaggio
                if (!comments || comments.length === 0) {
                    const noComments = document.createElement('p');
                    noComments.classList.add('no-comments');
                    
                    // Supporto multilingua
                    const currentLang = localStorage.getItem('preferredLanguage') || 'it';
                    noComments.textContent = currentLang === 'en' ? 
                        'No comments yet. Be the first to comment!' : 
                        'Nessun commento. Sii il primo a commentare!';
                    
                    commentsContainer.appendChild(noComments);
                    return;
                }
                
                // Visualizza i commenti
                comments.forEach(comment => {
                    const commentEl = createCommentElement(comment);
                    commentsContainer.appendChild(commentEl);
                });
                
                // Aggiungi handler per i pulsanti "Mi piace"
                document.querySelectorAll('.like-button').forEach(button => {
                    button.addEventListener('click', handleLike);
                });
            })
            .catch(error => {
                console.error('Errore caricamento commenti:', error);
                commentsContainer.innerHTML = `<p class="error">Errore caricamento commenti. Riprova.</p>`;
            });
    }
    
    // Crea elemento commento HTML
    function createCommentElement(comment) {
        const commentEl = document.createElement('div');
        commentEl.classList.add('comment');
        commentEl.dataset.id = comment.id;
        
        // Formatta la data
        const date = new Date(comment.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + 
                            date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Determina lingua
        const currentLang = localStorage.getItem('preferredLanguage') || 'it';
        const likeText = currentLang === 'en' ? 'Like' : 'Mi piace';
        
        // HTML commento
        commentEl.innerHTML = `
            <div class="comment-header">
                <strong class="comment-author">${comment.name}</strong>
                <span class="comment-date">${formattedDate}</span>
            </div>
            <div class="comment-body">
                <p>${comment.text}</p>
            </div>
            <div class="comment-footer">
                <button class="like-button" data-id="${comment.id}">
                    ${likeText} (${comment.likes || 0})
                </button>
            </div>
        `;
        
        return commentEl;
    }
    
    // Gestisce click sul pulsante "Mi piace"
    function handleLike(e) {
        const commentId = e.currentTarget.dataset.id;
        
        // Invia richiesta di incremento like al server
        fetch('like-comment.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: commentId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Ricarica commenti per mostrare il like aggiornato
                loadComments();
            }
        })
        .catch(error => {
            console.error('Errore durante l\'aggiunta del like:', error);
        });
    }
    
    // Gestisce l'invio di un nuovo commento
    if (commentForm) {
        commentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const nameInput = document.getElementById('comment-name');
            const textInput = document.getElementById('comment-text');
            
            const name = nameInput.value.trim();
            const text = textInput.value.trim();
            
            if (name && text) {
                // Disabilita il form durante l'invio
                const submitButton = commentForm.querySelector('button[type="submit"]');
                submitButton.disabled = true;
                submitButton.textContent = '...';
                
                // Invia commento al server
                fetch('save-comment.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name, text })
                })
                .then(response => response.json())
                .then(data => {
                    // Riabilita il form
                    submitButton.disabled = false;
                    submitButton.textContent = localStorage.getItem('preferredLanguage') === 'en' ? 
                        'Post comment' : 'Invia commento';
                    
                    if (data.success) {
                        // Resetta il form
                        commentForm.reset();
                        
                        // Ricarica i commenti
                        loadComments();
                    } else if (data.error) {
                        alert('Errore: ' + data.error);
                    }
                })
                .catch(error => {
                    console.error('Errore durante l\'invio del commento:', error);
                    submitButton.disabled = false;
                    submitButton.textContent = localStorage.getItem('preferredLanguage') === 'en' ? 
                        'Post comment' : 'Invia commento';
                    alert('Errore durante l\'invio del commento. Riprova.');
                });
            }
        });
    }
    
    // Carica i commenti all'avvio
    loadComments();
});