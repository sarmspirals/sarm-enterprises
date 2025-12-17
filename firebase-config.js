// Firebase Configuration for SARM ENTERPRISES
const firebaseConfig = {
    apiKey: "AIzaSyAZe6bywYSgnMFZsef1xgfPFQBkw4y7tco",
    authDomain: "sarm-enterprises.firebaseapp.com",
    projectId: "sarm-enterprises",
    storageBucket: "sarm-enterprises.firebasestorage.app",
    messagingSenderId: "790231205096",
    appId: "1:790231205096:web:656c5fc47c6a675e1ef55d",
    measurementId: "G-5M1ZM089KH"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Firebase helper functions
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
        <button class="close-notification">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
    
    notification.querySelector('.close-notification').addEventListener('click', () => {
        notification.remove();
    });
}

// Add notification styles dynamically
const notificationStyles = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 2000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.notification.show {
    transform: translateX(0);
}

.notification.success {
    background: #28a745;
}

.notification.error {
    background: #dc3545;
}

.notification.warning {
    background: #ffc107;
    color: #333;
}

.close-notification {
    background: none;
    border: none;
    color: inherit;
    font-size: 1.2rem;
    cursor: pointer;
    margin-left: auto;
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);
