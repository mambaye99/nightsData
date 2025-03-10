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
        
        // Event listeners
        this.monthFilter.addEventListener('change', this.handleMonthFilter.bind(this));
        
        // Inizializzazione
        this.loadData();
    }
    
    // Carica il dataset dal file CSV
    async loadData() {
        try {
            console.log('Tentativo di caricamento dati...');
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
                        this.showError('Nessun dato valido trovato nel CSV');
                        return;
                    }
                    
                    if (!results.meta.fields.includes('giorno') || !results.meta.fields.includes('orario')) {
                        this.showError('Il CSV non contiene le colonne richieste (giorno, orario)');
                        return;
                    }
                    
                    this.processData(results.data);
                },
                error: (error) => {
                    console.error('Errore durante il parsing del CSV:', error);
                    this.showError('Errore durante l\'analisi del file CSV');
                }
            });
        } catch (error) {
            console.error('Errore durante il caricamento del dataset:', error);
            this.showError(`Impossibile caricare il dataset: ${error.message}`);
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
        }).filter(item => item.time !== null && !isNaN(item.time));
        
        // Ordina per data
        this.originalData.sort((a, b) => a.date - b.date);
        
        // Stima i valori mancanti (esclusi i weekend)
        this.processedData = this.estimateMissingValues(this.originalData);
        
        // Inizializza il grafico
        this.initChart();
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
        if (!this.chart) return;
        
        // Distruggi il grafico esistente e ricrealo
        this.chart.destroy();
        this.initChart();
    }
    
    // Gestisce il cambio di filtro del mese
    handleMonthFilter(event) {
        this.currentMonth = event.target.value;
        this.updateChart();
    }
    
    // Ottieni i dati filtrati per il mese corrente
    getFilteredData() {
        if (this.currentMonth === 'all') {
            return this.processedData;
        }
        
        const monthIndex = parseInt(this.currentMonth);
        return this.processedData.filter(item => {
            return item.date.getMonth() === monthIndex;
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
        this.chartElement.style.display = 'none';
        
        const errorElement = document.createElement('div');
        errorElement.classList.add('error-message');
        errorElement.textContent = message;
        
        this.chartElement.parentNode.appendChild(errorElement);
    }
}

// Inizializza la visualizzazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', () => {
    new DatasetVisualizer();
});