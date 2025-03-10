// Classe per gestire la sezione citazioni
class QuotesManager {
    constructor() {
        // Citazioni iniziali (puoi aggiungerne di più o caricarle da un file JSON)
        this.quotes = [
            {
                text: "La curiosità è la cosa più preziosa che abbiamo.",
                author: "Albert Einstein"
            },
            {
                text: "La misura dell'intelligenza è data dalla capacità di cambiare quando è necessario.",
                author: "Albert Einstein"
            },
            {
                text: "L'immaginazione è più importante della conoscenza.",
                author: "Albert Einstein"
            },
            {
                text: "La logica ti porta da A a B. L'immaginazione ti porta dappertutto.",
                author: "Albert Einstein"
            }
        ];
        
        // Elementi DOM
        this.quotesContainer = document.getElementById('quotes-container');
        this.quoteForm = document.getElementById('quote-form');
        
        // Inizializzazione
        this.init();
    }
    
    // Inizializzazione
    init() {
        // Visualizza le citazioni
        this.renderQuotes();
        
        // Aggiungi listener per il form (se presente)
        if (this.quoteForm) {
            this.quoteForm.addEventListener('submit', this.handleSubmit.bind(this));
        }
    }
    
    // Renderizza le citazioni nel container
    renderQuotes() {
        if (!this.quotesContainer) return;
        
        // Svuota il container
        this.quotesContainer.innerHTML = '';
        
        // Aggiungi ogni citazione
        this.quotes.forEach(quote => {
            const quoteElement = this.createQuoteElement(quote);
            this.quotesContainer.appendChild(quoteElement);
        });
    }
    
    // Crea un elemento HTML per una citazione
    createQuoteElement(quote) {
        const quoteCard = document.createElement('div');
        quoteCard.classList.add('quote-card');
        
        const quoteText = document.createElement('p');
        quoteText.classList.add('quote-text');
        quoteText.textContent = `"${quote.text}"`;
        
        const quoteAuthor = document.createElement('p');
        quoteAuthor.classList.add('quote-author');
        quoteAuthor.textContent = `— ${quote.author}`;
        
        quoteCard.appendChild(quoteText);
        quoteCard.appendChild(quoteAuthor);
        
        return quoteCard;
    }
    
    // Gestisce l'invio del form per aggiungere una nuova citazione
    handleSubmit(event) {
        event.preventDefault();
        
        const quoteText = document.getElementById('quote-text').value.trim();
        const quoteAuthor = document.getElementById('quote-author').value.trim();
        
        if (!quoteText || !quoteAuthor) return;
        
        // Aggiungi la nuova citazione
        this.quotes.push({
            text: quoteText,
            author: quoteAuthor
        });
        
        // Aggiorna la visualizzazione
        this.renderQuotes();
        
        // Resetta il form
        this.quoteForm.reset();
        
        // Salva le citazioni (opzionale, richiede backend o localStorage)
        this.saveQuotes();
    }
    
    // Salva le citazioni (questa è solo una dimostrazione con localStorage)
    saveQuotes() {
        // In un'implementazione reale, qui potresti fare una chiamata API
        // per salvare le citazioni su un server
        try {
            localStorage.setItem('quotes', JSON.stringify(this.quotes));
        } catch (error) {
            console.error('Errore nel salvataggio delle citazioni:', error);
        }
    }
    
    // Carica le citazioni (questa è solo una dimostrazione con localStorage)
    loadQuotes() {
        try {
            const savedQuotes = localStorage.getItem('quotes');
            if (savedQuotes) {
                this.quotes = JSON.parse(savedQuotes);
                this.renderQuotes();
            }
        } catch (error) {
            console.error('Errore nel caricamento delle citazioni:', error);
        }
    }
}

// Inizializza il gestore delle citazioni quando il DOM è caricato
document.addEventListener('DOMContentLoaded', () => {
    const quotesManager = new QuotesManager();
    
    // Opzionale: carica le citazioni salvate (se disponibili)
    quotesManager.loadQuotes();
});