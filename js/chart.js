// Configurazione globale di Chart.js
Chart.defaults.color = '#adb5bd';
Chart.defaults.font.family = "'Segoe UI', 'Helvetica Neue', 'Arial', sans-serif";

// Classe per gestire il dataset e la visualizzazione
class DatasetVisualizer {
    constructor() {
        this.originalData = [];
        this.processedData = [];
        this.chart = null;
        this.currentMonth = 'all';
        
        // Riferimenti agli elementi DOM
        this.chartElement = document.getElementById('dataChart');
        this.monthFilter = document.getElementById('month-filter');
        
        // Debug
        console.log('Elemento chart:', this.chartElement);
        console.log('Elemento select mesi:', this.monthFilter);
        
        // Event listeners
        if (this.monthFilter) {
            this.monthFilter.addEventListener('change', this.handleMonthFilter.bind(this));
            console.log('Event listener aggiunto al filtro mesi');
        } else {
            console.error('Elemento select per i mesi non trovato!');
        }
        
        // Inizializzazione
        this.loadData();
    }
    
    // Carica il dataset o usa dati di esempio
    async loadData() {
        try {
            console.log('Tentativo di caricamento dati...');
            
            // Dati di esempio integrati - usiamo questi come fallback se il caricamento del CSV fallisce
            const sampleData = [
                { giorno: "2023-01-02", orario: 9.30 },
                { giorno: "2023-01-03", orario: 10.15 },
                { giorno: "2023-01-04", orario: 9.45 },
                { giorno: "2023-01-05", orario: 10.00 },
                { giorno: "2023-01-09", orario: 9.25 },
                { giorno: "2023-01-10", orario: 9.45 },
                { giorno: "2023-01-12", orario: 10.30 },
                { giorno: "2023-01-16", orario: 9.15 },
                { giorno: "2023-01-17", orario: 9.30 },
                { giorno: "2023-01-18", orario: 9.45 },
                { giorno: "2023-01-19", orario: 10.00 },
                { giorno: "2023-01-20", orario: 10.15 },
                { giorno: "2023-01-23", orario: 9.30 },
                { giorno: "2023-01-24", orario: 9.45 },
                { giorno: "2023-01-26", orario: 10.30 },
                { giorno: "2023-01-27", orario: 10.45 },
                { giorno: "2023-01-30", orario: 9.15 },
                { giorno: "2023-01-31", orario: 9.30 }
            ];

            // Prima proviamo a caricare il file CSV
            try {
                const response = await fetch('data/dataset.csv');
                
                if (!response.ok) {
                    throw new Error(`Errore nel caricamento del dataset: ${response.status} ${response.statusText}`);
                }
                
                const csvData = await response.text();
                console.log('Dati CSV caricati:', csvData.substring(0, 100) + '...');
                
                if (!csvData || csvData.trim() === '') {
                    throw new Error('Il file CSV sembra vuoto');
                }
                
                // Utilizzo di PapaParse per il parsing del CSV
                Papa.parse(csvData, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        console.log('Risultati del parsing:', results);
                        
                        if (!results.data || results.data.length === 0) {
                            console.warn('Nessun dato valido trovato nel CSV, uso dati di esempio');
                            this.processData(sampleData);
                            return;
                        }
                        
                        if (!results.meta.fields.includes('giorno') || !results.meta.fields.includes('orario')) {
                            console.warn('Il CSV non contiene le colonne richieste, uso dati di esempio');
                            this.processData(sampleData);
                            return;
                        }
                        
                        this.processData(results.data);
                    },
                    error: (error) => {
                        console.error('Errore durante il parsing del CSV:', error);
                        console.log('Utilizzo dati di esempio come fallback');
                        this.processData(sampleData);
                    }
                });
            } catch (error) {
                console.error('Errore durante il caricamento del dataset:', error);
                console.log('Utilizzo dati di esempio come fallback');
                this.processData(sampleData);
            }
        } catch (error) {
            console.error('Errore generale:', error);
            this.showError(`Impossibile inizializzare la visualizzazione: ${error.message}`);
        }
    }
    
    // Processa i dati grezzi
    processData(rawData) {
        // Assume che il CSV abbia colonne 'giorno' e 'orario'
        this.originalData = rawData.map(row => {
            return {
                date: new Date(row.giorno),
                time: parseFloat(row.orario),
                isOriginal: true
            };
        }).filter(item => item.time !== null && !isNaN(item.time) && !isNaN(item.date.getTime()));
        
        // Ordina per data
        this.originalData.sort((a, b) => a.date - b.date);
        
        // Stima i valori mancanti (esclusi i weekend)
        this.processedData = this.estimateMissingValues(this.originalData);
        
        // Aggiorna il menu dei mesi con solo i mesi disponibili nel dataset
        this.updateMonthsFilter();
        
        // Inizializza il grafico
        this.initChart();
    }
    
    // Aggiorna il filtro dei mesi per mostrare solo i mesi disponibili nei dati
    updateMonthsFilter() {
        if (!this.monthFilter) {
            console.error('Elemento select per i mesi non trovato!');
            return;
        }
        
        console.log('Aggiornamento filtro mesi...');
        
        // Raccogli tutti i mesi unici presenti nel dataset
        const availableMonths = new Set();
        this.processedData.forEach(item => {
            const monthIndex = item.date.getMonth();
            const year = item.date.getFullYear();
            availableMonths.add(`${year}-${monthIndex}`);
        });
        
        console.log('Mesi disponibili:', availableMonths);
        
        // Cancella le opzioni precedenti, tranne "Tutti i mesi"
        while (this.monthFilter.options.length > 1) {
            this.monthFilter.remove(1);
        }
        
        // Aggiungi solo i mesi disponibili
        const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                           'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
        
        // Converti in array e ordina
        const sortedMonths = Array.from(availableMonths).sort();
        console.log('Mesi ordinati:', sortedMonths);
        
        // Aggiungi le nuove opzioni
        sortedMonths.forEach(yearMonth => {
            const [year, month] = yearMonth.split('-').map(Number);
            const option = document.createElement('option');
            option.value = yearMonth;  // Usa il formato "YYYY-MM"
            option.textContent = `${monthNames[month]} ${year}`;
            this.monthFilter.appendChild(option);
            console.log(`Aggiunto mese: ${monthNames[month]} ${year}, valore: ${yearMonth}`);
        });
        
        // Verifica che ci siano opzioni
        console.log('Opzioni dopo aggiornamento:', this.monthFilter.options.length);
    }
    
    // Stima i valori mancanti, escludendo i weekend
    estimateMissingValues(data) {
        if (data.length === 0) return [];
        
        const processedData = [...data];
        const firstDate = new Date(data[0].date);
        const lastDate = new Date(data[data.length - 1].date);
        
        const allDates = [];
        const currentDate = new Date(firstDate);
        
        // Genera tutte le date nel range (esclusi i weekend)
        while (currentDate <= lastDate) {
            const dayOfWeek = currentDate.getDay();
            
            // Salta weekend (0 = domenica, 6 = sabato)
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                allDates.push(new Date(currentDate));
            }
            
            // Avanza al giorno successivo
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Mappa per accesso rapido ai dati originali per data
        const dateMap = new Map();
        processedData.forEach(item => {
            dateMap.set(item.date.toISOString().split('T')[0], item);
        });
        
        // Trova e stima i valori mancanti
        const result = [];
        
        for (const date of allDates) {
            const dateKey = date.toISOString().split('T')[0];
            
            if (dateMap.has(dateKey)) {
                // Usa il valore originale
                result.push(dateMap.get(dateKey));
            } else {
                // Stima il valore mancante
                const estimatedValue = this.estimateValue(date, processedData);
                result.push({
                    date: new Date(date),
                    time: estimatedValue,
                    isOriginal: false
                });
            }
        }
        
        return result;
    }
    
    // Stima un valore mancante basato sui valori vicini
    estimateValue(date, data) {
        // Cerca valori più vicini (prima e dopo la data mancante)
        let prevValue = null;
        let nextValue = null;
        
        let minPrevDiff = Infinity;
        let minNextDiff = Infinity;
        
        for (const item of data) {
            const diff = date - item.date;
            
            if (diff > 0 && diff < minPrevDiff) {
                minPrevDiff = diff;
                prevValue = item.time;
            } else if (diff < 0 && Math.abs(diff) < minNextDiff) {
                minNextDiff = Math.abs(diff);
                nextValue = item.time;
            }
        }
        
        // Se abbiamo entrambi i valori, calcoliamo la media
        if (prevValue !== null && nextValue !== null) {
            return (prevValue + nextValue) / 2;
        }
        
        // Altrimenti usiamo il valore disponibile o un valore di default
        return prevValue !== null ? prevValue : (nextValue !== null ? nextValue : 0);
    }
    
    // Calcola la deviazione standard
    calculateStdDev(data) {
        const values = data.map(item => item.time);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
        return Math.sqrt(variance);
    }
    
    // Calcola le bande di deviazione standard mobile
    calculateRollingStdDev(data, windowSize) {
        const upper = [];
        const lower = [];
        
        for (let i = 0; i < data.length; i++) {
            // Definisci la finestra di dati centrata nel punto i
            const halfWindow = Math.floor(windowSize / 2);
            const start = Math.max(0, i - halfWindow);
            const end = Math.min(data.length - 1, i + halfWindow);
            const windowData = data.slice(start, end + 1);
            
            // Calcola media nella finestra
            const sum = windowData.reduce((acc, val) => acc + val, 0);
            const mean = sum / windowData.length;
            
            // Calcola deviazione standard nella finestra
            const squaredDiffs = windowData.map(val => Math.pow(val - mean, 2));
            const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / windowData.length;
            const stdDev = Math.sqrt(variance);
            
            // Applica la deviazione standard al punto attuale (non alla media)
            upper.push(data[i] + stdDev);
            lower.push(data[i] - stdDev);
        }
        
        return { upper, lower };
    }
    
    // Inizializza il grafico Chart.js
    initChart() {
        // Contenitore canvas per il grafico
        const ctx = this.chartElement.getContext('2d');
        
        // Prepara i dati filtrati
        const filteredData = this.getFilteredData();
        
        // Prepara i dataset per Chart.js
        const dataPoints = [];  // Per tutti i punti (originali e stimati)
        const pointColors = []; // Colore per ogni punto
        const labels = [];
        
        // Raccogliamo tutti i valori per il calcolo statistico
        const allTimes = filteredData.map(item => item.time);
        
        filteredData.forEach(item => {
            const formattedDate = this.formatDate(item.date);
            labels.push(formattedDate);
            dataPoints.push(item.time);
            
            // Colore rosso per i punti stimati, blu per gli originali
            pointColors.push(item.isOriginal ? '#0d6efd' : '#dc3545');
        });
        
        // Calcola le bande di deviazione standard dinamica per ogni punto
        const stdDevBands = this.calculateRollingStdDev(allTimes, 5); // Finestra di 5 punti
        
        // Configurazione del grafico
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Orario',
                        data: dataPoints,
                        borderColor: '#0d6efd',
                        tension: 0.4,
                        borderWidth: 2,
                        fill: false,
                        pointBackgroundColor: pointColors,
                        pointBorderColor: pointColors,
                        pointRadius: function(context) {
                            const index = context.dataIndex;
                            return filteredData[index].isOriginal ? 5 : 5;
                        },
                        pointHoverRadius: 7,
                        spanGaps: true // Importante: collega i punti anche con valori mancanti
                    },
                    {
                        label: 'Limite superiore dev. std.',
                        data: stdDevBands.upper,
                        borderColor: 'rgba(13, 110, 253, 0.3)',
                        backgroundColor: 'rgba(13, 110, 253, 0)',
                        borderWidth: 1,
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'Limite inferiore dev. std.',
                        data: stdDevBands.lower,
                        borderColor: 'rgba(13, 110, 253, 0.3)',
                        backgroundColor: 'rgba(13, 110, 253, 0.2)',
                        borderWidth: 1,
                        pointRadius: 0,
                        fill: 1 // Riempi tra questo dataset e quello sopra
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Dati giornalieri con stime e deviazione standard',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: (context) => {
                                return `Data: ${context[0].label}`;
                            },
                            label: (context) => {
                                if (context.datasetIndex === 0) {
                                    const index = context.dataIndex;
                                    const isOriginal = filteredData[index].isOriginal;
                                    const tipo = isOriginal ? "originale" : "stimato";
                                    return `Orario (${tipo}): ${context.raw.toFixed(2)}`;
                                } else if (context.datasetIndex === 1) {
                                    return `Limite superiore dev. std.: ${context.raw.toFixed(2)}`;
                                } else if (context.datasetIndex === 2) {
                                    return `Limite inferiore dev. std.: ${context.raw.toFixed(2)}`;
                                }
                                return '';
                            }
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Orario'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }
    
    // Aggiorna il grafico con nuovi dati filtrati
    updateChart() {
        if (!this.chart) {
            console.error('Chart non inizializzato');
            return;
        }
        
        // Distruggi il grafico esistente
        this.chart.destroy();
        
        // Crea un nuovo grafico con i dati filtrati
        try {
            this.initChart();
            console.log('Grafico aggiornato con filtro mese:', this.currentMonth);
        } catch (error) {
            console.error('Errore durante l\'aggiornamento del grafico:', error);
            this.showError('Errore durante l\'aggiornamento del grafico');
        }
    }
    
    // Gestisce il cambio di filtro del mese
    handleMonthFilter(event) {
        console.log('Cambio filtro mese:', event.target.value);
        this.currentMonth = event.target.value;
        this.updateChart();
    }
    
    // Ottieni i dati filtrati per il mese corrente
    getFilteredData() {
        if (this.currentMonth === 'all') {
            return this.processedData;
        }
        
        // Il nuovo formato è "YYYY-MM"
        const [year, month] = this.currentMonth.split('-').map(Number);
        
        return this.processedData.filter(item => {
            return item.date.getFullYear() === year && item.date.getMonth() === month;
        });
    }
    
    // Formatta una data per la visualizzazione
    formatDate(date) {
        return new Date(date).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit'
        });
    }
    
    // Mostra un messaggio di errore
    showError(message) {
        console.error('ERRORE VISUALIZZAZIONE:', message);
        
        // Verifica che l'elemento chart esista
        if (!this.chartElement) {
            console.error('Elemento canvas non trovato!');
            return;
        }
        
        this.chartElement.style.display = 'none';
        
        // Controlla se esiste già un messaggio di errore
        const existingError = this.chartElement.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.textContent = message;
            return;
        }
        
        const errorElement = document.createElement('div');
        errorElement.classList.add('error-message');
        errorElement.style.backgroundColor = 'rgba(220, 53, 69, 0.2)'; 
        errorElement.style.color = '#fff';
        errorElement.style.padding = '15px';
        errorElement.style.borderRadius = '5px';
        errorElement.style.marginTop = '10px';
        errorElement.style.textAlign = 'center';
        errorElement.textContent = message;
        
        this.chartElement.parentNode.appendChild(errorElement);
    }
}

// Inizializza la visualizzazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', () => {
    new DatasetVisualizer();
});