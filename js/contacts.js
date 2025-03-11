// contact.js - Handles the contact form functionality
document.addEventListener('DOMContentLoaded', function() {
    const contactButton = document.getElementById('contact-button');
    const contactForm = document.getElementById('contact-form');
    const cancelButton = document.getElementById('cancel-email');
    const emailForm = document.getElementById('email-form');
    
    // Toggle contact form
    if (contactButton && contactForm) {
        contactButton.addEventListener('click', function() {
            contactForm.classList.toggle('hidden');
        });
    }
    
    // Cancel button
    if (cancelButton && contactForm) {
        cancelButton.addEventListener('click', function() {
            contactForm.classList.add('hidden');
            if (emailForm) emailForm.reset();
        });
    }
    
    // Handle form submission
    if (emailForm) {
        emailForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('email-name').value.trim();
            const email = document.getElementById('email-address').value.trim();
            const subject = document.getElementById('email-subject').value.trim();
            const message = document.getElementById('email-message').value.trim();
            
            // Option 1: Open in mail client (simple approach)
            const mailtoLink = `mailto:your.email@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`From: ${name} <${email}>\n\n${message}`)}`;
            window.location.href = mailtoLink;
            
            // Reset form and hide
            emailForm.reset();
            contactForm.classList.add('hidden');
        });
    }
});