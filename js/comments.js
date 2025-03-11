// comments.js - Handles the comments functionality
document.addEventListener('DOMContentLoaded', function() {
    const commentForm = document.getElementById('comment-form');
    const commentsContainer = document.getElementById('comments-container');
    
    // Load existing comments
    loadComments();
    
    // Handle form submission
    if (commentForm) {
        commentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('comment-name').value.trim();
            const text = document.getElementById('comment-text').value.trim();
            const date = new Date();
            
            if (name && text) {
                // Create comment object
                const comment = {
                    name: name,
                    text: text,
                    date: date.toISOString(),
                    approved: true // In a real system, you might have approval workflow
                };
                
                // Save comment
                saveComment(comment);
                
                // Reset form
                commentForm.reset();
                
                // Reload comments
                loadComments();
            }
        });
    }
    
    function loadComments() {
        if (!commentsContainer) return;
        
        // Get comments from localStorage
        let comments = [];
        try {
            const savedComments = localStorage.getItem('siteComments');
            comments = savedComments ? JSON.parse(savedComments) : [];
        } catch (e) {
            console.error('Error loading comments:', e);
            comments = [];
        }
        
        // Clear container
        commentsContainer.innerHTML = '';
        
        if (comments.length === 0) {
            const noComments = document.createElement('p');
            noComments.classList.add('no-comments');
            noComments.setAttribute('data-lang-it', 'Nessun commento. Sii il primo a commentare!');
            noComments.setAttribute('data-lang-en', 'No comments yet. Be the first to comment!');
            noComments.textContent = document.documentElement.lang === 'en' ? 
                'No comments yet. Be the first to comment!' : 
                'Nessun commento. Sii il primo a commentare!';
            commentsContainer.appendChild(noComments);
            return;
        }
        
        // Sort comments newest first
        comments.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Add comments to container
        comments.forEach(comment => {
            const commentEl = createCommentElement(comment);
            commentsContainer.appendChild(commentEl);
        });
        
        // Apply current language
        const currentLang = localStorage.getItem('preferredLanguage') || 'it';
        const langElements = commentsContainer.querySelectorAll('[data-lang-it][data-lang-en]');
        langElements.forEach(el => {
            el.textContent = el.getAttribute(`data-lang-${currentLang}`);
        });
    }
    
    function createCommentElement(comment) {
        const commentEl = document.createElement('div');
        commentEl.classList.add('comment');
        
        const dateObj = new Date(comment.date);
        const formattedDate = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
        
        commentEl.innerHTML = `
            <div class="comment-header">
                <strong class="comment-author">${escapeHtml(comment.name)}</strong>
                <span class="comment-date">${formattedDate}</span>
            </div>
            <div class="comment-body">
                <p>${escapeHtml(comment.text)}</p>
            </div>
        `;
        
        return commentEl;
    }
    
    function saveComment(comment) {
        // Get existing comments
        let comments = [];
        try {
            const savedComments = localStorage.getItem('siteComments');
            comments = savedComments ? JSON.parse(savedComments) : [];
        } catch (e) {
            console.error('Error loading comments:', e);
            comments = [];
        }
        
        // Add new comment
        comments.push(comment);
        
        // Save back to localStorage
        localStorage.setItem('siteComments', JSON.stringify(comments));
    }
    
    // Helper function to prevent XSS
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});