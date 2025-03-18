// Classe per la visualizzazione delle statistiche
class StatsVisualizer {
    constructor() {
        // Proprietà dei grafici
        this.namesChart = null;
        this.timeDistributionChart = null;
        this.currentMonth = 'all';
        this.originalData = [];
        
        // Riferimenti agli elementi DOM
        this.namesChartElement = document.getElementById('namesChart');
        this.timeDistributionChartElement = document.getElementById('timeDistributionChart');
        this.monthFilter = document.getElementById('stats-month-filter');
        
        // Verifiche iniziali
        console.log('Inizializzazione StatsVisualizer...');
        if (!this.namesChartElement || !this.timeDistributionChartElement) {
            console.error('Elementi canvas per i grafici non trovati!');
            return;
        }
        
        if (!this.monthFilter) {
            console.error('Elemento select per il filtro mesi non trovato!');
            return;
        }
        
        // Event listener per il cambio di mese
        this.monthFilter.addEventListener('change', this.handleMonthFilter.bind(this));
        
        // Carica il dataset
        this.loadData();
    }
    
    // Caricamento dati
    async loadData() {
        try {
            console.log('Tentativo di caricamento dati statistiche...');
            
            // Dati di esempio integrati - usiamo questi come fallback se il caricamento del CSV fallisce
            const sampleData = [
                { nome: "Davide Da Bari", data: "18/03/25", orario: "09:25" },
                { nome: "Pietro D", data: "18/03/25", orario: "09:28" },
                { nome: "Luca Nights", data: "18/03/25", orario: "09:51" },
                { nome: "mister", data: "18/03/25", orario: "09:52" },
                { nome: "Jacob", data: "18/03/25", orario: "11:44" },
                { nome: "Gringo", data: "18/03/25", orario: "11:49" },
                { nome: "Emi", data: "18/03/25", orario: "11:53" },
                { nome: "Joanathan", data: "18/03/25", orario: "12:13" },
                { nome: "mister", data: "18/03/25", orario: "13:47" },
                { nome: "Jacob", data: "18/03/25", orario: "14:06" },
                { nome: "Edo", data: "18/03/25", orario: "14:13" },
                { nome: "Emi", data: "18/03/25", orario: "14:28" },
                { nome: "Pietro D", data: "18/03/25", orario: "14:56" },
                { nome: "Gringo", data: "18/03/25", orario: "15:09" },
                { nome: "Emi", data: "18/03/25", orario: "17:43" },
                { nome: "Gringo", data: "18/03/25", orario: "17:51" }
            ];
            
            // Prima proviamo a caricare il file CSV
            try {
                const response = await fetch('data/statistiche.csv');
                
                if (!response.ok) {
                    throw new Error(`Errore nel caricamento del dataset: ${response.status} ${response.statusText}`);
                }
                
                const csvData = await response.text();
                console.log('Dati CSV statistiche caricati:', csvData.substring(0, 100) + '...');
                
                if (!csvData || csvData.trim() === '') {
                    throw new Error('Il file CSV sembra vuoto');
                }
                
                // Utilizzo di PapaParse per il parsing del CSV
                Papa.parse(csvData, {
                    header: true,
                    skipEmptyLines: true,
                    delimiter: ',', // Modifica in base al separatore del tuo CSV
                    complete: (results) => {
                        console.log('Risultati del parsing statistiche:', results);
                        
                        if (!results.data || results.data.length === 0) {
                            console.warn('Nessun dato valido trovato nel CSV, uso dati di esempio');
                            this.processData(sampleData);
                            return;
                        }
                        
                        if (!results.meta.fields.includes('nome') || 
                            !results.meta.fields.includes('data') || 
                            !results.meta.fields.includes('orario')) {
                            console.warn('Il CSV non contiene le colonne richieste, uso dati di esempio');
                            this.processData(sampleData);
                            return;
                        }
                        
                        this.processData(results.data);
                    },
                    error: (error) => {
                        console.error('Errore durante il parsing del CSV statistiche:', error);
                        console.log('Utilizzo dati di esempio come fallback');
                        this.processData(sampleData);
                    }
                });
            } catch (error) {
                console.error('Errore durante il caricamento del dataset statistiche:', error);
                console.log('Utilizzo dati di esempio come fallback');
                this.processData(sampleData);
            }
        } catch (error) {
            console.error('Errore generale in StatsVisualizer:', error);
            this.showError(`Impossibile inizializzare la visualizzazione delle statistiche: ${error.message}`);
        }
    }
    
