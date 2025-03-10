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
                { giorno: "13/01/2025", orario: 17.23 },
                { giorno: "14/01/2025", orario: 17.01 },
                { giorno: "15/01/2025", orario: 17.52 },
                { giorno: "16/01/2025", orario: 17.37 },
                { giorno: "20/01/2025", orario: 17.50 },
                { giorno: "21/01/2025", orario: 17.21 }
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
                    dynamicTyping: false, // Manteniamo come stringhe per gestire il formato italiano
                    skipEmptyLines: true,
                    delimiter: ';', // Usa punto e virgola come separatore
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
        // Converti il formato italiano (DD/MM/YYYY e virgola come separatore decimale)
        this.originalData = rawData.map(row => {
            // Estrai le componenti della data nel formato DD/MM/YYYY
            const dateParts = row.giorno.split('/');
            if (dateParts.length !== 3) {
                console.warn(`Formato data non valido: ${row.giorno}`);
                return null;
            }
            
            // Crea data in formato corretto (anno, mese-1, giorno)
            const date = new Date(
                parseInt(dateParts[2]), // Anno
                parseInt(dateParts[1]) - 1, // Mese (0-11)
                parseInt(dateParts[0]) // Giorno
            );
            
            // Gestisci il valore orario (converte da formato italiano con virgola a float)
            let time = null;
            if (row.orario && row.orario.trim() !== '') {
                // Sostituisci la virgola con il punto per il parsing numerico
                time = parseFloat(row.orario.replace(',', '.'));
            }
            
            return {
                date: date,
                time: time,
                isOriginal: time !== null
            };
        }).filter(item => item !== null); // Rimuovi elementi nulli
        
        // Ordina per data
        this.originalData.sort((a, b) => a.date - b.date);
        
        // Aggiungi log per debug
        console.log('Dati originali processati:', this.originalData);
        
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
        
        console.log('Inizio stima valori mancanti...');
        
        // Crea una copia per risultati
        const result = [];
        
        // Mappa per lookup veloce dei dati esistenti
        const existingDataMap = new Map();
        data.forEach(item => {
            const dateStr = item.date.toISOString().split('T')[0];
            existingDataMap.set(dateStr, item);
        });
        
        // Trova tutte le date nel range, incluse quelle già presenti
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
        
        console.log(`Trovate ${allDates.length} date nel range (senza weekend)`);
        
        // Per ogni data nel range
        for (const date of allDates) {
            const dateStr = date.toISOString().split('T')[0];
            
            if (existingDataMap.has(dateStr)) {
                // Usa il dato esistente
                result.push(existingDataMap.get(dateStr));
                console.log(`Data ${dateStr}: valore originale ${existingDataMap.get(dateStr).time}`);
            } else {
                // Cerca di stimare
                const estimatedValue = this.estimateValue(date, data);
                console.log(`Data ${dateStr}: valore stimato ${estimatedValue}`);
                
                if (estimatedValue !== null) {
                    result.push({
                        date: new Date(date),
                        time: estimatedValue,
                        isOriginal: false
                    });
                }
            }
        }
        
        // Ordina i risultati per data
        result.sort((a, b) => a.date - b.date);
        console.log(`Risultato finale: ${result.length} valori (originali + stimati)`);
        
        return result;
    }
    
    // Stima un valore mancante basato sui valori vicini
    estimateValue(date, data) {
        // Cerca valori più vicini (prima e dopo la data mancante)
        let prevValue = null;
        let nextValue = null;
        
        let prevItem = null;
        let nextItem = null;
        
        let minPrevDiff = Infinity;
        let minNextDiff = Infinity;
        
        // Cerca il valore precedente e successivo più vicino
        for (const item of data) {
            if (item.time === null) continue; // Salta valori nulli
            
            const diff = date.getTime() - item.date.getTime();
            
            if (diff > 0 && diff < minPrevDiff) {
                minPrevDiff = diff;
                prevValue = item.time;
                prevItem = item;
            } else if (diff < 0 && Math.abs(diff) < minNextDiff) {
                minNextDiff = Math.abs(diff);
                nextValue = item.time;
                nextItem = item;
            }
        }
        
        console.log(`Stima per ${date.toISOString().split('T')[0]}: prev=${prevValue}, next=${nextValue}`);
        
        // Se abbiamo entrambi i valori, calcoliamo una media ponderata in base alla distanza
        if (prevValue !== null && nextValue !== null) {
            // Calcolo di interpolazione lineare
            const totalDiff = minPrevDiff + minNextDiff;
            const weightPrev = minNextDiff / totalDiff;
            const weightNext = minPrevDiff / totalDiff;
            const estimatedValue = (prevValue * weightPrev) + (nextValue * weightNext);
            return estimatedValue;
        }
        
        // Altrimenti usiamo il valore disponibile
        return prevValue !== null ? prevValue : nextValue;
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
        console.log('Calcolo bande deviazione standard dinamiche...');
        const upper = [];
        const lower = [];
        
        // Se non ci sono abbastanza dati, usa una deviazione statica
        if (data.length < 3) {
            console.log('Troppi pochi punti per una deviazione dinamica, uso statica');
            const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
            const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
            const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / data.length;
            const stdDev = Math.sqrt(variance);
            
            // Applica la deviazione standard a ogni punto
            for (const value of data) {
                upper.push(value + stdDev);
                lower.push(value - stdDev);
            }
            
            return { upper, lower };
        }
        
        // Per ogni punto, calcola la deviazione standard in una finestra mobile
        for (let i = 0; i < data.length; i++) {
            // Determina la finestra di punti intorno al punto i
            const halfWindow = Math.floor(windowSize / 2);
            const start = Math.max(0, i - halfWindow);
            const end = Math.min(data.length - 1, i + halfWindow);
            const windowData = data.slice(start, end + 1);
            
            // Calcola la media nella finestra
            const sum = windowData.reduce((acc, val) => acc + val, 0);
            const mean = sum / windowData.length;
            
            // Calcola la deviazione standard nella finestra
            const squaredDiffs = windowData.map(val => Math.pow(val - mean, 2));
            const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / windowData.length;
            const stdDev = Math.sqrt(variance);
            
            // Applica la deviazione standard centrata sul valore attuale (non sulla media globale)
            upper.push(data[i] + stdDev);
            lower.push(Math.max(0, data[i] - stdDev)); // Evita valori negativi se non hanno senso
            
            if (i === 0 || i === data.length - 1 || i === Math.floor(data.length/2)) {
                console.log(`Punto ${i}: valore=${data[i].toFixed(2)}, stdDev=${stdDev.toFixed(2)}, banda=[${lower[i].toFixed(2)}-${upper[i].toFixed(2)}]`);
            }
        }
        
        return { upper, lower };
    }
    
    // Inizializza il grafico Chart.js
    initChart() {
        // Contenitore canvas per il grafico
        const ctx = this.chartElement.getContext('2d');
        
        // Prepara i dati filtrati
        const filteredData = this.getFilteredData();
        console.log(`Dati filtrati: ${filteredData.length} punti`);
        
        if (filteredData.length === 0) {
            this.showError('Nessun dato disponibile per il periodo selezionato');
            return;
        }
        
        // Prepara i dataset per Chart.js
        const dataPoints = [];  // Per tutti i punti (originali e stimati)
        const pointColors = []; // Colore per ogni punto
        const pointRadiuses = []; // Dimensione per ogni punto
        const labels = [];
        
        // Raccogliamo tutti i valori per il calcolo statistico
        const allTimes = [];
        
        filteredData.forEach(item => {
            const formattedDate = this.formatDate(item.date);
            labels.push(formattedDate);
            
            // Se il tempo è null, lo sostituiamo con un valore stimato
            if (item.time === null) {
                console.warn(`Trovato valore null per ${formattedDate}, dovrebbe essere già stato stimato`);
                return; // Salta questo punto
            }
            
            dataPoints.push(item.time);
            allTimes.push(item.time);
            
            // Colore rosso per i punti stimati, blu per gli originali
            pointColors.push(item.isOriginal ? '#0d6efd' : '#dc3545');
            
            // Dimensione maggiore per i punti originali
            pointRadiuses.push(item.isOriginal ? 5 : 5);
        });
        
        console.log(`Punti validi per il grafico: ${dataPoints.length}`);
        
        // Determina il range per l'asse Y basato sui dati filtrati
        const minValue = Math.min(...allTimes);
        const maxValue = Math.max(...allTimes);
        const valuePadding = (maxValue - minValue) * 0.1; // 10% di padding
        
        console.log(`Range asse Y: ${minValue.toFixed(2)} - ${maxValue.toFixed(2)} (con padding: ${(minValue-valuePadding).toFixed(2)} - ${(maxValue+valuePadding).toFixed(2)})`);
        
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
                        pointRadius: pointRadiuses,
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
                        },
                        // Imposta i limiti dell'asse Y in base ai dati correnti
                        suggestedMin: minValue - valuePadding,
                        suggestedMax: maxValue + valuePadding
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
        
        // Assicuriamoci che il valore sia valido
        if (this.currentMonth !== 'all' && !this.currentMonth.includes('-')) {
            console.error('Formato mese non valido:', this.currentMonth);
            this.currentMonth = 'all'; // Fallback a tutti i mesi
        }
        
        // Aggiorna il grafico con il nuovo filtro
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
    // Crea un'istanza globale per riferimento e debug
    window.datasetVisualizer = new DatasetVisualizer();
});