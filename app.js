import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

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
const storage = getStorage(app);

// DOM Elements
const productsContainer = document.getElementById('productsContainer');
const logoElement = document.getElementById('logo');
const adminAccessDiv = document.getElementById('adminAccess');
const adminLink = document.getElementById('adminLink');

// Check Authentication State - Hide admin from non-logged in users
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in - Show admin access
        console.log('Admin signed in:', user.email);
        if (adminAccessDiv) adminAccessDiv.style.display = 'block';
        if (adminLink) adminLink.style.display = 'flex';
    } else {
        // User is signed out - Hide admin access
        console.log('User is signed out');
        if (adminAccessDiv) adminAccessDiv.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
    }
});

// Load Logo from Firestore
async function loadLogo() {
    try {
        const logoDoc = await getDoc(doc(db, "settings", "logo"));
        if (logoDoc.exists() && logoDoc.data().url) {
            logoElement.src = logoDoc.data().url;
            logoElement.alt = "SARM ENTERPRISES Logo";
        } else {
            // Default logo
            logoElement.src = "https://images.unsplash.com/photo-1567446537710-0c5ff5a6ac32?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80";
        }
    } catch (error) {
        console.error("Error loading logo:", error);
    }
}

// Load Products with Firebase Storage Images
async function loadProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        productsContainer.innerHTML = '';
        
        const productsArray = [];
        querySnapshot.forEach((doc) => {
            productsArray.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by pages
        productsArray.sort((a, b) => a.pages - b.pages);
        
        productsArray.forEach((product) => {
            createProductCard(product);
        });
    } catch (error) {
        console.error("Error loading products:", error);
        productsContainer.innerHTML = '<p class="error-message">Error loading products. Please try again later.</p>';
    }
}

// Create Product Card with Firebase Storage Images
function createProductCard(product) {
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
    
    // Use Firebase Storage image URL
    const imageUrl = product.imageUrl || `https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80`;
    
    productCard.innerHTML = `
        <img src="${imageUrl}" 
             alt="${product.name}" 
             class="product-image"
             onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3'">
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">₹${product.price}</div>
            <span class="product-stock ${stockClass}">
                <i class="fas fa-box"></i> ${stockText} (${product.stock} units)
            </span>
            <ul class="product-features">
                <li><i class="fas fa-file-alt"></i> ${product.pages} Pages</li>
                <li><i class="fas fa-ruler-combined"></i> A4 Size</li>
                <li><i class="fas fa-spinner"></i> Spiral Binding</li>
                <li><i class="fas fa-truck"></i> Free Delivery within 5km</li>
            </ul>
            <a href="https://wa.me/917006927825?text=Hello%20SARM%20ENTERPRISES,%20I%20would%20like%20to%20order%20${encodeURIComponent(product.name)}%20(Price:%20₹${product.price})" 
               class="btn-whatsapp" target="_blank" style="width: 100%; text-align: center; margin-top: 10px;">
                <i class="fab fa-whatsapp"></i> Order on WhatsApp
            </a>
        </div>
    `;
    
    productsContainer.appendChild(productCard);
}

// Load Quotes
async function loadQuotes() {
    try {
        const quotesSnapshot = await getDocs(collection(db, "quotes"));
        const quotesContainer = document.querySelector('.hero-quotes');
        if (!quotesContainer) return;
        
        quotesContainer.innerHTML = '';
        quotesSnapshot.forEach((doc) => {
            const quote = doc.data();
            const quoteElement = document.createElement('div');
            quoteElement.className = 'quote';
            quoteElement.innerHTML = `
                <i class="fas fa-quote-left"></i>
                <p>${quote.text}</p>
            `;
            quotesContainer.appendChild(quoteElement);
        });
    } catch (error) {
        console.error("Error loading quotes:", error);
    }
}

// Real-time listener for products
function setupProductsListener() {
    onSnapshot(collection(db, "products"), (snapshot) => {
        productsContainer.innerHTML = '';
        const productsArray = [];
        
        snapshot.forEach((doc) => {
            productsArray.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by pages
        productsArray.sort((a, b) => a.pages - b.pages);
        
        productsArray.forEach((product) => {
            createProductCard(product);
        });
    });
}

// Show Notification
function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : ''}`;
    notification.innerHTML = `
        <i class="fas fa-${isError ? 'exclamation-circle' : 'check-circle'}"></i>
        ${message}
    `;
    document.body.appendChild(notification);
    
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (productsContainer) {
        loadProducts();
        setupProductsListener();
    }
    
    // Load logo and quotes
    loadLogo();
    loadQuotes();
    
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
export { auth, db, storage, showNotification };