    // Processa i dati grezzi
    processData(rawData) {
        // Converti le date e gli orari in oggetti Date
        this.originalData = rawData.map(row => {
            try {
                // Estrai componenti della data (formato DD/MM/YY)
                const dateParts = row.data.split('/');
                if (dateParts.length !== 3) {
                    console.warn(`Formato data non valido: ${row.data}`);
                    return null;
                }
                
                // Converti orario (formato HH:MM)
                const timeParts = row.orario.split(':');
                if (timeParts.length !== 2) {
                    console.warn(`Formato orario non valido: ${row.orario}`);
                    return null;
                }
                
                // Costruisci oggetto Date
                // Assumiamo 20xx come prefisso dell'anno
                const year = dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2];
                const date = new Date(
                    parseInt(year),
                    parseInt(dateParts[1]) - 1,
                    parseInt(dateParts[0]),
                    parseInt(timeParts[0]),
                    parseInt(timeParts[1])
                );
                
                // Calcola la fascia oraria (da 9 a 19)
                const hour = date.getHours();
                const timeSlot = (hour >= 9 && hour <= 19) ? hour : null;
                
                return {
                    nome: row.nome.trim(),
                    date: date,
                    timeSlot: timeSlot
                };
            } catch (error) {
                console.error(`Errore nell'elaborazione della riga:`, row, error);
                return null;
            }
        }).filter(item => item !== null);
        
        // Aggiorna il menu dei mesi con solo i mesi disponibili nel dataset
        this.updateMonthsFilter();
        
