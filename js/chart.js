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
                { giorno: "13/01/2025", orario: "17,23" },
                { giorno: "14/01/2025", orario: "17,01" },
                { giorno: "15/01/2025", orario: "17,52" },
                { giorno: "16/01/2025", orario: "17,37" },
                { giorno: "20/01/2025", orario: "17,50" },
                { giorno: "21/01/2025", orario: "17,21" }
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
    
    // Stima i valori mancanti, escludendo i weekend
    estimateMissingValues(data) {
        if (data.length === 0) return [];
        
        console.log('Inizio stima valori mancanti...');
        
        // Crea una copia per risultati
        const result = [];
        const originalData = [...data]; // Manteniamo una copia dei dati originali con i valori nulli
        
        // Rimuovi i valori nulli temporaneamente per calcolare le stime
        const validData = data.filter(item => item.time !== null);
        
        if (validData.length === 0) {
            console.warn('Nessun dato valido per fare stime!');
            return [];
        }
        
        // Trova tutte le date nel range, incluse quelle già presenti
        const firstDate = new Date(Math.min(...data.map(item => item.date.getTime())));
        const lastDate = new Date(Math.max(...data.map(item => item.date.getTime())));
        
        console.log(`Range date: ${firstDate.toISOString().split('T')[0]} - ${lastDate.toISOString().split('T')[0]}`);
        
        // Genera un array con tutte le date lavorative nel range
        const allDates = [];
        const currentDate = new Date(firstDate);
        
        while (currentDate <= lastDate) {
            const dayOfWeek = currentDate.getDay();
            
            // Salta weekend (0 = domenica, 6 = sabato)
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                allDates.push(new Date(currentDate));
            }
            
            // Avanza al giorno successivo
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        console.log(`Trovate ${allDates.length} date lavorative nel range`);
        
        // Crea un dizionario con i dati originali indicizzati per data
        const dataByDate = new Map();
        originalData.forEach(item => {
            const dateStr = item.date.toISOString().split('T')[0];
            dataByDate.set(dateStr, item);
        });
        
        // Per ogni data lavorativa
        for (const date of allDates) {
            const dateStr = date.toISOString().split('T')[0];
            
            // Verifica se abbiamo un dato originale per questa data
            if (dataByDate.has(dateStr)) {
                const item = dataByDate.get(dateStr);
                
                // Se il valore è null, stimalo
                if (item.time === null) {
                    const estimatedValue = this.estimateValue(date, validData);
                    console.log(`${dateStr}: valore originale null, stimato ${estimatedValue.toFixed(2)}`);
                    
                    result.push({
                        date: new Date(date),
                        time: estimatedValue,
                        isOriginal: false
                    });
                } else {
                    // Usa il valore originale
                    result.push(item);
                }
            } else {
                // Giorno lavorativo mancante: stima il valore
                const estimatedValue = this.estimateValue(date, validData);
                console.log(`${dateStr}: giorno mancante, stimato ${estimatedValue.toFixed(2)}`);
                
                result.push({
                    date: new Date(date),
                    time: estimatedValue,
                    isOriginal: false
                });
            }
        }
        
        // Ordina i risultati per data
        result.sort((a, b) => a.date - b.date);
        
        // Log dei dati stimati
        const numOriginali = result.filter(item => item.isOriginal).length;
        const numStimati = result.filter(item => !item.isOriginal).length;
        console.log(`Risultato: ${result.length} valori totali (${numOriginali} originali, ${numStimati} stimati)`);
        
        return result;
    }
    
    // Stima un valore mancante basato sui valori vicini
    estimateValue(date, data) {
        if (data.length === 0) {
            console.warn('Nessun dato per stimare i valori');
            return null;
        }
        
        // Se c'è solo un valore valido, usalo per tutti
        if (data.length === 1) {
            return data[0].time;
        }
        
        // Datatime target
        const targetTime = date.getTime();
        
        // Cerca valori più vicini (prima e dopo la data mancante)
        let prevValue = null;
        let nextValue = null;
        
        let prevDate = null;
        let nextDate = null;
        
        // Cerca il valore precedente e successivo più vicino
        for (const item of data) {
            const itemTime = item.date.getTime();
            const diff = targetTime - itemTime;
            
            if (diff > 0) { // Data precedente
                if (prevDate === null || (itemTime > prevDate)) {
                    prevDate = itemTime;
                    prevValue = item.time;
                }
            } else if (diff < 0) { // Data successiva
                if (nextDate === null || (itemTime < nextDate)) {
                    nextDate = itemTime;
                    nextValue = item.time;
                }
            } else { // Data esatta
                return item.time;
            }
        }
        
        // Se abbiamo entrambi i valori, interpoliamo linearmente
        if (prevValue !== null && nextValue !== null) {
            // Calcolo di interpolazione lineare
            const totalDistance = nextDate - prevDate;
            const targetPosition = targetTime - prevDate;
            const weight = totalDistance === 0 ? 0.5 : targetPosition / totalDistance;
            
            const estimatedValue = prevValue + (weight * (nextValue - prevValue));
            
            console.log(`Stima per ${date.toISOString().split('T')[0]}: ${prevValue.toFixed(2)} → ${estimatedValue.toFixed(2)} ← ${nextValue.toFixed(2)}`);
            return estimatedValue;
        }
        
        // Se abbiamo solo un valore, usiamo quello
        if (prevValue !== null) {
            console.log(`Stima per ${date.toISOString().split('T')[0]}: solo precedente ${prevValue.toFixed(2)}`);
            return prevValue;
        }
        
        if (nextValue !== null) {
            console.log(`Stima per ${date.toISOString().split('T')[0]}: solo successivo ${nextValue.toFixed(2)}`);
            return nextValue;
        }
        
        // Non dovremmo mai arrivare qui
        console.error('Impossibile stimare il valore!');
        return null;
    }
    
    // Calcola l'intervallo di confidenza al 95% per i dati filtrati
    calculateConfidenceInterval(data, windowSize = 5) {
        console.log('Calcolo intervallo di confidenza al 95%...');
        const upper = [];
        const lower = [];
        
        // Se non ci sono abbastanza dati, restituisci null
        if (data.length < 3) {
            console.log('Troppi pochi punti per calcolare l\'intervallo di confidenza');
            return null;
        }
        
        // Valore t-student per 95% di confidenza 
        const tValue = data.length < 5 ? 2.78 : 1.96;
        
        // Per ogni punto, calcola l'intervallo di confidenza in una finestra mobile
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
            
            // Calcola l'errore standard
            const stderr = stdDev / Math.sqrt(windowData.length);
            
            // Calcola l'intervallo di confidenza al 95%
            const marginOfError = tValue * stderr;
            
            // Applica l'intervallo centrato sul valore attuale (non sulla media)
            upper.push(data[i] + marginOfError);
            lower.push(Math.max(0, data[i] - marginOfError)); // Evita valori negativi se non hanno senso
            
            // Log di debug per alcuni punti campione
            if (i === 0 || i === data.length - 1 || i === Math.floor(data.length/2)) {
                console.log(`Punto ${i}: valore=${data[i].toFixed(2)}, IC95=[${lower[i].toFixed(2)}-${upper[i].toFixed(2)}]`);
            }
        }
        
        return { upper, lower };
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
    
    // Converte un valore decimale in formato orario (HH:MM)
    decimalToTimeFormat(decimal) {
        const hour = Math.floor(decimal);
        const minutes = Math.round((decimal - hour) * 60);
        return `${hour}:${minutes.toString().padStart(2, '0')}`;
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
        const labels = [];
        
        // Raccogliamo tutti i valori per il calcolo statistico e per la scala dell'asse Y
        const allTimes = [];
        
        filteredData.forEach(item => {
            const formattedDate = this.formatDate(item.date);
            labels.push(formattedDate);
            
            // Se il tempo è null, salta questo punto (non dovrebbe succedere perché abbiamo già stimato)
            if (item.time === null) {
                console.warn(`Trovato valore null per ${formattedDate}, dovrebbe essere già stato stimato`);
                return; // Salta questo punto
            }
            
            dataPoints.push(item.time);
            allTimes.push(item.time);
            
            // Colore rosso per i punti stimati, blu per gli originali
            pointColors.push(item.isOriginal ? '#0d6efd' : '#dc3545');
        });
        
        console.log(`Punti validi per il grafico: ${dataPoints.length}`);
        console.log(`Colori: ${pointColors.length} (rossi: ${pointColors.filter(c => c === '#dc3545').length})`);
        
        // Calcola l'intervallo di confidenza al 95%
        const confidenceInterval = this.calculateConfidenceInterval(allTimes);
        
        // Determina il range per l'asse Y basato sui dati filtrati E sui limiti di confidenza
        let minValue = Math.min(...allTimes);
        let maxValue = Math.max(...allTimes);
        
        // Se abbiamo l'intervallo di confidenza, aggiorna min e max per includere la banda
        if (confidenceInterval) {
            minValue = Math.min(minValue, ...confidenceInterval.lower);
            maxValue = Math.max(maxValue, ...confidenceInterval.upper);
        }
        
        const range = maxValue - minValue;
        
        // Aggiungiamo un margine del 5% sopra e sotto
        const padding = range * 0.05;
        const yMin = Math.max(0, minValue - padding);
        const yMax = maxValue + padding;
        
        console.log(`Range asse Y (con banda): min=${minValue.toFixed(2)}, max=${maxValue.toFixed(2)}, range=${range.toFixed(2)}`);
        console.log(`Scala asse Y con padding: ${yMin.toFixed(2)} - ${yMax.toFixed(2)}`);
        
        // Crea i dataset
        const datasets = [
            {
                label: 'Orario',
                data: dataPoints,
                borderColor: '#0d6efd',
                tension: 0.4,
                borderWidth: 2,
                fill: false,
                pointBackgroundColor: pointColors,
                pointBorderColor: pointColors,
                pointRadius: 5,
                pointHoverRadius: 7,
                spanGaps: true
            }
        ];
        
        // Aggiungi i dataset dell'intervallo di confidenza se disponibili
        if (confidenceInterval) {
            datasets.push(
                {
                    label: 'Limite superiore IC 95%',
                    data: confidenceInterval.upper,
                    borderColor: 'rgba(13, 110, 253, 0.3)',
                    backgroundColor: 'rgba(13, 110, 253, 0)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: 'Limite inferiore IC 95%',
                    data: confidenceInterval.lower,
                    borderColor: 'rgba(13, 110, 253, 0.3)',
                    backgroundColor: 'rgba(13, 110, 253, 0.2)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: 1 // Riempi tra questo dataset e quello sopra
                }
            );
        }
        
        // Configurazione del grafico
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
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
                        text: 'Dati giornalieri con intervallo di confidenza 95%',
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
                                    return `Orario (${tipo}): ${this.decimalToTimeFormat(context.raw)}`;
                                } else if (context.datasetIndex === 1) {
                                    return `Limite superiore IC 95%: ${this.decimalToTimeFormat(context.raw)}`;
                                } else if (context.datasetIndex === 2) {
                                    return `Limite inferiore IC 95%: ${this.decimalToTimeFormat(context.raw)}`;
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
                        // Impostiamo un range flessibile che si adatta ai dati
                        min: yMin,
                        max: yMax,
                        ticks: {
                            // Usiamo step di 15 minuti (0.25 ore)
                            stepSize: 0.25,
                            callback: (value) => {
                                return this.decimalToTimeFormat(value);
                            }
                        }
                    }
                }
            }
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