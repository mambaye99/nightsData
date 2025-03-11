// language.js - Handles multilingual support
document.addEventListener('DOMContentLoaded', function() {
    // Get language toggle button
    const langToggle = document.getElementById('language-toggle');
    
    // Current language (default to Italian)
    let currentLang = localStorage.getItem('preferredLanguage') || 'it';
    
    // Apply saved language on load
    applyLanguage(currentLang);
    
    // Update button text
    updateToggleButton(currentLang);
    
    // Add event listener to language toggle
    if (langToggle) {
        langToggle.addEventListener('click', function() {
            // Switch language
            currentLang = currentLang === 'it' ? 'en' : 'it';
            
            // Save preference
            localStorage.setItem('preferredLanguage', currentLang);
            
            // Apply the language
            applyLanguage(currentLang);
            
            // Update button text
            updateToggleButton(currentLang);
        });
    }
    
    function applyLanguage(lang) {
        // Select all elements with data-lang attribute
        const elements = document.querySelectorAll('[data-lang-it][data-lang-en]');
        
        elements.forEach(el => {
            el.textContent = el.getAttribute(`data-lang-${lang}`);
        });
        
        // Update document language
        document.documentElement.lang = lang;
    }
    
    function updateToggleButton(lang) {
        if (langToggle) {
            langToggle.textContent = lang === 'it' ? 'English' : 'Italiano';
        }
    }
});