        // Inizializza i grafici
        this.initCharts();
    }
    
    // Aggiorna il filtro dei mesi
    updateMonthsFilter() {
        if (!this.monthFilter) {
            console.error('Elemento select per il filtro mesi non trovato!');
            return;
        }
        
        console.log('Aggiornamento filtro mesi per statistiche...');
        
        // Raccogli tutti i mesi unici presenti nel dataset
        const availableMonths = new Set();
        this.originalData.forEach(item => {
            if (item.date) {
                const monthIndex = item.date.getMonth();
                const year = item.date.getFullYear();
                availableMonths.add(`${year}-${monthIndex}`);
            }
        });
        
        console.log('Mesi disponibili per statistiche:', availableMonths);
        
        // Cancella le opzioni precedenti, tranne "Tutti i mesi"
        while (this.monthFilter.options.length > 1) {
            this.monthFilter.remove(1);
        }
        
        // Aggiungi solo i mesi disponibili
        const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                           'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
        
        // Converti in array e ordina
        const sortedMonths = Array.from(availableMonths).sort();
        
        // Aggiungi le nuove opzioni
        sortedMonths.forEach(yearMonth => {
            const [year, month] = yearMonth.split('-').map(Number);
            const option = document.createElement('option');
            option.value = yearMonth;  // Usa il formato "YYYY-MM"
            option.textContent = `${monthNames[month]} ${year}`;
            this.monthFilter.appendChild(option);
        });
    }
    
    // Gestisce il cambio di filtro del mese
    handleMonthFilter(event) {
        console.log('Cambio filtro mese per statistiche:', event.target.value);
        this.currentMonth = event.target.value;
        
        // Assicuriamoci che il valore sia valido
        if (this.currentMonth !== 'all' && !this.currentMonth.includes('-')) {
            console.error('Formato mese non valido:', this.currentMonth);
            this.currentMonth = 'all'; // Fallback a tutti i mesi
        }
        
        // Aggiorna i grafici con il nuovo filtro
        this.updateCharts();
    }
    
    // Ottieni i dati filtrati per il mese corrente
    getFilteredData() {
        if (this.currentMonth === 'all') {
            return this.originalData;
        }
        
        try {
            // Il formato è "YYYY-MM"
            const [year, month] = this.currentMonth.split('-').map(Number);
            
            return this.originalData.filter(item => {
                return item.date && 
                       item.date.getFullYear() === year && 
                       item.date.getMonth() === month;
            });
        } catch (error) {
            console.error('Errore durante il filtraggio dei dati:', error);
            return this.originalData; // Fallback a tutti i dati
        }
    }
    
    // Aggiorna i grafici con nuovi dati filtrati
    updateCharts() {
        try {
            // Distruggi i grafici esistenti
            if (this.namesChart) {
                this.namesChart.destroy();
                this.namesChart = null;
            }
            
            if (this.timeDistributionChart) {
                this.timeDistributionChart.destroy();
                this.timeDistributionChart = null;
            }
            
            // Controlla se abbiamo dati per il periodo selezionato
            const filteredData = this.getFilteredData();
            if (!filteredData || filteredData.length === 0) {
                this.showError('Nessun dato disponibile per il periodo selezionato', this.namesChartElement);
                this.showError('Nessun dato disponibile per il periodo selezionato', this.timeDistributionChartElement);
                return;
            }
            
            // Crea nuovi grafici con i dati filtrati
            this.initCharts();
            console.log('Grafici statistiche aggiornati con filtro mese:', this.currentMonth);
        } catch (error) {
            console.error('Errore durante l\'aggiornamento dei grafici statistiche:', error);
            this.showError(`Errore durante l'aggiornamento dei grafici: ${error.message}`, this.namesChartElement);
            this.showError(`Errore durante l'aggiornamento dei grafici: ${error.message}`, this.timeDistributionChartElement);
        }
    }
    
    // Inizializza i grafici
    initCharts() {
        if (!this.namesChartElement || !this.timeDistributionChartElement) {
            console.error('Elementi canvas per i grafici non trovati!');
            return;
        }
        
        const filteredData = this.getFilteredData();
        if (filteredData.length === 0) {
            this.showError('Nessun dato disponibile', this.namesChartElement);
            this.showError('Nessun dato disponibile', this.timeDistributionChartElement);
            return;
        }
        
        // Inizializza il grafico dei nomi
        this.initNamesChart(filteredData);
        
        // Inizializza il grafico della distribuzione oraria
        this.initTimeDistributionChart(filteredData);
    }
    
    // Inizializza il grafico a barre orizzontali per la frequenza dei nomi
    initNamesChart(data) {
        // Conta le occorrenze di ciascun nome
        const nameCounts = {};
        data.forEach(item => {
            if (item.nome) {
                nameCounts[item.nome] = (nameCounts[item.nome] || 0) + 1;
            }
        });
        
        // Converti in array e ordina per conteggio (decrescente)
        const nameData = Object.entries(nameCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
        
        // Prepara i dati per Chart.js
        const labels = nameData.map(item => item.name);
        const counts = nameData.map(item => item.count);
        
        // Genera colori casuali ma visivamente piacevoli
        const colors = this.generateColors(labels.length);
        
        // Crea il grafico a barre orizzontali
        const ctx = this.namesChartElement.getContext('2d');
        this.namesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Frequenza',
                    data: counts,
                    backgroundColor: colors,
                    borderColor: colors.map(color => color.replace('0.7', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',  // Barre orizzontali
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Frequenza: ${context.raw}`
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Numero di occorrenze',
                            font: {
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            stepSize: 1
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Nome',
                            font: {
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Inizializza il grafico a barre per la distribuzione oraria
    initTimeDistributionChart(data) {
        // Prepara le fasce orarie da 9 a 19
        const timeSlots = Array.from({ length: 11 }, (_, i) => i + 9);
        
        // Conta le occorrenze per ciascuna fascia oraria
        const timeCounts = {};
        timeSlots.forEach(hour => {
            timeCounts[hour] = 0;
        });
        
        // Popola i conteggi
        data.forEach(item => {
            if (item.date) {
                const hour = item.date.getHours();
                if (hour >= 9 && hour <= 19) {
                    timeCounts[hour] = (timeCounts[hour] || 0) + 1;
                }
            }
        });
        
        // Prepara le etichette formattate (HH:00)
        const labels = timeSlots.map(hour => `${hour}:00`);
        
        // Prepara i dati per Chart.js
        const counts = timeSlots.map(hour => timeCounts[hour]);
        
        // Crea il grafico a barre verticali
        const ctx = this.timeDistributionChartElement.getContext('2d');
        this.timeDistributionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Frequenza',
                    data: counts,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Frequenza: ${context.raw}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Numero di occorrenze',
                            font: {
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Fascia oraria',
                            font: {
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Genera colori casuali ma visivamente piacevoli
    generateColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            // Usa colori pastello
            const hue = (i * 137.5) % 360;  // Distribuzione uniforme con golden angle
            colors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
        }
        return colors;
    }
    
// Mostra un messaggio di errore
showError(message, targetElement = null) {
    console.error('ERRORE VISUALIZZAZIONE STATISTICHE:', message);
    
    // Se non è specificato un elemento target, usa entrambi i container
    if (!targetElement) {
        this.showError(message, this.namesChartElement);
        this.showError(message, this.timeDistributionChartElement);
        return;
    }
    
    // Verifica che l'elemento target esista
    if (!targetElement) {
        console.error('Elemento target non trovato!');
        return;
    }
    
    targetElement.style.display = 'none';
    
    // Controlla se esiste già un messaggio di errore
    const existingError = targetElement.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.textContent = message;
        return;
    }
    
    const errorElement = document.createElement('div');
    errorElement.classList.add('error-message');
    errorElement.style.backgroundColor = 'rgba(220, 53, 69, 0.2)'; 
    errorElement.style.color = '#721c24';
    errorElement.style.padding = '15px';
    errorElement.style.borderRadius = '5px';
    errorElement.style.marginTop = '10px';
    errorElement.style.textAlign = 'center';
    errorElement.textContent = message;
    
    targetElement.parentNode.appendChild(errorElement);
}
}

// Inizializza l'evento per gestire l'attivazione del tab delle statistiche
document.addEventListener('DOMContentLoaded', function() {
// Inizializza il visualizzatore delle statistiche
window.statsVisualizer = new StatsVisualizer();

// Gestione dell'attivazione del tab
const statsTab = document.getElementById('stats-tab');
if (statsTab) {
    statsTab.addEventListener('click', function() {
        // Aggiorna i grafici quando il tab viene attivato
        // Questo è utile perché Chart.js può avere problemi con i grafici in container nascosti
        setTimeout(() => {
            if (window.statsVisualizer) {
                if (!window.statsVisualizer.namesChart || !window.statsVisualizer.timeDistributionChart) {
                    console.log('Inizializzazione grafici statistiche al cambio tab');
                    window.statsVisualizer.updateCharts();
                }
            }
        }, 100);
    });
}

// Supporto per la traduzione dei contenuti del tab
if (window.translatePage && typeof window.translatePage === 'function') {
    const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'data-current-lang') {
                // Aggiorna i grafici per applicare la nuova lingua
                if (window.statsVisualizer) {
                    window.statsVisualizer.updateCharts();
                }
            }
        }
    });
    
    // Osserva i cambiamenti di lingua nel documento
    observer.observe(document.body, { 
        attributes: true, 
        attributeFilter: ['data-current-lang'] 
    });
}
});