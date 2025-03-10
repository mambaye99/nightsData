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
            const response = await fetch('data/dataset.csv');
            if (!response.ok) {
                throw new Error(`Errore nel caricamento del dataset: ${response.status}`);
            }
            
            const csvData = await response.text();
            
            // Utilizzo di PapaParse per il parsing del CSV
            Papa.parse(csvData, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    this.processData(results.data);
                },
                error: (error) => {
                    console.error('Errore durante il parsing del CSV:', error);
                    this.showError('Errore durante analisi del file CSV');
                }
            });
        } catch (error) {
            console.error('Errore durante il caricamento del dataset:', error);
            this.showError('Impossibile caricare il dataset');
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
    
    // Inizializza il grafico Chart.js
    initChart() {
        // Contenitore canvas per il grafico
        const ctx = this.chartElement.getContext('2d');
        
        // Prepara i dati filtrati
        const filteredData = this.getFilteredData();
        
        // Calcola la deviazione standard sui dati filtrati
        const stdDev = this.calculateStdDev(filteredData);
        
        // Prepara i dataset per Chart.js
        const combinedPoints = [];  // Un'unica serie per tutti i punti
        const originalPointSizes = []; // Dimensioni dei punti per marcare originali vs stimati
        const allValues = []; // Tutti i valori per calcolo statistico
        const labels = [];
        
        filteredData.forEach(item => {
            const formattedDate = this.formatDate(item.date);
            labels.push(formattedDate);
            
            // Tutti i punti uniti in un'unica serie
            combinedPoints.push(item.time);
            allValues.push(item.time);
            
            // Usiamo dimensioni diverse per i punti per distinguere originali vs stimati
            if (item.isOriginal) {
                originalPointSizes.push(5); // Punto più grande per dati originali
            } else {
                originalPointSizes.push(3); // Punto più piccolo per dati stimati
            }
        });
        
        // Calcola media e deviazione standard per ogni punto individualmente
        // usando una finestra mobile di 7 giorni (o meno se all'inizio/fine)
        const rollingMeans = [];
        const rollingUpperBounds = [];
        const rollingLowerBounds = [];
        
        for (let i = 0; i < allValues.length; i++) {
            // Prendi i punti in una finestra di 7 giorni intorno al punto corrente
            const windowStart = Math.max(0, i - 3);
            const windowEnd = Math.min(allValues.length - 1, i + 3);
            const windowValues = allValues.slice(windowStart, windowEnd + 1);
            
            // Calcola media nella finestra
            const windowMean = windowValues.reduce((sum, val) => sum + val, 0) / windowValues.length;
            rollingMeans.push(windowMean);
            
            // Calcola deviazione standard nella finestra
            const squaredDiffs = windowValues.map(val => Math.pow(val - windowMean, 2));
            const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / windowValues.length;
            const windowStdDev = Math.sqrt(variance);
            
            // Calcola limiti superiore e inferiore
            rollingUpperBounds.push(windowMean + windowStdDev);
            rollingLowerBounds.push(windowMean - windowStdDev);
        }
        
        // Configurazione del grafico
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Dati Orario',
                        data: combinedPoints,
                        borderColor: '#0d6efd',
                        backgroundColor: '#0d6efd',
                        pointBackgroundColor: function(context) {
                            // Punto rosso per dati stimati, blu per originali
                            const index = context.dataIndex;
                            return filteredData[index].isOriginal ? '#0d6efd' : '#dc3545';
                        },
                        pointBorderColor: function(context) {
                            const index = context.dataIndex;
                            return filteredData[index].isOriginal ? '#0d6efd' : '#dc3545';
                        },
                        pointRadius: function(context) {
                            return originalPointSizes[context.dataIndex]; 
                        },
                        pointHoverRadius: 7,
                        tension: 0.4, // Aumentato per curve più morbide
                        borderWidth: 2
                    },
                    {
                        label: 'Media mobile',
                        data: rollingMeans,
                        borderColor: 'rgba(255, 193, 7, 0.6)',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'Limite superiore dev. std.',
                        data: rollingUpperBounds,
                        borderColor: 'rgba(13, 110, 253, 0.4)',
                        borderWidth: 1,
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'Limite inferiore dev. std.',
                        data: rollingLowerBounds,
                        borderColor: 'rgba(13, 110, 253, 0.4)',
                        backgroundColor: 'rgba(13, 110, 253, 0.2)',
                        pointRadius: 0,
                        fill: '-1'
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
                                if (context.datasetIndex === 0 && context.raw !== null) {
                                    return `Orario (originale): ${context.raw.toFixed(2)}`;
                                } else if (context.datasetIndex === 1 && context.raw !== null) {
                                    return `Orario (stimato): ${context.raw.toFixed(2)}`;
                                } else if (context.datasetIndex === 2) {
                                    return `Media: ${context.raw.toFixed(2)}`;
                                } else if (context.datasetIndex === 3) {
                                    return `Dev. std. superiore: ${context.raw.toFixed(2)}`;
                                } else if (context.datasetIndex === 4) {
                                    return `Dev. std. inferiore: ${context.raw.toFixed(2)}`;
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
                        suggestedMin: Math.max(0, mean - (stdDev * 2)),
                        suggestedMax: mean + (stdDev * 2)
                    }
                }
            }
        });
        
        // Aggiorna le info sulla deviazione standard
        this.updateStdDevInfo(stdDev);
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
    
    // Aggiorna le informazioni sulla deviazione standard
    updateStdDevInfo(stdDev) {
        // Puoi aggiungere un elemento nella pagina per mostrare la deviazione standard
        const stdDevInfoElement = document.createElement('div');
        stdDevInfoElement.classList.add('std-dev-info');
        stdDevInfoElement.innerHTML = `Deviazione standard: ${stdDev.toFixed(2)}`;
        
        // Aggiungi l'elemento alla sezione del grafico
        // const chartSection = document.querySelector('.chart-section');
        // chartSection.appendChild(stdDevInfoElement);
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