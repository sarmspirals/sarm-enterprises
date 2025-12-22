// Firebase Configuration and Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('loginModal');
const closeModal = document.querySelector('.close-modal');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const productsContainer = document.getElementById('productsContainer');
const adminLoginLink = document.getElementById('adminLoginLink');

// Check Authentication State
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        console.log('User is signed in:', user.email);
        // Redirect to admin page if on main page
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
            loginBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
            loginBtn.onclick = handleLogout;
        }
    } else {
        // User is signed out
        console.log('User is signed out');
        if (window.location.pathname.endsWith('admin.html')) {
            window.location.href = 'index.html';
        }
    }
});

// Modal Controls
loginBtn.addEventListener('click', () => {
    loginModal.style.display = 'flex';
});

closeModal.addEventListener('click', () => {
    loginModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === loginModal) {
        loginModal.style.display = 'none';
    }
});

// Login Form Submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Login successful:', userCredential.user);
        loginModal.style.display = 'none';
        loginError.textContent = '';
        
        // Redirect to admin page
        window.location.href = 'admin.html';
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = 'Invalid email or password. Please try again.';
    }
});

// Logout Function
async function handleLogout() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Load Products from Firestore
async function loadProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        productsContainer.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            createProductCard(product, doc.id);
        });
    } catch (error) {
        console.error("Error loading products:", error);
        productsContainer.innerHTML = '<p class="error-message">Error loading products. Please try again later.</p>';
    }
}

// Create Product Card
function createProductCard(product, id) {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    
    let stockClass = 'stock-in';
    let stockText = 'In Stock';
    
    if (product.stock <= 0) {
        stockClass = 'stock-out';
        stockText = 'Out of Stock';
    } else if (product.stock <= 10) {
        stockClass = 'stock-low';
        stockText = 'Low Stock';
    }
    
    productCard.innerHTML = `
        <img src="${product.image || 'default-notebook.jpg'}" 
             alt="${product.name}" 
             class="product-image"
             onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3'">
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">₹${product.price}</div>
            <span class="product-stock ${stockClass}">
                <i class="fas fa-box"></i> ${stockText} (${product.stock})
            </span>
            <ul class="product-features">
                <li><i class="fas fa-check-circle"></i> ${product.pages} Pages</li>
                <li><i class="fas fa-ruler-combined"></i> A4 Size (210x297mm)</li>
                <li><i class="fas fa-spinner"></i> Spiral Binding</li>
                <li><i class="fas fa-file-alt"></i> Premium Quality Paper</li>
            </ul>
            <a href="https://wa.me/917006927825?text=Hello%20SARM%20ENTERPRISES,%20I%20would%20like%20to%20order%20${encodeURIComponent(product.name)}" 
               class="btn-whatsapp" target="_blank" style="width: 100%; text-align: center; margin-top: 10px;">
                <i class="fab fa-whatsapp"></i> Order Now
            </a>
        </div>
    `;
    
    productsContainer.appendChild(productCard);
}

// Real-time listener for products
function setupProductsListener() {
    onSnapshot(collection(db, "products"), (snapshot) => {
        productsContainer.innerHTML = '';
        snapshot.forEach((doc) => {
            createProductCard(doc.data(), doc.id);
        });
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (productsContainer) {
        loadProducts();
        setupProductsListener();
    }
    
    // Admin login link
    if (adminLoginLink) {
        adminLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginModal.style.display = 'flex';
        });
    }
    
    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
});

// Export for admin.js
export { auth, db, handleLogout };
