// DOM Elements
const homeBtn = document.getElementById('homeBtn');
const dropdownMenu = document.getElementById('dropdownMenu');
const emailInput = document.getElementById('emailInput');
const submitBtn = document.getElementById('submitBtn');
const successMessage = document.getElementById('successMessage');
const featureCards = document.querySelectorAll('.feature-card');

// Dropdown Menu
homeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('active');
});

document.addEventListener('click', () => {
    dropdownMenu.classList.remove('active');
});

// Email Submission
submitBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    
    if (!email || !isValidEmail(email)) {
        emailInput.classList.add('error');
        setTimeout(() => emailInput.classList.remove('error'), 300);
        return;
    }
    
    // Show loading state
    submitBtn.classList.add('loading');
    
    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: email })
        });
        
        if (response.ok) {
            // Show success message
            successMessage.classList.add('show');
            emailInput.value = '';
            
            setTimeout(() => {
                successMessage.classList.remove('show');
            }, 5000);
        } else {
            throw new Error('Failed to send email');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Something went wrong. Please try again.');
    } finally {
        submitBtn.classList.remove('loading');
    }
});

// Email validation
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Enter key submission
emailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitBtn.click();
    }
});

// Scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const delay = entry.target.dataset.delay || 0;
            setTimeout(() => {
                entry.target.classList.add('animate');
            }, delay);
        }
    });
}, observerOptions);

featureCards.forEach(card => {
    observer.observe(card);
});

// Parallax effect on mouse move
document.addEventListener('mousemove', (e) => {
    const x = e.clientX / window.innerWidth - 0.5;
    const y = e.clientY / window.innerHeight - 0.5;
    
    const mainTitle = document.querySelector('.main-title');
    const subtitle = document.querySelector('.subtitle');
    
    if (mainTitle && subtitle) {
        mainTitle.style.transform = `translate(${x * 10}px, ${y * 10}px)`;
        subtitle.style.transform = `translate(${x * 5}px, ${y * 5}px)`;
    }
});

// Smooth scroll for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Text animation on load
window.addEventListener('load', () => {
    const mainTitle = document.querySelector('.main-title');
    const subtitle = document.querySelector('.subtitle');
    const emailContainer = document.querySelector('.email-container');
    
    mainTitle.style.animation = 'fadeInUp 0.8s ease forwards';
    subtitle.style.animation = 'fadeInUp 0.8s ease 0.2s forwards';
    emailContainer.style.animation = 'fadeInUp 0.8s ease 0.4s forwards';
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .email-input.error {
        animation: shake 0.3s ease;
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);